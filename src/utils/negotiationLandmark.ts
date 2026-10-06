/** Repère choisi par le client pour une négociation. */

export type RememberedLandmark = {
  id: number;
  nom: string;
  zoneNom: string;
};

const KEY = 'tokpa_nego_landmark';

function readAll(): Record<string, RememberedLandmark> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, RememberedLandmark>;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function rememberNegotiationLandmark(key: number | string, landmark: RememberedLandmark) {
  const all = readAll();
  all[String(key)] = {
    id: Number(landmark.id),
    nom: landmark.nom,
    zoneNom: landmark.zoneNom,
  };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function readNegotiationLandmark(key: number | string): RememberedLandmark | null {
  const item = readAll()[String(key)];
  const id = Number(item?.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { id, nom: String(item.nom ?? ''), zoneNom: String(item.zoneNom ?? '') };
}

/** Repère déjà renvoyé par l'API, si le contrat le contient. Sinon null. */
export function landmarkFromProposal(proposal: {
  landmark_id?: unknown;
  landmark?: { id?: unknown; nom?: unknown; zone?: { nom?: unknown } | null };
  point_repere?: { id?: unknown; nom?: unknown } | null;
} | null | undefined): RememberedLandmark | null {
  if (!proposal) return null;
  const id = Number(proposal.landmark_id ?? proposal.landmark?.id ?? proposal.point_repere?.id ?? 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  const nom = String(proposal.landmark?.nom ?? proposal.point_repere?.nom ?? '');
  const zoneNom = String(proposal.landmark?.zone?.nom ?? '');
  return { id, nom: nom || `#${id}`, zoneNom };
}
