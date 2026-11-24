// Cloche de notifications avec menu déroulant pour les espaces admin et manager.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import NotificationItem from '../../shared/NotificationItem';
import { notificationsApi, type ApiNotification } from '../../../services/api';
import { subscribeRealtimeRefresh } from '../../../hooks/useRealtimeNotifications';
import { describeNotification, formatTime } from '../../../utils/notificationText';
import { alertApiError } from '../../../utils/apiError';
import type { AppNotification } from '../../../types/models';
import { useLanguage } from '../../../context/LanguageContext';
import { tr, tx } from '../../../i18n/tx';

interface AdminNotificationBellProps {
  className: string;
  icon: ReactNode;
  dotClassName?: string;
}

// Composant React AdminNotificationBell : prépare l’état et affiche son interface.
export default function AdminNotificationBell({ className, icon, dotClassName = 'absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full' }: AdminNotificationBellProps) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    notificationsApi
      .getNotifications(1)
      .then((res) => {
        const list: ApiNotification[] = res?.data ?? (Array.isArray(res) ? res : []);
        setItems(
          list.map((n) => {
            const d = describeNotification(n, true);
            return { id: String(n.id), type: d.type, title: d.title, message: d.message, time: formatTime(n.created_at, true), unread: n.lu === false };
          }),
        );
      })
      .catch((e) => alertApiError(e, 'admin-notifications'));
  }, []);

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    load();
    return subscribeRealtimeRefresh(['notifications'], load);
  }, [load]);

  const unread = items.filter((n) => n.unread).length;

  // Helper markRead : réalise le traitement métier associé.
  const markRead = (n: AppNotification) => {
    setOpen(false);
    if (!n.unread) return;
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    notificationsApi.markRead(n.id).catch((e) => alertApiError(e, 'admin-notifications'));
  };

  // Retourne le rendu JSX du composant.
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? tr(`Notifications (${unread} non lues)`, `Notifications (${unread} unread)`) : tx("Notifications")}
        className={`relative ${className}`}
      >
        {icon}
        {unread > 0 && <span className={dotClassName} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-3 top-[58px] z-50 overflow-hidden rounded-[14px] border-0.5 border-line bg-card shadow-lg sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-sm sm:w-[340px]">
            <div className="flex items-center justify-between border-b-0.5 border-line p-md">
              <span className="text-[13px] font-semibold text-ink">{tx("Notifications")}</span>
              <span className="text-[12px] text-ink-3">
                {tr(unread > 1 ? `${unread} non lues` : `${unread} non lue`, `${unread} unread`)}
              </span>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {items.length === 0 && <p className="p-md text-center text-[13px] text-ink-3">{tx("Aucune notification.")}</p>}
              {items.slice(0, 6).map((n) => (
                <NotificationItem key={n.id} notification={n} compact onClick={() => markRead(n)} />
              ))}
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block bg-surface p-md text-center text-[13px] font-medium text-primary transition-colors hover:bg-primary-lighter"
            >
              {tx("Voir tout l'historique")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
