import { useEffect, useState, type ReactNode } from 'react';
import MIcon from '../../shared/MIcon';
import ManagerSidebar from './ManagerSidebar';
import LangToggle from '../../shared/LangToggle';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';
import { currentRole, currentUserId, currentUserName, currentUserZone, initialsOf, isAdminRole, rememberUserZone } from '../../../routes/authGuard';
import { adminApi, catalogApi } from '../../../services/api';
import { listOf } from '../../../services/api/unwrap';
import { alertApiError } from '../../../utils/apiError';
import toast from 'react-hot-toast';


type Props = { children: ReactNode; currentPath: string };

export default function ManagerLayout({ children, currentPath }: Props) {
  useLanguage();
  const zone = currentUserZone();
  const nom = currentUserName();
  const admin = isAdminRole(currentRole());
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<{ id: number; nom: string }[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    catalogApi.getZones()
      .then((res) => {
        const rows = listOf(res).map((z: { id?: number; nom?: string }) => ({ id: Number(z.id), nom: String(z.nom ?? '') }));
        setZones(rows.filter((z) => z.id > 0));
        const actuelle = rows.find((z) => z.nom === zone);
        setZoneId(actuelle ? String(actuelle.id) : '');
      })
      .catch((e) => alertApiError(e, 'manager-zones'));
  }, [open, zone]);

  const changerZone = async () => {
    const id = currentUserId();
    if (!id) {
      toast.error(tx("Session expirée, reconnectez-vous"));
      return;
    }
    if (!zoneId) return;
    setSaving(true);
    try {
      await adminApi.setManagerZone(id, Number(zoneId));
      rememberUserZone(Number(zoneId), zones.find((z) => String(z.id) === zoneId)?.nom);
      window.location.reload();
    } catch (e) {
      alertApiError(e, 'manager-zone-save');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-on-surface">
      <ManagerSidebar currentPath={currentPath} />
      <header className="fixed left-64 right-0 top-0 z-40 flex h-[52px] items-center justify-between border-b border-border-default bg-bg-primary px-lg">
        <div className="flex items-center gap-2">
          <MIcon name="location_on" className="text-primary text-[18px]" />
          <p className="text-label font-semibold">{zone ? `Zone ${zone}` : tx("Zone non attribuée")}</p>
          {admin && (
            <button type="button" className="text-label font-semibold text-primary hover:underline" onClick={() => setOpen(true)}>
              {tx("Changer de zone")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-secondary hover:text-on-surface"
          >
            <MIcon name="notifications" className="text-[18px]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-overline font-bold text-primary">
              {initialsOf(nom, 'MG')}
            </div>
            <p className="text-label font-semibold">{nom ?? (admin ? tx("Administrateur") : 'Manager')}</p>
          </div>
        </div>
      </header>
      <main className="ml-64 space-y-lg p-lg pt-[calc(52px+16px)]">{children}</main>
      {admin && open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[512px] rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-h3 font-h3 font-bold">{tx("Changer de zone")}</h2>
            <label className="mt-4 block text-label font-semibold">
              {tx("Zone géographique")}
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border-default bg-white px-3 py-2 text-label"
              >
                <option value="">{tx("— Choisir une zone —")}</option>
                {zones.map((z) => (
                  <option key={z.id} value={String(z.id)}>{z.nom}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{tx("Annuler")}</button>
              <button type="button" className="btn btn-primary" disabled={saving || !zoneId} onClick={() => void changerZone()}>
                {saving ? tx("Enregistrement…") : tx("Valider")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
