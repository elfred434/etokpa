import { searchPlaces, type GeoPlace } from '../services/api/geocode';

/**
 * Normalise un libellé de lieu (minuscules, sans accents ni ponctuation superflue)
 * pour la correspondance tolérante des points de repère.
 */
function normalizePlaceKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Détecte si un point GPS tombe dans l'océan Atlantique au large du littoral de Cotonou
 * (ex. coordonnées erronées du seeder backend pour Carrefour Akpakpa 6.3520/2.4500,
 * Wologuèdè 6.3480/2.4550 ou Marina 6.3520/2.4280).
 */
export function isInCotonouSea(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lng < 2.30 || lng > 2.52 || lat < 6.0 || lat > 6.37) return false;

  let coastMinLat = 6.347;
  if (lng >= 2.439) coastMinLat = 6.3575; // Akpakpa / Énagnon / Dodomè
  else if (lng >= 2.417) coastMinLat = 6.3555; // Port de Cotonou / Placodji
  else if (lng >= 2.38) coastMinLat = 6.350; // Cadjehoun / Les Cocotiers

  return lat < coastMinLat;
}

/**
 * Coordonnées vérifiées sur terre (OpenStreetMap / Cotonou) utilisées en secours
 * lorsque la base backend renvoie des coordonnées nulles ou situées en mer.
 */
const VERIFIED_LANDMARK_COORDS: Record<string, [number, number]> = {
  'carrefour akpakpa': [6.3679, 2.4488],
  'akpakpa': [6.3675, 2.453],
  'wologuede': [6.3758, 2.4142],
  'marina de cotonou': [6.3516, 2.4091],
  'boulevard de la marina': [6.3516, 2.4091],
  'place de l etoile rouge': [6.3714, 2.4099],
  'etoile rouge': [6.3714, 2.4099],
  'carrefour cadjehoun': [6.3614, 2.3994],
  'cadjehoun': [6.3614, 2.3994],
  'haie vive': [6.3546, 2.3943],
  'marche dantokpa nord': [6.3733, 2.4328],
  'marche dantokpa sud': [6.3718, 2.4335],
  'dantokpa': [6.3727, 2.4335],
  'pont de cotonou': [6.371, 2.4371],
  'carrefour godomey': [6.3854, 2.3432],
};

function lookupVerifiedCoords(nom?: string | null, zoneNom?: string | null): [number, number] | null {
  if (nom) {
    const key = normalizePlaceKey(nom);
    if (VERIFIED_LANDMARK_COORDS[key]) return VERIFIED_LANDMARK_COORDS[key];
    for (const [knownKey, coords] of Object.entries(VERIFIED_LANDMARK_COORDS)) {
      if (key.includes(knownKey)) return coords;
    }
  }
  if (zoneNom) {
    const zKey = normalizePlaceKey(zoneNom);
    if (VERIFIED_LANDMARK_COORDS[zKey]) return VERIFIED_LANDMARK_COORDS[zKey];
  }
  return null;
}

function isValidLandCoords(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return !isInCotonouSea(lat, lng);
}

/**
 * Valide des coordonnées issues de la BDD et applique un secours vérifié sur terre
 * si elles sont absentes ou tombent dans la mer.
 */
export function sanitizeLandmarkCoords(
  rawLat: unknown,
  rawLng: unknown,
  nom?: string | null,
  zoneNom?: string | null,
): [number, number] | null {
  const lat = rawLat === null || rawLat === undefined || rawLat === '' ? NaN : Number(rawLat);
  const lng = rawLng === null || rawLng === undefined || rawLng === '' ? NaN : Number(rawLng);
  if (isValidLandCoords(lat, lng)) {
    return [lat, lng];
  }
  return lookupVerifiedCoords(nom, zoneNom);
}

export interface ZoneWithLandmarks {
  id: number;
  nom?: string;
  points_repere?: Array<{
    id: number;
    nom?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  }>;
}

