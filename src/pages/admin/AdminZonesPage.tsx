import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows } from '../../services/api/useLiveRows';
import { fmtFcfa } from '../../services/api/unwrap';
import { formatApiError } from '../../utils/apiError';
import { searchPlaces } from '../../services/api/geocode';
import type { GeoPlace } from '../../services/api/geocode';
import DESIGN_SCRIPT from './_scripts/AdminZonesPage';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';

const DESIGN_CSS = `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            display: inline-block;
            vertical-align: middle;
        }
        .sidebar-dark { background-color: #111827; }
        .map-container { background-color: #E8F4FD; position: relative; overflow: hidden; border-radius: 14px; isolation: isolate; z-index: 0; }
        .map-container .leaflet-container { background: #E8F4FD; font: inherit; }
        .map-container .leaflet-tile-pane { filter: grayscale(0.65) contrast(0.95); }
        .map-container .leaflet-tooltip { border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); font-size: 12px; }
        .card-shadow { border: 0.5px solid #E5E7EB; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
        .chip { border: 1px solid #e0c0b1; transition: all 0.2s ease; }
        .chip:hover { transform: translateY(-1px); }
        .design-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(60,45,38,0.35) transparent; }
        .design-modal-scroll::-webkit-scrollbar { width: 8px; }
        .design-modal-scroll::-webkit-scrollbar-thumb { background: rgba(60,45,38,0.35); border-radius: 8px; }
        .design-modal-scroll::-webkit-scrollbar-track { background: transparent; }
    `;

/** Tuiles réelles (Calques = bascule de fond de carte). */
const TILE_URLS = [
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
];
const VUE_BENIN: L.LatLngExpression = [8.0, 2.3];

