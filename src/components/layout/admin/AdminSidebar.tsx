import { Link, useRouterState } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';

interface AdminSidebarProps {
  currentPath?: string;
}

/** Items de navigation — copie conforme du design Stitch (admin). */
const NAV_ITEMS = [
  { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', to: '/admin' },
  { key: 'catalogue', icon: 'inventory_2', label: 'Catalogue', to: '/admin/catalogue' },
  { key: 'zones', icon: 'map', label: 'Zones', to: null },
  { key: 'utilisateurs', icon: 'group', label: 'Utilisateurs', to: null },
  { key: 'validations', icon: 'verified_user', label: 'Validations', to: null },
  { key: 'logs', icon: 'history', label: 'Logs', to: null },
] as const;

const PARAMS_ITEM = { key: 'parametres', icon: 'settings', label: 'Paramètres', to: null } as const;

const ACTIVE_CLASS =
  'flex items-center gap-3 px-4 py-3 bg-primary-tint text-primary-container rounded-lg font-bold transition-all duration-200 active:scale-[0.97]';
const IDLE_CLASS =
  'flex items-center gap-3 px-4 py-3 text-surface-variant hover:text-white transition-colors hover:bg-primary-hover/10 rounded-lg active:scale-[0.97]';

/**
 * AdminSidebar — chrome latéral admin, copie conforme du design Stitch
 * (`tableau_de_bord_global_admin_tokpa/code.html` — « SIDE NAV BAR »).
 */
export default function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activePath = currentPath || pathname;

  const isActive = (key: string) =>
    key === 'dashboard'
      ? activePath === '/admin' || activePath === '/admin/'
      : key === 'catalogue'
        ? activePath.startsWith('/admin/catalogue') || activePath.startsWith('/admin/categories')
        : activePath.startsWith(`/admin/${key}`);

  const renderItem = (item: { key: string; icon: string; label: string; to: string | null }) => {
    const cls = isActive(item.key) ? ACTIVE_CLASS : IDLE_CLASS;
    const inner = (
      <>
        <MIcon name={item.icon} />
        <span className="font-secondary text-body">{item.label}</span>
      </>
    );
    if (!item.to) {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => toast('Page statique — prochaine vague du lot admin')}
          className={`${cls} w-full text-left cursor-pointer`}
        >
          {inner}
        </button>
      );
    }
    return (
      <Link key={item.key} to={item.to} className={cls}>
        {inner}
      </Link>
    );
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 bg-inverse-surface border-r border-outline-variant flex flex-col p-md z-50"
      style={{ backgroundColor: 'rgb(31, 19, 11)', borderColor: 'rgba(249, 115, 22, 0.15)' }}
    >
      <div className="mb-xl px-4">
        <h1 className="text-h2 font-h2 font-bold text-primary-container tracking-tight">
          <span style={{ color: 'rgb(255, 255, 255)' }}>TOK</span>
          <span style={{ color: 'rgb(249, 115, 22)' }}>Pa</span>
        </h1>
        <p className="font-secondary text-label text-surface-variant opacity-70">Marketplace v2.0</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map(renderItem)}
        <div className="mt-auto pt-md">{renderItem(PARAMS_ITEM)}</div>
      </nav>

      <div
        className="mt-auto pt-md border-t border-white/10 px-2"
        style={{ borderColor: 'rgba(249, 115, 22, 0.15)' }}
      >
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white font-bold text-label">
            AT
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-label">Admin TOKPa</span>
            <span className="text-surface-variant text-micro opacity-70">Administrateur</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
