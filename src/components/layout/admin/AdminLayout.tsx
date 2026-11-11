import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import AdminSidebar from './AdminSidebar';
import MobileTableBridge from '../../shared/MobileTableBridge';
import MIcon from '../../shared/MIcon';
import AdminNotificationBell from './AdminNotificationBell';
import RefreshButton from '../../shared/RefreshButton';
import SettingsLink from '../../shared/SettingsLink';
import LogoutButton from '../../shared/LogoutButton';
import { useLanguage } from '../../../context/LanguageContext';
import { tr, tx } from '../../../i18n/tx';


interface AdminLayoutProps {
  children: ReactNode;
  currentPath?: string;
  mainClassName?: string;
}

/** Le décalage `ml-64` des pages Stitch ne doit pas coller le contenu sous la sidebar sur téléphone. */
function responsiveMain(mainClassName?: string) {
  const base = mainClassName ?? 'ml-64 pt-[52px] min-h-screen p-lg space-y-lg';
  return base
    .replace(/(^|\s)ml-64(?=\s|$)/g, '$1ml-0 lg:ml-64')
    .replace(/(^|\s)p-lg(?=\s|$)/g, '$1p-4 lg:p-lg')
    .replace(/(^|\s)h-screen(?=\s|$)/g, '$1min-h-screen lg:h-screen')
    .replace(/(^|\s)overflow-hidden(?=\s|$)/g, '$1overflow-x-auto lg:overflow-hidden');
}

/**
 * AdminLayout — chrome complet admin, copie conforme du design Stitch :
 * sidebar sombre + top bar fixe (recherche, notifications, aide, profil) + canvas.
 * Sous `lg`, la sidebar est un tiroir : le contenu prend toute la largeur.
 */
export default function AdminLayout({ children, currentPath, mainClassName }: AdminLayoutProps) {
  useLanguage();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const goToGlobalSearch = (scope: 'orders' | 'users') => {
    const q = globalSearch.trim();
    if (!q) return;
    setSearchOpen(false);
    setGlobalSearch('');
    void navigate({
      to: scope === 'orders' ? '/admin/commandes' : '/admin/utilisateurs',
      search: { q },
    });
  };
  const submitGlobalSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToGlobalSearch('orders');
  };
  return (
    <div className="bg-bg-app text-on-surface font-body min-h-screen">
      {navOpen && (
        <button
          type="button"
          aria-label={tx("Fermer")}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <AdminSidebar currentPath={currentPath} open={navOpen} onClose={() => setNavOpen(false)} />

      {/* TOP APP BAR */}
      <header className="fixed top-0 right-0 left-0 z-30 flex h-[52px] items-center justify-between gap-2 border-b border-border-default bg-bg-card px-3 sm:px-lg lg:left-64">
        <button
          type="button"
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-app lg:hidden"
          aria-label={tx("Menu")}
          onClick={() => setNavOpen(true)}
        >
          <MIcon name="menu" />
        </button>
        <div className="hidden min-w-0 flex-1 items-center md:flex md:max-w-xl">
          <div
            className="relative w-full"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false);
            }}
          >
            <form onSubmit={submitGlobalSearch} className="relative">
              <MIcon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="text"
                aria-label={tr('Rechercher une commande ou un utilisateur', 'Search orders or users')}
                aria-autocomplete="list"
                aria-controls="admin-global-search-options"
                aria-expanded={searchOpen && Boolean(globalSearch.trim())}
                placeholder={tr('Rechercher une commande ou un utilisateur…', 'Search orders or users…')}
                className="w-full rounded-lg border-none bg-bg-app py-1.5 pl-10 pr-4 text-label text-secondary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary-container focus:ring-opacity-20"
                value={globalSearch}
                onChange={(event) => {
                  setGlobalSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => event.key === 'Escape' && setSearchOpen(false)}
              />
            </form>
            {searchOpen && globalSearch.trim() && (
              <div
                id="admin-global-search-options"
                role="group"
                aria-label={tr('Choisir le type de résultat', 'Choose a search scope')}
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border-default bg-bg-card p-1 shadow-xl"
              >
                <button
                  type="button"
                  aria-label={tr('Rechercher dans les commandes', 'Search orders')}
                  onClick={() => goToGlobalSearch('orders')}
                  className="block w-full rounded-md px-3 py-2 text-left hover:bg-bg-app focus:bg-bg-app focus:outline-none"
                >
                  <span className="block text-label font-semibold">{tr('Commandes', 'Orders')}</span>
                  <span className="block truncate text-secondary text-text-secondary">{tr(`Rechercher « ${globalSearch.trim()} » dans les commandes`, `Search “${globalSearch.trim()}” in orders`)}</span>
                </button>
                <button
                  type="button"
                  aria-label={tr('Rechercher dans les utilisateurs', 'Search users')}
                  onClick={() => goToGlobalSearch('users')}
                  className="block w-full rounded-md px-3 py-2 text-left hover:bg-bg-app focus:bg-bg-app focus:outline-none"
                >
                  <span className="block text-label font-semibold">{tr('Utilisateurs', 'Users')}</span>
                  <span className="block truncate text-secondary text-text-secondary">{tr(`Rechercher « ${globalSearch.trim()} » dans les utilisateurs`, `Search “${globalSearch.trim()}” in users`)}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-md">
          <RefreshButton withLabel />
          <SettingsLink to="/admin/parametres" />
          <LogoutButton className="lg:hidden" />
          {/* Vraies notifications (GET /notifications) : compteur, liste, marquer comme lue */}
          <AdminNotificationBell
            className="cursor-pointer rounded-full p-2 text-text-secondary transition-all hover:bg-bg-app active:scale-[0.97]"
            icon={<MIcon name="notifications" />}
            dotClassName="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"
          />
          <button
            type="button"
            className="hidden cursor-pointer rounded-full p-2 text-text-secondary transition-all hover:bg-bg-app active:scale-[0.97] sm:block"
          >
            <MIcon name="help" />
          </button>
          <div className="mx-1 hidden h-8 w-[1px] bg-border-default sm:mx-2 sm:block" />
          <div className="flex items-center gap-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-micro font-bold text-primary-dark">
              AT
            </div>
            <span className="hidden font-secondary text-label font-bold text-primary sm:inline">{tx("Admin TOKPa")}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CANVAS */}
      <main id="admin-main" className={responsiveMain(mainClassName)}>{children}</main>
      <MobileTableBridge rootId="admin-main" />
    </div>
  );
}
