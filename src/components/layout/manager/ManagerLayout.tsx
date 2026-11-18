import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import MIcon from '../../shared/MIcon';
import MobileTableBridge from '../../shared/MobileTableBridge';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
} from '../../shared/DialogFrame';
import ManagerSidebar from './ManagerSidebar';
import RefreshButton from '../../shared/RefreshButton';
import SettingsLink from '../../shared/SettingsLink';
import LogoutButton from '../../shared/LogoutButton';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';
import { useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { currentRole, currentUserId, currentUserName, currentUserZone, isAdminRole, rememberUserZone, useAuthRevision } from '../../../routes/authGuard';
import UserAvatar from '../../shared/UserAvatar';
import { adminApi, catalogApi } from '../../../services/api';
import { listOf } from '../../../services/api/unwrap';
import { alertApiError } from '../../../utils/apiError';
import toast from 'react-hot-toast';


type Props = { children: ReactNode; currentPath: string };

export default function ManagerLayout({ children, currentPath }: Props) {
  useLanguage();
  useAuthRevision();
  const zone = currentUserZone();
  const nom = currentUserName();
  const admin = isAdminRole(currentRole());
  const refreshTick = useGlobalRefreshTick();
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
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
  }, [open, zone, refreshTick]);

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
    <div className="min-h-screen bg-bg-card text-on-surface">
      {navOpen && (
        <button
          type="button"
          aria-label={tx("Fermer")}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <ManagerSidebar currentPath={currentPath} open={navOpen} onClose={() => setNavOpen(false)} />
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[52px] items-center justify-between gap-2 border-b border-border-default bg-bg-card px-3 sm:px-lg lg:left-64">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-secondary lg:hidden"
            aria-label={tx("Menu")}
            onClick={() => setNavOpen(true)}
          >
            <MIcon name="menu" />
          </button>
          <MIcon name="location_on" className="shrink-0 text-primary text-[18px]" />
          <p className="truncate text-label font-semibold">{zone ? `Zone ${zone}` : tx("Zone non attribuée")}</p>
          {admin && (
            <button type="button" className="shrink-0 text-xs font-semibold text-primary hover:underline sm:text-label" aria-label={tx("Changer de zone")} onClick={() => setOpen(true)}>
              <MIcon name="edit" className="text-[16px] sm:hidden" />
              <span className="hidden sm:inline">{tx("Changer de zone")}</span>
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <RefreshButton withLabel />
            <SettingsLink to="/manager/parametres" />
          <LogoutButton className="lg:hidden" />
          <button
            type="button"
            className="hidden rounded-lg p-2 text-text-secondary hover:bg-bg-secondary hover:text-on-surface sm:block"
          >
            <MIcon name="notifications" className="text-[18px]" />
          </button>
          <Link
            to="/profil"
            aria-label={tx("Ouvrir le profil")}
            title={tx("Ouvrir le profil")}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-bg-secondary"
          >
            <UserAvatar name={nom} fallback="MG" className="h-8 w-8 bg-primary-tint text-overline text-primary" />
            <p className="hidden max-w-[140px] truncate text-label font-semibold sm:block">{nom ?? (admin ? tx("Administrateur") : 'Manager')}</p>
          </Link>
        </div>
      </header>
      <main id="manager-main" className="ml-0 space-y-lg px-4 pb-4 pt-[calc(52px+16px)] lg:ml-64 lg:px-lg lg:pb-lg lg:pt-[calc(52px+24px)]">{children}</main>
      <MobileTableBridge rootId="manager-main" />
      {admin && open && (
        <DialogFrame
          icon="location_on"
          title={tx("Changer de zone")}
          maxWidth="32rem"
          disabled={saving}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button
                type="button"
                className={DIALOG_CANCEL_BTN_CLASS}
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                {tx("Annuler")}
              </button>
              <button
                type="button"
                className={DIALOG_PRIMARY_BTN_CLASS}
                disabled={saving || !zoneId}
                onClick={() => void changerZone()}
              >
                {saving ? tx("Enregistrement…") : tx("Valider")}
              </button>
            </>
          }
        >
          <label className="block text-sm font-semibold text-text-main">
            {tx("Zone géographique")}
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border-default bg-bg-card px-3 py-2.5 text-sm text-text-main outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{tx("— Choisir une zone —")}</option>
              {zones.map((z) => (
                <option key={z.id} value={String(z.id)}>{z.nom}</option>
              ))}
            </select>
          </label>
        </DialogFrame>
      )}
    </div>
  );
}
