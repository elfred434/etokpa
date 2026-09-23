import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import MIcon from '../../shared/MIcon';

interface AdminSidebarProps {
  currentPath?: string;
}

export default function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activePath = currentPath || pathname;

  return (
    <aside
      className="bg-[#111827] text-white w-64 fixed left-0 top-0 h-screen flex flex-col py-md px-sm z-50 border-r border-outline-variant/10"
      style={{
        background: 'linear-gradient(rgb(36, 20, 14) 0%, rgb(26, 13, 7) 100%)',
        borderColor: 'rgba(249, 115, 22, 0.15)',
      }}
    >
      <div className="px-md mb-xl">
        <h1 className="font-h1 text-h1 text-white flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center text-white text-body font-bold">
            T
          </span>
          <span className="font-bold">
            TOK<span className="text-primary-container">Pa</span>
          </span>
        </h1>
        <p className="text-text-tertiary text-xs uppercase tracking-widest mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 space-y-1">
        <Link
          to="/admin/dashboard"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/dashboard'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="dashboard" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/admin/catalogue"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/catalogue'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="inventory_2" />
          <span>Catalogue</span>
        </Link>

        <Link
          to="/admin/categories"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/categories'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="category" />
          <span>Catégories</span>
        </Link>

        <Link
          to="/admin/zones"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/zones'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="map" />
          <span>Zones</span>
        </Link>

        <Link
          to="/admin/utilisateurs"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/utilisateurs'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="group" />
          <span>Utilisateurs</span>
        </Link>

        <Link
          to="/admin/validations"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/validations'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="fact_check" />
          <span>Validations</span>
        </Link>

        <Link
          to="/admin/logs"
          className={clsx(
            'flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg',
            activePath === '/admin/logs'
              ? 'bg-primary-tint text-primary-container font-bold'
              : 'text-text-tertiary hover:text-white hover:bg-white/5',
          )}
        >
          <MIcon name="history" />
          <span>Logs</span>
        </Link>
      </nav>

      <div className="mt-auto pt-md border-t border-white/10" style={{ borderColor: 'rgba(249, 115, 22, 0.15)' }}>
        <Link
          to="/admin/parametres"
          className="flex items-center gap-3 px-md py-3 text-text-tertiary hover:text-white hover:bg-white/5 transition-colors font-body"
        >
          <MIcon name="settings" />
          <span>Paramètres</span>
        </Link>
        <div className="flex items-center gap-3 px-md py-4 mt-2">
          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary font-bold">
            JD
          </div>
          <div className="overflow-hidden">
            <p className="text-body font-bold truncate">Jean Dupont</p>
            <p className="text-xs text-text-tertiary">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
