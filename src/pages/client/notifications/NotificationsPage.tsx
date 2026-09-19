import { useState } from 'react';
import clsx from 'clsx';
import {
  IconLayoutGrid,
  IconShoppingBag,
  IconTag,
  IconShieldCheck,
  IconChecks,
  IconBulb,
} from '@tabler/icons-react';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import NotificationItem from '../../../components/shared/NotificationItem';
import Pagination from '../../../components/shared/Pagination';
import { NOTIFICATIONS } from '../../../constants/mockData';
import type { NotificationType } from '../../../types/models';

type FilterKey = 'all' | NotificationType;

const FILTERS: { key: FilterKey; label: string; icon: typeof IconLayoutGrid }[] = [
  { key: 'all', label: 'Toutes', icon: IconLayoutGrid },
  { key: 'order', label: 'Commandes', icon: IconShoppingBag },
  { key: 'promo', label: 'Promotions', icon: IconTag },
  { key: 'security', label: 'Sécurité', icon: IconShieldCheck },
];

/** Page « Historique des notifications » — maquette Stitch (sidebar filtres + liste + pagination). */
export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [page, setPage] = useState(1);

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);
  const unread = notifications.filter((n) => n.unread).length;

  const markAllRead = () => setNotifications((list) => list.map((n) => ({ ...n, unread: false })));

  return (
    <div className="min-h-screen bg-page pt-[52px]">
      <ClientNavbar searchPlaceholder="Search notifications…" />

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar filtres */}
        <aside className="sticky top-[52px] hidden h-[calc(100vh-52px)] w-[260px] shrink-0 flex-col justify-between border-r border-line bg-surface p-md md:flex">
          <div>
            <p className="micro mb-md px-sm">Filtres</p>
            <ul className="space-y-xs">
              {FILTERS.map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setFilter(key)}
                    className={clsx(
                      'flex w-full items-center gap-sm rounded-[10px] px-md py-[10px] text-[14px] transition-colors duration-150',
                      filter === key
                        ? 'bg-primary-lighter font-medium text-primary'
                        : 'text-ink-2 hover:bg-card hover:text-ink',
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[12px] border border-[#FDE68A] bg-amber-light p-md">
            <p className="flex items-center gap-sm text-[13px] font-semibold text-primary-dark">
              <IconBulb size={16} />
              Astuce TOKPa
            </p>
            <p className="mt-sm text-[13px] text-ink-2">
              Activez les notifications SMS pour ne manquer aucune négociation en direct.
            </p>
          </div>
        </aside>

        {/* Liste */}
        <main className="min-w-0 flex-1 p-md md:p-xl">
          <div className="mb-md flex flex-wrap items-start justify-between gap-md md:mb-lg">
            <div>
              <h1 className="text-h2 text-ink md:text-h1">Historique des notifications</h1>
              <p className="mt-xs text-[13px] text-ink-2">
                {unread > 0 ? `Vous avez ${unread} notifications non lues` : 'Aucune notification non lue'}
              </p>
            </div>
            <button type="button" onClick={markAllRead} className="btn btn-ghost text-xs md:text-sm" disabled={unread === 0}>
              <IconChecks size={18} />
              Tout marquer comme lu
            </button>
          </div>

          {/* Mobile Filter Tabs */}
          <div className="mb-md flex gap-2 overflow-x-auto pb-1 md:hidden">
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === key ? 'bg-primary font-semibold text-white' : 'bg-white text-ink-2 border border-line',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-md">
            {filtered.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>

          <Pagination page={page} pageCount={8} onChange={setPage} className="mt-xl" />
        </main>
      </div>
    </div>
  );
}
