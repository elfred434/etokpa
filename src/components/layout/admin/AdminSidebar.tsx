import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import MIcon from '../../shared/MIcon';
import toast from 'react-hot-toast';

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
        <button
          type="button"
          onClick={() => toast("Module en cours de développement — API backend prête, page frontend à l'étape 3")}
          className="flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MIcon name="dashboard" />
          <span>Dashboard</span>
        </button>

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

        <button
          type="button"
          onClick={() => toast("Module en cours de développement — API backend prête, page frontend à l'étape 3")}
          className="flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MIcon name="map" />
          <span>Zones</span>
        </button>

        <button
          type="button"
          onClick={() => toast("Module en cours de développement — API backend prête, page frontend à l'étape 3")}
          className="flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MIcon name="group" />
          <span>Utilisateurs</span>
        </button>

        <button
          type="button"
          onClick={() => toast("Module en cours de développement — API backend prête, page frontend à l'étape 3")}
          className="flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MIcon name="fact_check" />
          <span>Validations</span>
        </button>

        <button
          type="button"
          onClick={() => toast("Module en cours de développement — API backend prête, page frontend à l'étape 3")}
          className="flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MIcon name="history" />
          <span>Logs</span>
        </button>
      </nav>

      <div className="mt-auto pt-md border-t border-white/10" style={{ borderColor: 'rgba(249, 115, 22, 0.15)' }}>
        <button
          type="button"
          onClick={() => toast("Module en cours de développement — API backend prête, page frontend à l'étape 3")}
          className="flex items-center gap-3 px-md py-3 font-body text-body transition-colors rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <MIcon name="settings" />
          <span>Paramètres</span>
        </button>
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
