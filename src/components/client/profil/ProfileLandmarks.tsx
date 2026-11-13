import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';
import { adminDialogs } from '../../shared/AdminActionDialogs';
import { catalogApi, landmarksApi, type ApiZone } from '../../../services/api';
import { listOf, unwrap } from '../../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../../utils/apiError';
import { useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { tx } from '../../../i18n/tx';

interface LandmarkItem {
  id: string;
  nom: string;
  description: string;
  zoneId: number | null;
  zoneNom?: string;
  isDefault: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Points de repère du compte : lecture, ajout et suppression via l'API réelle. */
export default function ProfileLandmarks() {
  const [landmarks, setLandmarks] = useState<LandmarkItem[]>([]);
  const [zones, setZones] = useState<ApiZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const refreshTick = useGlobalRefreshTick();
  const [form, setForm] = useState({ nom: '', description: '', zoneId: '' });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([landmarksApi.getLandmarks(), catalogApi.getZones()])
      .then(([landmarkResult, zoneResult]) => {
        if (!alive) return;
        if (landmarkResult.status === 'fulfilled') {
          const rows = listOf(unwrap(landmarkResult.value));
          setLandmarks(rows
            .filter((row: any) => row?.id != null)
            .map((row: any) => {
              const rawZone = Number(row.zone_id ?? row.zone?.id);
              return {
                id: String(row.id),
                nom: String(row.nom ?? tx('Point de repère')),
                description: String(row.description ?? ''),
                zoneId: Number.isInteger(rawZone) && rawZone > 0 ? rawZone : null,
                zoneNom: typeof row.zone?.nom === 'string' ? row.zone.nom : undefined,
                isDefault: row.is_default === true,
              } satisfies LandmarkItem;
            }));
        } else {
          setLandmarks([]);
          setError(formatApiError(extractApiError(landmarkResult.reason)));
        }
        if (zoneResult.status === 'fulfilled') {
          setZones(listOf(unwrap(zoneResult.value)) as ApiZone[]);
        } else {
          setZones([]);
        }
      })
      .catch((cause) => alive && setError(formatApiError(extractApiError(cause))))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [reloadKey, refreshTick]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const zoneId = Number(form.zoneId);
    if (!form.nom.trim() || !form.description.trim() || !Number.isInteger(zoneId) || zoneId <= 0) {
      setError(tx('Renseignez le nom, la description et la zone du point de repère.'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await landmarksApi.createLandmark({
        nom: form.nom.trim(),
        description: form.description.trim(),
        zone_id: zoneId,
      });
      setAddOpen(false);
      setForm({ nom: '', description: '', zoneId: '' });
      toast.success(tx('Point de repère ajouté.'));
      setReloadKey((key) => key + 1);
    } catch (cause) {
      const message = formatApiError(extractApiError(cause));
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (landmark: LandmarkItem) => {
    const confirmed = await adminDialogs.confirm(
      tx(`Supprimer le point de repère « ${landmark.nom} » ?`),
      { title: tx('Confirmer la suppression'), confirmLabel: tx('Supprimer'), danger: true },
    );
    if (!confirmed) return;

    setDeletingId(landmark.id);
    setError(null);
    try {
      await landmarksApi.deleteLandmark(landmark.id);
      toast.success(tx('Point de repère supprimé.'));
      setReloadKey((key) => key + 1);
    } catch (cause) {
      const message = formatApiError(extractApiError(cause));
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const zoneName = (landmark: LandmarkItem) =>
    zones.find((zone) => Number(zone.id) === landmark.zoneId)?.nom ?? landmark.zoneNom ?? (landmark.zoneId ? `#${landmark.zoneId}` : '—');

  return (
    <section className="mb-md rounded-[14px] border border-border-default bg-bg-card p-lg shadow-xs" aria-labelledby="profile-landmarks-title">
      <div className="mb-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="profile-landmarks-title" className="font-h3 text-h3 font-bold text-text-main">{tx('Mes points de repère')}</h3>
          <p className="mt-1 text-label text-text-secondary">{tx('Enregistrez les lieux utilisés pour vos livraisons.')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setForm({ nom: '', description: '', zoneId: zones[0] ? String(zones[0].id) : '' });
            setAddOpen(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <MIcon name="add_location_alt" className="text-[18px]" />
          {tx('Ajouter un point de repère')}
        </button>
      </div>

      {error && (
        <div className="mb-md rounded-lg border border-error bg-error-container p-3 text-label text-on-error-container" role="alert">
          <p className="font-bold">{tx('Erreur API')}</p>
          <p>{error}</p>
        </div>
      )}
      {loading && <p className="text-label text-text-secondary" role="status">{tx('Chargement des points de repère…')}</p>}
      {!loading && landmarks.length === 0 && !error && (
        <p className="rounded-lg bg-bg-secondary p-4 text-label text-text-secondary">{tx('Aucun point de repère enregistré.')}</p>
      )}

      <div className="space-y-3">
        {landmarks.map((landmark) => (
          <div key={landmark.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border-default p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                <MIcon name="location_on" className="text-[20px]" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-semibold text-text-main">{landmark.nom}</span>
                  {landmark.isDefault && <span className="rounded-full bg-success-light px-2 py-0.5 text-micro font-bold text-success-dark">{tx('Par défaut')}</span>}
                </div>
                <p className="break-words text-label text-text-secondary">{landmark.description}</p>
                <span className="mt-1 inline-block rounded-md bg-bg-secondary px-2 py-0.5 text-micro text-text-secondary">{zoneName(landmark)}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label={`${tx('Supprimer le repère')} ${landmark.nom}`}
              disabled={deletingId != null}
              onClick={() => void handleDelete(landmark)}
              className="btn btn-ghost self-end text-error disabled:opacity-50 sm:self-auto"
            >
              <MIcon name={deletingId === landmark.id ? 'hourglass_top' : 'delete'} className="text-[18px]" />
              {deletingId === landmark.id ? tx('Suppression…') : tx('Supprimer')}
            </button>
          </div>
        ))}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setAddOpen(false)}>
          <div
            className="w-full max-w-[480px] rounded-2xl bg-bg-card p-lg shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-landmark-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-md flex items-center justify-between border-b border-border-default pb-3">
              <h3 id="profile-landmark-dialog-title" className="font-h2 text-h2 font-bold text-text-main">{tx('Ajouter un point de repère')}</h3>
              <button type="button" aria-label={tx('Fermer')} onClick={() => setAddOpen(false)} className="rounded-full p-2 text-text-secondary hover:bg-bg-secondary">
                <MIcon name="close" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-label font-medium text-text-secondary">{tx('Nom du lieu')}</span>
                <input
                  type="text"
                  value={form.nom}
                  maxLength={120}
                  required
                  onChange={(event) => setForm((value) => ({ ...value, nom: event.target.value }))}
                  className="w-full rounded-lg border border-border-default bg-bg-card px-3 py-2 text-body text-text-main"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-label font-medium text-text-secondary">{tx('Description / précisions')}</span>
                <textarea
                  rows={3}
                  value={form.description}
                  maxLength={500}
                  required
                  onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
                  className="w-full rounded-lg border border-border-default bg-bg-card px-3 py-2 text-body text-text-main"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-label font-medium text-text-secondary">{tx('Zone de livraison')}</span>
                <select
                  value={form.zoneId}
                  required
                  disabled={zones.length === 0}
                  onChange={(event) => setForm((value) => ({ ...value, zoneId: event.target.value }))}
                  className="w-full rounded-lg border border-border-default bg-bg-card px-3 py-2 text-body text-text-main disabled:opacity-60"
                >
                  <option value="">{tx('Choisir une zone…')}</option>
                  {zones.map((zone) => <option key={zone.id} value={String(zone.id)}>{zone.nom}</option>)}
                </select>
                {zones.length === 0 && <span className="text-micro text-error">{tx('Les zones de livraison ne sont pas disponibles.')}</span>}
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={saving} onClick={() => setAddOpen(false)} className="btn btn-ghost flex-1">
                  {tx('Annuler')}
                </button>
                <button type="submit" disabled={saving || zones.length === 0} className="btn btn-primary flex-1 disabled:opacity-50">
                  {saving ? tx('Enregistrement…') : tx('Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
