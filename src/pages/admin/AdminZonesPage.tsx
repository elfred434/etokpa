import { useMemo, useState } from 'react';
import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows } from '../../services/api/useLiveRows';
import { fmtFcfa } from '../../services/api/unwrap';
import { formatApiError } from '../../utils/apiError';
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
        .map-container { background-color: #E8F4FD; position: relative; overflow: hidden; border-radius: 14px; }
        .zone-poly { fill: #F97316; fill-opacity: 0.2; stroke: #F97316; stroke-width: 1; }
        .zone-poly.active { fill-opacity: 0.4; stroke-width: 3; }
        .card-shadow { border: 0.5px solid #E5E7EB; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
        .chip { border: 1px solid #e0c0b1; transition: all 0.2s ease; }
        .chip:hover { transform: translateY(-1px); }
    `;

/** Projection GPS → canvas SVG (boîte Cotonou : lng 2.25–2.55 / lat 6.30–6.48). */
const BBOX = { lngMin: 2.25, lngMax: 2.55, latMin: 6.3, latMax: 6.48 };
const proj = (lat: number, lng: number) => ({
  x: Math.max(0, Math.min(800, ((lng - BBOX.lngMin) / (BBOX.lngMax - BBOX.lngMin)) * 800)),
  y: Math.max(0, Math.min(500, ((BBOX.latMax - lat) / (BBOX.latMax - BBOX.latMin)) * 500)),
});

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
      // heuristique Cotonou : lat (≈6.3x) > lng (≈2.4x) → [lat, lng] si a > b
      pts.push(a >= b ? { lat: a, lng: b } : { lat: b, lng: a });
    }
  }
  return pts;
};

/**
 * AdminZonesPage — copie conforme du design Stitch (code.html) + données réelles.
 * Cartes de zones (GET /admin/zones), sélection → formulaire rempli, enregistrement
 * réel (POST/PUT/DELETE /admin/zones), points de repère réels (/admin/landmarks),
 * polygones/points réels sur la carte SVG quand les coordonnées existent.
 */
export default function AdminZonesPage() {
  useDesignScript(DESIGN_SCRIPT);
  const { rows: zones, err, loading, reload } = useLiveRows(() => adminApi.getZones());
  const { rows: landmarks, reload: reloadLm } = useLiveRows(() => adminApi.getLandmarks());
  const { rows: managers } = useLiveRows(() => adminApi.getUsers({ role: 'manager', per_page: 100 }));
  const { rows: livreurs } = useLiveRows(() => adminApi.getUsers({ role: 'livreur', per_page: 100 }));
  const [selId, setSelId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ nom: '', km_prix: '', description: '', manager: '' });

  const sel: any = zones.find((z: any) => z.id === selId) ?? null;
  const lmSel: any[] = sel ? landmarks.filter((l: any) => String(l.zone_id) === String(sel.id)) : [];
  const countRole = (rows: any[], id: any) =>
    rows.filter((u: any) => String(u.zone?.id ?? u.zone_id ?? u.profil?.zone?.id ?? '') === String(id)).length;

  const selectZone = (z: any) => {
    setCreating(false);
    setSelId(z.id);
    setF({
      nom: String(z.nom ?? ''),
      km_prix: String(z.km_prix ?? z.tarif_km ?? ''),
      description: String(z.description ?? ''),
      manager: String(z.manager_id ?? z.manager?.id ?? ''),
    });
  };
  const newZone = () => {
    setCreating(true);
    setSelId(null);
    setF({ nom: '', km_prix: '', description: '', manager: '' });
  };
  const resetForm = () => {
    if (sel) selectZone(sel);
    else newZone();
  };
  const saveZone = async () => {
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
      if (creating) await adminApi.createZone({ ...payload, min_prix: 0, open_zone: true });
      else await adminApi.updateZone(selId as number, payload);
      reload();
      reloadLm();
      setCreating(false);
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
  const addLm = async () => {
    if (!sel) {
      window.alert("Sélectionnez d'abord une zone dans la liste.");
      return;
    }
    const nom = window.prompt('Nom du point de repère');
    if (!nom?.trim()) return;
    const description = window.prompt('Description (optionnelle)') ?? '';
    try {
      await adminApi.createLandmark({ zone_id: sel.id, nom: nom.trim(), description: description || null });
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

  const polys = useMemo(
    () =>
      zones
        .map((z: any) => {
          const pts = polyPoints(z.polygone_geo);
          if (pts.length < 3) return null;
          const d =
            pts
              .map((p, i) => {
                const { x, y } = proj(p.lat, p.lng);
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(0)},${y.toFixed(0)}`;
              })
              .join(' ') + ' Z';
          return { id: z.id, d };
        })
        .filter(Boolean) as Array<{ id: any; d: string }>,
    [zones],
  );
  const lmPts = useMemo(
    () =>
      landmarks
        .map((lm: any) => {
          const lat = Number(lm.latitude);
          const lng = Number(lm.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return { id: lm.id, nom: String(lm.nom ?? ''), ...proj(lat, lng) };
        })
        .filter(Boolean) as Array<{ id: any; nom: string; x: number; y: number }>,
    [landmarks],
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
  <header className="bg-bg-card h-16 px-lg flex justify-between items-center border-b border-border-default sticky top-0 z-40"> <div className="flex items-center gap-4"> <h1 className="font-h1 text-h2 text-text-main">Gestion des zones</h1> </div> <div className="flex items-center gap-md"> <button className="bg-primary text-on-primary flex items-center gap-2 px-md py-2.5 rounded-lg hover:bg-primary-hover active:scale-95 transition-all font-label" onClick={newZone}> <MIcon name="add" className="text-[20px]" />
                        Nouvelle zone
                    </button> <div className="h-8 w-px bg-border-default mx-2"></div> <div className="flex items-center gap-3"> <MIcon name="notifications" className="text-text-secondary cursor-pointer hover:text-primary transition-colors" /> <div className="w-8 h-8 rounded-full overflow-hidden border border-border-default"> <img alt="Manager Profile" data-alt="Close-up portrait of a professional Beninese male administrator with a warm smile, wearing a sharp business casual outfit in a bright, modern office environment. The lighting is soft and professional, reflecting a high-end corporate digital workspace aesthetic with warm orange and neutral gray tones." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7BHVtqSz0E_7C4P5x-2MCnq0qNpgTFTCvr_Kw4NuW2qFqcM2q5-8wju91keV9INvf9NYyGaeyBbgpVVOq4fRTXWMpK11N5IqK_tv4OhIa7Lqbt6x24D3BiZBKw4hfZ0TrNtYsXSBaglp38XfujUz9TwsuQZuLuP8rvQhJf4m9HRL3GS6tpCmnwot62S1NMw_Yq0-3n0Ci2DWP25bhfcAIRAkKMVZuSaJLoVWeIeZv1bipMPT-QY33VCv3V_ODBkj-l_8GLKikLqOb" /> </div> </div> </div> </header>  <div className="p-lg grid grid-cols-10 gap-gutter-desktop">  <div className="col-span-10 lg:col-span-4 space-y-md"> <div className="flex items-center justify-between mb-2"> <h2 className="font-h3 text-text-secondary uppercase tracking-widest text-micro">Liste des zones actives</h2> <span className="text-micro font-bold text-primary">{zones.length} Zones au total</span> </div>
                {zones.length === 0 && !loading && (
                  <p className="text-secondary text-text-secondary p-5 bg-bg-card rounded-[14px] card-shadow">Aucune zone enregistrée. Utilisez « Nouvelle zone ».</p>
                )}
                {zones.map((z: any) => {
                  const isSel = !creating && z.id === selId;
                  const lmCount = landmarks.filter((l: any) => String(l.zone_id) === String(z.id)).length;
                  return (
                    <div key={z.id} onClick={() => selectZone(z)} className={isSel ? 'bg-primary-tint border-2 border-primary rounded-[14px] p-5 card-shadow cursor-pointer transition-all' : 'bg-bg-card border-[0.5px] border-border-default rounded-[14px] p-5 card-shadow hover:border-primary-light cursor-pointer group transition-all'}> <div className="flex justify-between items-start mb-4"> <div> <h3 className="font-h3 text-h3 text-text-main mb-1">{z.nom}</h3> <div className="flex items-center gap-2"> <span className={`w-2 h-2 rounded-full ${z.open_zone ? 'bg-success' : 'bg-error'}`}></span> <span className={`text-secondary font-medium ${z.open_zone ? 'text-success' : 'text-error'}`}>{z.open_zone ? 'Active' : 'Fermée'}</span> </div> </div> <div className={`flex gap-2 ${isSel ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}> <button className={isSel ? 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-primary-light/20 text-primary transition-colors border border-primary-light/50' : 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-app text-text-secondary border border-border-default'} onClick={(e) => { e.stopPropagation(); selectZone(z); }}> <MIcon name="edit" className="text-[18px]" /> </button> <button className={isSel ? 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-primary-light/20 text-primary transition-colors border border-primary-light/50' : 'w-8 h-8 flex items-center justify-center rounded-md hover:bg-app text-text-secondary border border-border-default'} onClick={(e) => { e.stopPropagation(); selectZone(z); }}> <MIcon name="visibility" className="text-[18px]" /> </button> </div> </div> <p className="text-secondary text-text-secondary mb-4">{countRole(managers, z.id)} managers · {countRole(livreurs, z.id)} livreurs · {lmCount} points de repère</p> <div className={`flex justify-between items-center pt-4 ${isSel ? 'border-t border-primary-light/30' : 'border-t border-border-default'}`}> <span className="text-secondary text-text-tertiary">Frais de livraison</span> <span className="font-price text-price text-primary">{fmtFcfa(Number(z.km_prix ?? z.tarif_km ?? 0))}</span> </div> </div>
                  );
                })}
                </div>  <div className="col-span-10 lg:col-span-6 space-y-lg">  <div className="map-container h-[420px] card-shadow flex flex-col relative"> <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-border-default"> <p className="text-micro font-bold text-text-main uppercase">Visualisation Géo</p> <p className="text-secondary text-text-secondary">Cotonou, Bénin</p> </div>  <div className="w-full h-full relative" id="map-canvas"> <div className="absolute inset-0 bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i13!2i4835!3i3853!2m3!1e0!2sm!3i600000000!3m8!2sfr!3sbj!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!5f2')] opacity-40 mix-blend-multiply grayscale"></div>  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500">
                {polys.map((p) => (
                  <path key={String(p.id)} className={`zone-poly ${!creating && p.id === selId ? 'active' : ''}`} d={p.d}></path>
                ))}
                {lmPts.map((p) => (
                  <g key={String(p.id)}>
                    <circle cx={p.x} cy={p.y} fill="#9d4300" r="5" stroke="white" strokeWidth="2"></circle>
                    <text className="font-bold fill-primary-deep text-[12px]" x={p.x + 10} y={p.y + 4}>{p.nom}</text>
                  </g>
                ))}
              </svg>
                {polys.length === 0 && lmPts.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white/90 text-text-secondary text-label px-4 py-2 rounded-lg border border-border-default">Géométries non définies (polygone_geo / coordonnées vides)</span>
                  </div>
                )}
                </div> <div className="absolute bottom-4 right-4 flex gap-2"> <button className="bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-border-default hover:bg-app text-text-main"> <MIcon name="zoom_in" /> </button> <button className="bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-border-default hover:bg-app text-text-main"> <MIcon name="zoom_out" /> </button> <button className="bg-white px-md h-10 rounded-full flex items-center gap-2 shadow-md border border-border-default hover:bg-app text-text-main font-label"> <MIcon name="layers" />
                                Calques
                            </button> </div> </div>  <div className="bg-bg-card p-lg rounded-[14px] card-shadow"> <div className="flex items-center justify-between mb-md"> <h2 className="font-h2 text-h2 text-text-main">Points de repère — Zone {sel ? sel.nom : '—'}</h2> <button className="text-primary hover:text-primary-hover font-label flex items-center gap-1 group" onClick={() => void addLm()}> <MIcon name="add_circle" className="text-[18px]" />
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
                {!creating && sel && (
                  <button className="px-md py-2.5 text-error font-label hover:bg-error-light rounded-lg transition-colors" type="button" onClick={() => void delZone()}>Supprimer</button>
                )}
                <button className="px-md py-2.5 text-text-secondary font-label hover:bg-app rounded-lg transition-colors" type="button" onClick={resetForm}>Réinitialiser</button>
                <button className="bg-primary text-on-primary px-lg py-2.5 rounded-lg hover:bg-primary-hover active:scale-97 transition-all font-label" type="button" onClick={() => void saveZone()}>{creating ? 'Créer la zone' : 'Enregistrer les modifications'}</button>
              </div> </form> </div> </div> </div>
    </AdminLayout>
  );
}
