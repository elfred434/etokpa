import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { IconBell } from '@tabler/icons-react';
import NotificationItem from './NotificationItem';
import type { AppNotification } from '../../types/models';

interface NotificationBellProps {
  notifications: AppNotification[];
}

/** Cloche de la navbar : compteur non lues + panneau dropdown (F-20). */
export default function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
      >
        <IconBell size={20} />
        {unread > 0 && (
          <span className="absolute -right-[5px] -top-[7px] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop pour fermer au clic extérieur */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-sm w-[340px] overflow-hidden rounded-[14px] border-0.5 border-line bg-card shadow-lg">
            <div className="flex items-center justify-between border-b-0.5 border-line p-md">
              <span className="text-[13px] font-semibold text-ink">Notifications</span>
              <span className="text-[12px] text-ink-3">{unread} non lue{unread > 1 ? 's' : ''}</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.slice(0, 4).map((n) => (
                <NotificationItem key={n.id} notification={n} compact onClick={() => setOpen(false)} />
              ))}
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block bg-surface p-md text-center text-[13px] font-medium text-primary transition-colors hover:bg-primary-lighter"
            >
              Voir tout l'historique
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
