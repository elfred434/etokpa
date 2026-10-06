import { useState, type ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import MIcon from '../../shared/MIcon';
import AdminNotificationBell from './AdminNotificationBell';
import LangToggle from '../../shared/LangToggle';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';


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
  const [navOpen, setNavOpen] = useState(false);
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
      <header className="fixed top-0 right-0 left-0 z-30 flex h-[52px] items-center justify-between gap-2 border-b border-border-default bg-white px-3 sm:px-lg lg:left-64">
        <button
          type="button"
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-app lg:hidden"
          aria-label={tx("Menu")}
          onClick={() => setNavOpen(true)}
        >
          <MIcon name="menu" />
        </button>
        <div className="hidden min-w-0 flex-1 items-center md:flex md:max-w-xl">
          <div className="relative w-full">
            <MIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              placeholder={tx("Rechercher une commande, un utilisateur...")}
              className="w-full rounded-lg border-none bg-bg-app py-1.5 pl-10 pr-4 text-label text-secondary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary-container focus:ring-opacity-20"
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-md">
          <LangToggle />
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
      <main className={responsiveMain(mainClassName)}>{children}</main>
    </div>
  );
}