/** Points d'un polygone_geo (tableau de [lat, lng], d'objets, ou GeoJSON). */
const polyPoints = (pg: any): Array<{ lat: number; lng: number }> => {
  if (!pg) return [];
  let coords: any = pg;
  if (!Array.isArray(coords) && Array.isArray(coords?.coordinates)) coords = coords.coordinates;
  if (Array.isArray(coords?.[0]?.[0])) coords = coords[0];
  if (!Array.isArray(coords)) return [];
  const pts: Array<{ lat: number; lng: number }> = [];
  for (const pt of coords) {
    if (pt && typeof pt === 'object' && !Array.isArray(pt)) {
      const lat = Number((pt as any).latitude ?? (pt as any).lat ?? (pt as any)[0]);
      const lng = Number((pt as any).longitude ?? (pt as any).lng ?? (pt as any)[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push({ lat, lng });
    } else if (Array.isArray(pt) && pt.length >= 2) {
      const a = Number(pt[0]);
      const b = Number(pt[1]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      // heuristique Bénin : lat (≈6-12) > lng (≈1-4) → [lat, lng] si a > b
      pts.push(a >= b ? { lat: a, lng: b } : { lat: b, lng: a });
    }
  }
  return pts;
};

/** Périmètre d'une zone = cercle d'environ 500 m autour du lieu choisi. */
const circlePoly = (lat: number, lng: number, rayonDeg = 0.0045): Array<[number, number]> => {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 12; i++) {
    const a = (2 * Math.PI * i) / 12;
    pts.push([
      Number((lat + rayonDeg * Math.sin(a)).toFixed(6)),
      Number((lng + (rayonDeg / Math.cos((lat * Math.PI) / 180)) * Math.cos(a)).toFixed(6)),
    ]);
  }
  return pts;
};

const LM_INIT = { zone_id: '', nom: '', description: '', latitude: '', longitude: '' };
const ZONE_INIT = { nom: '', km_prix: '', description: '', manager: '', latitude: '', longitude: '' };

/** Recherche de lieu type Google Maps : on tape un nom, on clique une proposition. */
function PlaceSearch({ onPick, placeholder }: { onPick: (p: GeoPlace) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serr, setSerr] = useState('');

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      setRes([]);
      setOpen(false);
      setSerr('');
      return;
    }
    setBusy(true);
    setOpen(true);
    const t = window.setTimeout(() => {
      searchPlaces(query)
        .then((rows) => {
          setRes(rows);
          setSerr('');
        })
        .catch((e: any) => {
          setRes([]);
          setSerr(String(e?.message ?? 'Recherche indisponible (connexion ?)'));
        })
        .finally(() => setBusy(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <input
        className="w-full h-11 px-md rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        type="text"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && (
        <div className="absolute z-[50] top-full mt-1 w-full bg-white border border-border-default rounded-lg shadow-lg max-h-[210px] overflow-y-auto design-modal-scroll">
          {busy && <p className="px-3 py-2 text-micro text-text-tertiary">Recherche du lieu…</p>}
          {!busy && serr && <p className="px-3 py-2 text-micro text-error">{serr}</p>}
          {!busy && !serr && res.length === 0 && <p className="px-3 py-2 text-micro text-text-secondary">Aucun lieu trouvé.</p>}
          {res.map((p, i) => (
            <button
              key={`${p.lat},${p.lng},${i}`}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-primary-tint transition-colors border-b border-border-default last:border-0"
              onClick={() => {
                onPick(p);
                setOpen(false);
                setQ(p.nom);
              }}
            >
              <p className="font-label text-label text-on-surface">{p.nom}</p>
              <p className="text-micro text-text-secondary line-clamp-1">{p.detail}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AdminZonesPage — copie conforme du design Stitch (code.html) + données réelles.
 * Carte Leaflet/OSM : une zone à la fois, cadrée sur ses repères. « Nouvelle zone »
 * et « Ajouter » un repère = modales avec recherche de lieu (comme Google Maps) +
 * placement au clic sur la carte.
 */
export default function AdminZonesPage() {
  useDesignScript(DESIGN_SCRIPT);
  const { rows: zones, err, loading, reload } = useLiveRows(() => adminApi.getZones());
  const { rows: landmarks, reload: reloadLm } = useLiveRows(() => adminApi.getLandmarks());
  const { rows: managers } = useLiveRows(() => adminApi.getUsers({ role: 'manager', per_page: 100 }));
  const { rows: livreurs } = useLiveRows(() => adminApi.getUsers({ role: 'livreur', per_page: 100 }));
  const [selId, setSelId] = useState<number | null>(null);
  const [f, setF] = useState({ nom: '', km_prix: '', description: '', manager: '' });
  const [tileIdx, setTileIdx] = useState(0);
  const [modal, setModal] = useState<null | 'zone' | 'lm'>(null);
  const [lmForm, setLmForm] = useState(LM_INIT);
  const [zoneForm, setZoneForm] = useState(ZONE_INIT);

  const sel: any = zones.find((z: any) => z.id === selId) ?? null;
  const lmSel: any[] = sel ? landmarks.filter((l: any) => String(l.zone_id) === String(sel.id)) : [];
  const countRole = (rows: any[], id: any) =>
    rows.filter((u: any) => String(u.zone?.id ?? u.zone_id ?? u.profil?.zone?.id ?? '') === String(id)).length;

  const selectZone = (z: any) => {
    setSelId(z.id);
    setF({
      nom: String(z.nom ?? ''),
      km_prix: String(z.km_prix ?? z.tarif_km ?? ''),
      description: String(z.description ?? ''),
      manager: String(z.manager_id ?? z.manager?.id ?? ''),
    });
  };
  const resetForm = () => {
    if (sel) selectZone(sel);
  };
  const saveZone = async () => {
    if (!sel) return;
    const payload = {
      nom: f.nom.trim(),
      km_prix: Number(f.km_prix),
      description: f.description,
      manager_id: f.manager ? Number(f.manager) : null,
    };
    if (!payload.nom) {
      window.alert('Le nom de la zone est obligatoire.');
      return;
    }
    if (!Number.isFinite(payload.km_prix)) {
      window.alert('Les frais de livraison (nombre en FCFA) sont obligatoires.');
      return;
    }
    try {
      await adminApi.updateZone(sel.id, payload);
      reload();
      reloadLm();
    } catch (e) {
      window.alert(formatApiError(e as any));
    }
  };
  const delZone = async () => {
    if (!sel) return;
    if (!window.confirm(`Supprimer la zone « ${sel.nom} » ?`)) return;
    try {
      await adminApi.deleteZone(sel.id);
      setSelId(null);
      reload();
      reloadLm();
    } catch (e) {
      window.alert(formatApiError(e as any));
    }
  };

  /* ---------- Modale « Nouvelle zone » ---------- */
  const openZoneModal = () => {
    setZoneForm(ZONE_INIT);
    setModal('zone');
  };
  const saveZoneModal = async () => {
    const z = zoneForm;
    if (!z.nom.trim()) {
      window.alert('Le nom de la zone est obligatoire.');
      return;
    }
    if (!Number.isFinite(Number(z.km_prix))) {
      window.alert('Les frais de livraison (nombre en FCFA) sont obligatoires.');
      return;
    }
    const payload: Record<string, unknown> = {
      nom: z.nom.trim(),
      km_prix: Number(z.km_prix),
      min_prix: 0,
      open_zone: true,
      description: z.description,
      manager_id: z.manager ? Number(z.manager) : null,
    };
    if (z.latitude.trim() && z.longitude.trim()) {
      payload.polygone_geo = circlePoly(Number(z.latitude), Number(z.longitude));
    }
    try {
      const res: any = await adminApi.createZone(payload);
      setModal(null);
      reload();
      reloadLm();
      const id = res?.data?.id ?? res?.id;
      if (id != null) setSelId(Number(id));
    } catch (e) {
      window.alert(formatApiError(e as any));
    }
  };

  /* ---------- Modale « Nouveau point de repère » ---------- */
  const openLmModal = () => {
    if (!zones.length) {
      window.alert("Créez d'abord une zone avant d'ajouter un repère.");
      return;
    }
    setLmForm({ ...LM_INIT, zone_id: String(sel?.id ?? zones[0].id) });
    setModal('lm');
  };
  const saveLm = async () => {
    const zoneId = Number(lmForm.zone_id);
    if (!zoneId) {
      window.alert('Choisissez la zone du repère.');
      return;
    }
    if (!lmForm.nom.trim()) {
      window.alert('Le nom du repère est obligatoire.');
      return;
    }
    try {
      await adminApi.createLandmark({
        zone_id: zoneId,
        nom: lmForm.nom.trim(),
        description: lmForm.description || null,
        latitude: lmForm.latitude.trim() ? Number(lmForm.latitude) : null,
        longitude: lmForm.longitude.trim() ? Number(lmForm.longitude) : null,
      });
      setModal(null);
      reloadLm();
      reload();
    } catch (e) {
      window.alert(formatApiError(e as any));
    }
  };
  const delLm = async (lm: any) => {
    if (!window.confirm(`Supprimer le point de repère « ${lm.nom} » ?`)) return;
    try {
      await adminApi.deleteLandmark(lm.id);
      reloadLm();
      reload();
    } catch (e) {
      window.alert(formatApiError(e as any));
    }
  };

  /* ---------- Carte : positions choisies (recherche ou clic) ---------- */
  const placeZonePoint = (lat: number, lng: number) => {
    setZoneForm((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    const map = mapRef.current;
    if (map) showTemp(L.polygon(circlePoly(lat, lng), { color: '#9d4300', weight: 2, fillColor: '#f97316', fillOpacity: 0.15, dashArray: '6' }), map);
  };
  const placeLmPoint = (lat: number, lng: number) => {
    setLmForm((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    const map = mapRef.current;
    if (map) showTemp(L.circleMarker([lat, lng], { radius: 8, color: '#9d4300', weight: 2, fillColor: '#f97316', fillOpacity: 0.5 }), map);
  };
  const pickPlaceZone = (p: GeoPlace) => {
    setZoneForm((prev) => ({ ...prev, nom: prev.nom || p.nom, latitude: String(p.lat), longitude: String(p.lng) }));
    mapRef.current?.flyTo([p.lat, p.lng], 14, { animate: true });
    placeZonePoint(p.lat, p.lng);
  };
  const pickPlaceLm = (p: GeoPlace) => {
    setLmForm((prev) => ({ ...prev, nom: prev.nom || p.nom, latitude: String(p.lat), longitude: String(p.lng) }));
    mapRef.current?.flyTo([p.lat, p.lng], 15, { animate: true });
    placeLmPoint(p.lat, p.lng);
  };

  const selHasGeo = useMemo(() => {
    if (!sel) return true;
    const poly = polyPoints(sel.polygone_geo).length >= 3;
    const lmGeo = landmarks.some(
      (l: any) => String(l.zone_id) === String(sel.id) && Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude)),
    );
    return poly || lmGeo;
  }, [sel, landmarks]);

  /* ---------- Vraie carte Leaflet ---------- */
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const vecRef = useRef<L.LayerGroup | null>(null);
  const tempRef = useRef<L.Layer | null>(null);

  const showTemp = (layer: L.Layer, map: L.Map) => {
    if (tempRef.current) map.removeLayer(tempRef.current);
    tempRef.current = layer.addTo(map);
  };
  const clearTemp = (map: L.Map) => {
    if (tempRef.current) {
      map.removeLayer(tempRef.current);
      tempRef.current = null;
    }
  };

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: false, minZoom: 5 });
    map.setView(VUE_BENIN, 7);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addAttribution('© OpenStreetMap contributors').addTo(map);
    tileRef.current = L.tileLayer(TILE_URLS[tileIdx], { maxZoom: 19 }).addTo(map);
    vecRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      vecRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = tileRef.current;
    const map = mapRef.current;
    if (!t || !map) return;
    map.removeLayer(t);
    tileRef.current = L.tileLayer(TILE_URLS[tileIdx], { maxZoom: 19 }).addTo(map);
  }, [tileIdx]);

  // Échap ferme la modale ; clic sur la carte = placer le point (zone ou repère)
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
    };
    window.addEventListener('keydown', onKey);
    const map = mapRef.current;
    const onClick = (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      if (modal === 'zone') placeZonePoint(lat, lng);
      else placeLmPoint(lat, lng);
    };
    map?.on('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      map?.off('click', onClick);
      if (map) clearTemp(map);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  useEffect(() => {
    const map = mapRef.current;
    const grp = vecRef.current;
    if (!map || !grp) return;
    grp.clearLayers();
    const cadrage: L.LatLngExpression[] = [];
    // Une zone s'affiche individuellement : si sélection → SES formes uniquement
    const zonesToDraw: any[] = selId != null ? zones.filter((z: any) => z.id === selId) : zones;
    const lmsToDraw: any[] = selId != null ? landmarks.filter((l: any) => String(l.zone_id) === String(selId)) : landmarks;
    for (const z of zonesToDraw) {
      const active = z.id === selId;
      const pts = polyPoints(z.polygone_geo).map((p) => [p.lat, p.lng] as L.LatLngExpression);
      if (pts.length >= 3) {
        L.polygon(pts, { color: '#F97316', weight: active ? 3 : 1, fillOpacity: active ? 0.35 : 0.12 })
          .addTo(grp)
          .bindTooltip(String(z.nom), { sticky: true });
        if (active) cadrage.push(...pts);
      }
    }
    for (const lm of lmsToDraw) {
      const lat = Number(lm.latitude);
      const lng = Number(lm.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const active = String(lm.zone_id) === String(selId);
      L.circleMarker([lat, lng], {
        radius: active ? 7 : 4,
        color: '#9d4300',
        weight: 2,
        fillColor: active ? '#9d4300' : '#ffffff',
        fillOpacity: 1,
      })
        .addTo(grp)
        .bindTooltip(String(lm.nom ?? ''), { permanent: active, direction: 'top', offset: [0, -6] });
      if (active) cadrage.push([lat, lng]);
    }
    // Cadrage : la zone active est encadrée en fonction de ses repères entrés
    if (selId != null) {
      if (cadrage.length >= 2) map.fitBounds(L.latLngBounds(cadrage), { padding: [50, 50], maxZoom: 16, animate: true });
      else if (cadrage.length === 1) map.setView(cadrage[0], 15, { animate: true });
      else map.setView(VUE_BENIN, 7, { animate: true });
    } else {
      const all: L.LatLngExpression[] = [];
      for (const z of zones) all.push(...polyPoints(z.polygone_geo).map((p) => [p.lat, p.lng] as L.LatLngExpression));
      for (const lm of landmarks) {
        const lat = Number(lm.latitude);
        const lng = Number(lm.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) all.push([lat, lng]);
      }
      if (all.length >= 2) map.fitBounds(L.latLngBounds(all), { padding: [40, 40], maxZoom: 14, animate: true });
      else map.setView(VUE_BENIN, 7, { animate: true });
    }
  }, [zones, landmarks, selId]);

  const posBlock = (lat: string, lng: string, texte: string) => (
    <div className="p-3 bg-primary-tint/50 rounded-xl space-y-2">
      <p className="font-label text-label text-on-surface">Position sur la carte</p>
      <p className="text-micro text-text-secondary">{texte}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-xs">
          <label className="font-label text-micro text-text-secondary">Latitude</label>
          <input className="w-full h-11 px-md rounded-lg border-border-default bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" type="text" readOnly value={lat} placeholder="—" />
        </div>
        <div className="space-y-xs">
          <label className="font-label text-micro text-text-secondary">Longitude</label>
          <input className="w-full h-11 px-md rounded-lg border-border-default bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" type="text" readOnly value={lng} placeholder="—" />
        </div>
      </div>
      <p className="text-micro text-text-tertiary">{lat && lng ? `Position choisie : ${lat}, ${lng}` : 'Aucune position choisie pour le moment.'}</p>
    </div>
  );

  return (
    <AdminLayout currentPath="/admin/zones">
      <style>{DESIGN_CSS}</style>
      {err && (
        <div className="m-lg rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
          <p className="font-bold">Erreur API</p>
          <p>{err}</p>
        </div>
      )}
      {loading && <p className="m-lg text-label text-text-secondary">Chargement des données réelles…</p>}
  <header className="bg-bg-card h-16 px-lg flex justify-between items-center border-b border-border-default sticky top-0 z-40"> <div className="flex items-center gap-4"> <h1 className="font-h1 text-h2 text-text-main">Gestion des zones</h1> </div> <div className="flex items-center gap-md"> <button className="bg-primary text-on-primary flex items-center gap-2 px-md py-2.5 rounded-lg hover:bg-primary-hover active:scale-95 transition-all font-label" onClick={openZoneModal}> <MIcon name="add" className="text-[20px]" />
                        Nouvelle zone
                    </button> </div> </header>  <div className="p-lg grid grid-cols-10 gap-6">  <div className="col-span-10 lg:col-span-4 space-y-md"> <div className="flex items-center justify-between mb-2"> <h2 className="font-h3 text-text-secondary uppercase tracking-widest text-micro">Liste des zones actives</h2> <span className="text-micro font-bold text-primary">{zones.length} Zones au total</span> </div>
                {zones.length === 0 && !loading && (
                  <p className="text-secondary text-text-secondary p-5 bg-bg-card rounded-[14px] card-shadow">Aucune zone enregistrée. Utilisez « Nouvelle zone ».</p>
                )}
                {zones.map((z: any) => {
                  const isSel = z.id === selId;
                  const lmCount = landmarks.filter((l: any) => String(l.zone_id) === String(z.id)).length;
                  return (
                    <div key={z.id} onClick={() => selectZone(z)} className={isSel ? 'bg-primary-tint border-2 border-primary rounded-[14px] p-5 card-shadow cursor-pointer transition-all' : 'bg-bg-card border-[0.5px] border-border-default rounded-[14px] p-5 card-shadow hover:border-primary-light cursor-pointer group transition-all'}> <div className="flex justify-between items-start mb-4"> <div> <h3 className="font-h3 text-h3 text-text-main mb-1">{z.nom}</h3> <div className="flex items-center gap-2"> <span className={`w-2 h-2 rounded-full ${z.open_zone ? 'bg-success' : 'bg-error'}`}></span> <span className={`text-secondary font-medium ${z.open_zone ? 'text-success' : 'text-error'}`}>{z.open_zone ? 'Active' : 'Fermée'}</span> </div> </div> <div className={`flex gap-2 ${isSel ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}> <button className={isSel ? 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-primary-light/20 text-primary transition-colors border border-primary-light/50' : 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-app text-text-secondary border border-border-default'} onClick={(e) => { e.stopPropagation(); selectZone(z); }}> <MIcon name="edit" className="text-[18px]" /> </button> <button className={isSel ? 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-primary-light/20 text-primary transition-colors border border-primary-light/50' : 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-app text-text-secondary border border-border-default'} onClick={(e) => { e.stopPropagation(); selectZone(z); }}> <MIcon name="visibility" className="text-[18px]" /> </button> </div> </div> <p className="text-secondary text-text-secondary mb-4">{countRole(managers, z.id)} managers · {countRole(livreurs, z.id)} livreurs · {lmCount} points de repère</p> <div className={`flex justify-between items-center pt-4 ${isSel ? 'border-t border-primary-light/30' : 'border-t border-border-default'}`}> <span className="text-secondary text-text-tertiary">Frais de livraison</span> <span className="font-price text-price text-primary">{fmtFcfa(Number(z.km_prix ?? z.tarif_km ?? 0))}</span> </div> </div>
                  );
                })}
                </div>  <div className="col-span-10 lg:col-span-6 space-y-lg">  <div className="map-container h-[420px] card-shadow flex flex-col relative"> <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-border-default"> <p className="text-micro font-bold text-text-main uppercase">Visualisation Géo</p> <p className="text-secondary text-text-secondary">{sel ? sel.nom : 'Bénin'}</p> </div>
                {sel && !selHasGeo && (
                  <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
                    <span className="bg-white/95 text-text-secondary text-label px-4 py-2 rounded-lg border border-border-default shadow-sm">Aucune coordonnée pour cette zone — ajoutez des points de repère GPS (recherche de lieu ou clic sur la carte) pour la cadrer.</span>
                  </div>
                )}
                <div ref={mapElRef} className="w-full h-full relative" id="map-canvas"></div>
                <div className="absolute bottom-4 right-4 z-[1000] flex gap-2"> <button className="bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-border-default hover:bg-app text-text-main" onClick={() => mapRef.current?.zoomIn()}> <MIcon name="zoom_in" /> </button> <button className="bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-border-default hover:bg-app text-text-main" onClick={() => mapRef.current?.zoomOut()}> <MIcon name="zoom_out" /> </button> <button className="bg-white px-md h-10 rounded-full flex items-center gap-2 shadow-md border border-border-default hover:bg-app text-text-main font-label" onClick={() => setTileIdx((i) => (i + 1) % TILE_URLS.length)}> <MIcon name="layers" />
                                Calques
                            </button> </div> </div>  <div className="bg-bg-card p-lg rounded-[14px] card-shadow"> <div className="flex items-center justify-between mb-md"> <h2 className="font-h2 text-h2 text-text-main">Points de repère — Zone {sel ? sel.nom : '—'}</h2> <button className="text-primary hover:text-primary-hover font-label flex items-center gap-1 group" onClick={openLmModal}> <MIcon name="add_circle" className="text-[18px]" />
                                Ajouter
                            </button> </div> <div className="flex flex-wrap gap-3">
                {lmSel.length === 0 && <span className="text-secondary text-text-secondary">Aucun point de repère enregistré pour cette zone.</span>}
                {lmSel.map((lm: any) => (
                  <div key={lm.id} className="chip group flex items-center gap-2 px-3 py-2 rounded-full bg-primary-tint text-primary-dark"> <MIcon name="location_on" className="text-[16px]" /> <span className="text-label">{lm.nom}</span> <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-dark/70 hover:text-error" title="Supprimer" onClick={() => void delLm(lm)}> <MIcon name="close" className="text-[14px]" /> </button> </div>
                ))}
              </div> </div>  <div className="bg-bg-card p-lg rounded-[14px] card-shadow"> <h3 className="font-h3 text-h3 text-text-main mb-lg">Détails de la zone</h3> <form className="grid grid-cols-2 gap-md" onSubmit={(e) => e.preventDefault()}> <div className="col-span-2 md:col-span-1 space-y-1"> <label className="text-secondary text-text-secondary">Nom de la zone</label> <input className="w-full h-11 px-md rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" type="text" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /> </div> <div className="col-span-2 md:col-span-1 space-y-1"> <label className="text-secondary text-text-secondary">Frais de livraison (FCFA)</label> <div className="relative"> <input className="w-full h-11 px-md rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-16" type="number" value={f.km_prix} onChange={(e) => setF({ ...f, km_prix: e.target.value })} /> <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary font-bold text-micro">FCFA</span> </div> </div> <div className="col-span-2 space-y-1"> <label className="text-secondary text-text-secondary">Manager responsable</label> <div className="relative"> <select className="w-full h-11 px-md rounded-lg border-border-default appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12 bg-white" value={f.manager} onChange={(e) => setF({ ...f, manager: e.target.value })}> <option value="">— Aucun —</option>
                    {managers.map((m: any) => (
                      <option key={m.id} value={String(m.id)}>{m.nom_complet ?? m.name ?? m.email ?? `Manager #${m.id}`}</option>
                    ))}
                  </select> <MIcon name="expand_more" className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" /> </div> </div> <div className="col-span-2 space-y-1"> <label className="text-secondary text-text-secondary">Description</label> <textarea className="w-full px-md py-2 rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}></textarea> </div> <div className="col-span-2 flex justify-end gap-3 mt-4">
                {sel && (
                  <button className="px-md py-2.5 text-error font-label hover:bg-error-light rounded-lg transition-colors" type="button" onClick={() => void delZone()}>Supprimer</button>
                )}
                <button className="px-md py-2.5 text-text-secondary font-label hover:bg-app rounded-lg transition-colors" type="button" onClick={resetForm}>Réinitialiser</button>
                <button className="bg-primary text-on-primary px-lg py-2.5 rounded-lg hover:bg-primary-hover active:scale-97 transition-all font-label" type="button" onClick={() => void saveZone()}>Enregistrer les modifications</button>
              </div> </form> </div> </div> </div>

      {/* Modale « Nouvelle zone » (scroll + ✕/Annuler/Échap + max-w-[Npx] ; clic carte = position) */}
      {modal === 'zone' && (
        <div className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto design-modal-scroll p-lg pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-lg">
              <h3 className="font-h2 text-h2 text-on-surface">Nouvelle zone</h3>
              <button className="p-2 text-text-tertiary hover:text-on-surface transition-colors" onClick={() => setModal(null)}>
                <MIcon name="close" />
              </button>
            </div>
            <form className="space-y-md" onSubmit={(e) => { e.preventDefault(); void saveZoneModal(); }}>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Rechercher le lieu de la zone (comme Google Maps)</label>
                <PlaceSearch onPick={pickPlaceZone} placeholder="Ex : Akpakpa, Cotonou…" />
              </div>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Nom de la zone</label>
                <input className="w-full h-11 px-md rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" type="text" value={zoneForm.nom} onChange={(e) => setZoneForm({ ...zoneForm, nom: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-xs">
                  <label className="font-label text-label text-text-secondary">Frais de livraison (FCFA)</label>
                  <input className="w-full h-11 px-md rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" type="number" value={zoneForm.km_prix} onChange={(e) => setZoneForm({ ...zoneForm, km_prix: e.target.value })} />
                </div>
                <div className="space-y-xs">
                  <label className="font-label text-label text-text-secondary">Manager responsable</label>
                  <select className="w-full h-11 px-md rounded-lg border-border-default appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white" value={zoneForm.manager} onChange={(e) => setZoneForm({ ...zoneForm, manager: e.target.value })}>
                    <option value="">— Aucun —</option>
                    {managers.map((m: any) => (
                      <option key={m.id} value={String(m.id)}>{m.nom_complet ?? m.name ?? m.email ?? `Manager #${m.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Description</label>
                <textarea className="w-full px-md py-2 rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" rows={2} value={zoneForm.description} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}></textarea>
              </div>
              {posBlock(zoneForm.latitude, zoneForm.longitude, "Choisissez le lieu par la recherche ou en cliquant sur la carte — le périmètre de la zone sera un cercle d'environ 500 m autour de ce point.")}
              <div className="flex justify-end gap-3 pt-2">
                <button className="px-md py-2.5 text-text-secondary font-label hover:bg-app rounded-lg transition-colors" type="button" onClick={() => setModal(null)}>Annuler</button>
                <button className="bg-primary text-on-primary px-lg py-2.5 rounded-lg hover:bg-primary-hover active:scale-97 transition-all font-label" type="submit">Créer la zone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale « Nouveau point de repère » */}
      {modal === 'lm' && (
        <div className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto design-modal-scroll p-lg pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-lg">
              <h3 className="font-h2 text-h2 text-on-surface">Nouveau point de repère</h3>
              <button className="p-2 text-text-tertiary hover:text-on-surface transition-colors" onClick={() => setModal(null)}>
                <MIcon name="close" />
              </button>
            </div>
            <form className="space-y-md" onSubmit={(e) => { e.preventDefault(); void saveLm(); }}>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Rechercher le lieu du repère (comme Google Maps)</label>
                <PlaceSearch onPick={pickPlaceLm} placeholder="Ex : Marché Dantokpa…" />
              </div>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Zone</label>
                <select className="w-full h-11 px-md rounded-lg border-border-default appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white" value={lmForm.zone_id} onChange={(e) => setLmForm({ ...lmForm, zone_id: e.target.value })}>
                  {zones.map((z: any) => (
                    <option key={z.id} value={String(z.id)}>{z.nom}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Nom du point de repère</label>
                <input className="w-full h-11 px-md rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" type="text" placeholder="Ex : Marché Dantokpa" value={lmForm.nom} onChange={(e) => setLmForm({ ...lmForm, nom: e.target.value })} />
              </div>
              <div className="space-y-xs">
                <label className="font-label text-label text-text-secondary">Description</label>
                <textarea className="w-full px-md py-2 rounded-lg border-border-default focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" rows={2} placeholder="Repère, accès, indication utile…" value={lmForm.description} onChange={(e) => setLmForm({ ...lmForm, description: e.target.value })}></textarea>
              </div>
              {posBlock(lmForm.latitude, lmForm.longitude, 'Choisissez le lieu par la recherche ou en cliquant sur la carte — les coordonnées se remplissent toutes seules.')}
              <div className="flex justify-end gap-3 pt-2">
                <button className="px-md py-2.5 text-text-secondary font-label hover:bg-app rounded-lg transition-colors" type="button" onClick={() => setModal(null)}>Annuler</button>
                <button className="bg-primary text-on-primary px-lg py-2.5 rounded-lg hover:bg-primary-hover active:scale-97 transition-all font-label" type="submit">Enregistrer le repère</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
