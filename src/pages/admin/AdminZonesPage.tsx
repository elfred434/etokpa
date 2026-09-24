import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { adminApi } from '../../services/api';
import { unwrap, listOf, fmtFcfa } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lm, setLm] = useState<any | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', latitude: '', longitude: '' });

  const charger = () => {
    setLoading(true);
    setErr(null);
    Promise.all([adminApi.getZones(), adminApi.getLandmarks()])
      .then(([z, l]) => {
        setZones(listOf(unwrap(z)));
        setLandmarks(listOf(unwrap(l)));
      })
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enregistrerLm = async () => {
    setErr(null);
    setInfo(null);
    try {
      if (lm?.id) {
        await adminApi.updateLandmark(lm.id, form);
        setInfo(`Point de repère « ${form.nom} » mis à jour.`);
      } else {
        await adminApi.createLandmark(form);
        setInfo(`Point de repère « ${form.nom} » créé.`);
      }
      setLm(null);
      setForm({ nom: '', description: '', latitude: '', longitude: '' });
      charger();
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  const supprimerLm = async (id: number) => {
    setErr(null);
    setInfo(null);
    try {
      await adminApi.deleteLandmark(id);
      setInfo(`Point de repère #${id} supprimé.`);
      charger();
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  return (
    <AdminLayout currentPath="/admin/zones">
      <div className="space-y-6">
        <div>
          <h1 className="text-h2 font-h2 font-bold">Gestion des Zones</h1>
          <p className="text-text-secondary">Données réelles — /admin/zones + /admin/landmarks</p>
        </div>

        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}
        {info && <div className="rounded-lg border border-success bg-success-container p-4 text-label">{info}</div>}
        {loading && <p className="text-label text-text-secondary">Chargement…</p>}

        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          <div className="border-b border-border-default px-lg py-4">
            <h2 className="text-h3 font-h3 font-bold">Zones de livraison</h2>
          </div>
          {!loading && zones.length === 0 && <p className="p-lg text-label text-text-secondary">Aucune zone.</p>}
          {zones.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-label">
                <thead>
                  <tr className="bg-bg-secondary text-left text-text-secondary">
                    <th className="px-lg py-3 font-semibold">Nom</th>
                    <th className="px-lg py-3 font-semibold">Ouverte</th>
                    <th className="px-lg py-3 font-semibold">Min prix</th>
                    <th className="px-lg py-3 font-semibold">Prix / km</th>
                    <th className="px-lg py-3 font-semibold">Majoration heure</th>
                    <th className="px-lg py-3 font-semibold">Repères</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z: any) => (
                    <tr key={z.id} className="border-t border-border-default">
                      <td className="px-lg py-3 font-semibold">{z.nom}</td>
                      <td className="px-lg py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-overline font-semibold ${
                            z.open_zone ? 'bg-success-container text-on-surface' : 'bg-bg-secondary text-text-secondary'
                          }`}
                        >
                          {z.open_zone ? 'Ouverte' : 'Fermée'}
                        </span>
                      </td>
                      <td className="px-lg py-3">{fmtFcfa(z.min_prix)}</td>
                      <td className="px-lg py-3">{fmtFcfa(z.km_prix ?? z.tarif_km)}</td>
                      <td className="px-lg py-3">{z.maj_heure ?? '—'}</td>
                      <td className="px-lg py-3">{Array.isArray(z.points_repere) ? z.points_repere.length : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border-default px-lg py-4">
            <h2 className="text-h3 font-h3 font-bold">Points de repère</h2>
            <button
              type="button"
              className="btn btn-primary gap-2"
              onClick={() => {
                setLm({});
                setForm({ nom: '', description: '', latitude: '', longitude: '' });
              }}
            >
              <MIcon name="add" className="text-[18px]" />
              Nouveau repère
            </button>
          </div>
          {!loading && landmarks.length === 0 && (
            <p className="p-lg text-label text-text-secondary">Aucun point de repère.</p>
          )}
          {landmarks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-label">
                <thead>
                  <tr className="bg-bg-secondary text-left text-text-secondary">
                    <th className="px-lg py-3 font-semibold">Nom</th>
                    <th className="px-lg py-3 font-semibold">Description</th>
                    <th className="px-lg py-3 font-semibold">Latitude</th>
                    <th className="px-lg py-3 font-semibold">Longitude</th>
                    <th className="px-lg py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {landmarks.map((l: any) => (
                    <tr key={l.id} className="border-t border-border-default">
                      <td className="px-lg py-3 font-semibold">{l.nom}</td>
                      <td className="px-lg py-3 text-text-secondary">{l.description ?? ''}</td>
                      <td className="px-lg py-3">{l.latitude ?? '—'}</td>
                      <td className="px-lg py-3">{l.longitude ?? '—'}</td>
                      <td className="px-lg py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="font-semibold text-primary hover:underline"
                            onClick={() => {
                              setLm(l);
                              setForm({
                                nom: l.nom ?? '',
                                description: l.description ?? '',
                                latitude: l.latitude != null ? String(l.latitude) : '',
                                longitude: l.longitude != null ? String(l.longitude) : '',
                              });
                            }}
                          >
                            Modifier
                          </button>
                          <button type="button" className="font-semibold text-error hover:underline" onClick={() => supprimerLm(l.id)}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {lm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setLm(null)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">{lm.id ? `Repère #${lm.id}` : 'Nouveau repère'}</h3>
              <button type="button" onClick={() => setLm(null)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {[
                { k: 'nom' as const, label: 'Nom' },
                { k: 'description' as const, label: 'Description' },
                { k: 'latitude' as const, label: 'Latitude' },
                { k: 'longitude' as const, label: 'Longitude' },
              ].map((f) => (
                <div key={f.k} className="space-y-1">
                  <label className="text-label text-text-secondary">{f.label}</label>
                  <input
                    type="text"
                    value={form[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className="w-full rounded-lg border border-border-default px-3 py-2 text-label"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setLm(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={enregistrerLm}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