export interface LandmarkRecord {
  id?: number;
  nom?: string;
  zone_id?: number;
  zone?: { id?: number; nom?: string } | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface OrderDestinationInput {
  landmark?: {
    id?: number;
    nom?: string;
    zone_id?: number;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  description_lieu?: string | null;
}

/**
 * Extrait un indice de lieu réel depuis `description_lieu` quand celui-ci désigne un
 * repère personnel distinct du `landmark.nom` d'ancrage.
 */
function extractDistinctPlaceHint(description?: string | null, landmarkName?: string | null): string | null {
  if (!description || !description.trim()) return null;
  const primarySegment = description.split('—')[0]?.trim() || description.trim();
  if (!primarySegment) return null;
  const normDesc = normalizePlaceKey(primarySegment);
  const normLandmark = normalizePlaceKey(landmarkName ?? '');
  if (!normDesc || (normLandmark && (normDesc === normLandmark || normDesc.startsWith(normLandmark)))) {
    return null;
  }
  return primarySegment;
}

/**
 * Résout la destination réelle de la commande sur la carte à partir :
 * 1) des coordonnées du point de repère choisi (dans `zones.points_repere`, `GET /landmarks` ou `order.landmark`),
 * 2) du repère réel indiqué dans `description_lieu` (si le client a choisi un repère de profil),
 * 3) d'une vérification anti-mer + géocodage Nominatim / référentiel Cotonou sur terre.
 */
export async function resolveOrderDestinationCoords({
  order,
  zones,
  userLandmarks = [],
  geocodeFn = searchPlaces,
}: {
  order: OrderDestinationInput;
  zones: ZoneWithLandmarks[];
  userLandmarks?: LandmarkRecord[];
  geocodeFn?: (q: string) => Promise<GeoPlace[]>;
}): Promise<{ coords: [number, number] | null; zoneName: string | null }> {
  const lmId = order.landmark?.id;
  let matchedName = order.landmark?.nom ?? null;
  let matchedZoneName: string | null = null;
  let rawLat: unknown = order.landmark?.latitude;
  let rawLng: unknown = order.landmark?.longitude;

  for (const z of zones) {
    if (order.landmark?.zone_id != null && Number(z.id) === Number(order.landmark.zone_id)) {
      matchedZoneName = z.nom ?? null;
    }
    if (lmId != null) {
      for (const p of z.points_repere ?? []) {
        if (Number(p.id) === Number(lmId)) {
          matchedZoneName = z.nom ?? matchedZoneName;
          matchedName = p.nom ?? matchedName;
          if (p.latitude != null && p.longitude != null) {
            rawLat = p.latitude;
            rawLng = p.longitude;
          }
          break;
        }
      }
    }
  }

  if ((rawLat == null || rawLng == null) && lmId != null) {
    const personal = userLandmarks.find((l) => Number(l.id) === Number(lmId));
    if (personal) {
      matchedName = personal.nom ?? matchedName;
      matchedZoneName = personal.zone?.nom ?? matchedZoneName;
      if (personal.latitude != null && personal.longitude != null) {
        rawLat = personal.latitude;
        rawLng = personal.longitude;
      }
    }
  }

  // Si le client a choisi un repère de profil distinct (ancré sur le 1er repère de la zone),
  // privilégier la localisation de ce lieu réel si connue ou géocodable.
  const distinctHint = extractDistinctPlaceHint(order.description_lieu, matchedName);
  if (distinctHint) {
    const knownCustom = lookupVerifiedCoords(distinctHint, null);
    if (knownCustom) {
      return { coords: knownCustom, zoneName: matchedZoneName };
    }
    try {
      const places = await geocodeFn(`${distinctHint}, ${matchedZoneName ?? 'Cotonou'}, Bénin`);
      const onLand = places.find(
        (p) => p.lat >= 6.2 && p.lat <= 12.5 && p.lng >= 0.7 && p.lng <= 3.9 && !isInCotonouSea(p.lat, p.lng),
      );
      if (onLand) return { coords: [onLand.lat, onLand.lng], zoneName: matchedZoneName };
    } catch {
      /* fallback ci-dessous */
    }
  }

  const sanitized = sanitizeLandmarkCoords(rawLat, rawLng, matchedName, matchedZoneName);
  if (sanitized) {
    return { coords: sanitized, zoneName: matchedZoneName };
  }

  // Dernier secours : géocodage du nom du point de repère choisi + zone
  if (matchedName || matchedZoneName) {
    const query = [matchedName, matchedZoneName, 'Bénin'].filter(Boolean).join(', ');
    try {
      const places = await geocodeFn(query);
      const onLand = places.find(
        (p) => p.lat >= 6.2 && p.lat <= 12.5 && p.lng >= 0.7 && p.lng <= 3.9 && !isInCotonouSea(p.lat, p.lng),
      );
      if (onLand) return { coords: [onLand.lat, onLand.lng], zoneName: matchedZoneName };
    } catch {
      /* aucun résultat */
    }
  }

  return { coords: null, zoneName: matchedZoneName };
}
