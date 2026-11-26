// Mise en page principale de l’espace livreur (navigation, statut, profil).
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import MIcon from '../../shared/MIcon';
import LogoutButton from '../../shared/LogoutButton';
import RefreshButton from '../../shared/RefreshButton';
import SettingsLink from '../../shared/SettingsLink';
import { currentUserName, useAuthRevision } from '../../../routes/authGuard';
import UserAvatar from '../../shared/UserAvatar';
import { fetchLivreurProfile } from '../../../pages/livreur/livreurData';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';
import { useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { usePreservedScroll } from '../../../hooks/usePreservedScroll';

const NAV: { to: '/livreur' | '/livreur/course' | '/livreur/messagerie' | '/livreur/historique' | '/livreur/parametres'; icon: string; label: string; short: string; exact: boolean }[] = [
  { to: '/livreur', icon: 'dashboard', label: 'Tableau de bord', short: 'Accueil', exact: true },
  { to: '/livreur/course', icon: 'local_shipping', label: 'Livraisons en cours', short: 'En cours', exact: false },
  { to: '/livreur/messagerie', icon: 'chat', label: 'Messagerie', short: 'Chat', exact: false },
  { to: '/livreur/historique', icon: 'history', label: 'Historique', short: 'Historique', exact: false },
  { to: '/livreur/parametres', icon: 'settings', label: 'Paramètres', short: 'Paramètres', exact: false },
];

// Composant de mise en page LivreurLayout.
export default function LivreurLayout({ children }: { children: ReactNode }) {
  useLanguage();
  useAuthRevision();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const refreshTick = useGlobalRefreshTick();
  const asideRef = usePreservedScroll<HTMLElement>('livreur-sidebar-aside');
  const nom = currentUserName();
  const [disponible, setDisponible] = useState<boolean | null>(null);

  // Charge ou synchronise les données depuis l’API au montage ou lors d’un changement de dépendance.
  useEffect(() => {
    let alive = true;
    fetchLivreurProfile(refreshTick > 0)
      .then((p) => alive && setDisponible(p.disponible))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [refreshTick]);

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname === to || pathname.startsWith(`${to}/`) || (to === '/livreur/course' && pathname.startsWith('/livreur/recapitulatif'));

  // Retourne le rendu JSX du composant.
  return (
    <div className="min-h-screen overflow-x-clip bg-bg-app font-body text-text-main">
      <aside ref={asideRef} className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col overflow-y-auto bg-[#F97316] text-white shadow-xl lg:flex">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-black tracking-tight text-white">TOKPa</h1>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/80">{tx("Portail Chauffeur")}</p>
          </div>
          <nav className="space-y-1.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to, item.exact) ? 'page' : undefined}
                className={
                  isActive(item.to, item.exact)
                    ? 'flex items-center gap-3 rounded-xl bg-bg-card px-4 py-2.5 font-bold text-[#F97316] shadow-sm transition-all'
                    : 'flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white'
                }
              >
                <MIcon name={item.icon} className="text-[20px]" />
                <span className="text-[14px]">{tx(item.label)}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto space-y-2 border-t border-white/15 p-6">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/80 transition-colors hover:text-white">
            <MIcon name="storefront" className="text-[20px]" />
            <span className="text-[14px] font-medium">{tx("Espace client")}</span>
          </Link>
          <Link to="/profil" className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/80 transition-colors hover:text-white">
            <MIcon name="account_circle" className="text-[20px]" />
            <span className="text-[14px] font-medium">{tx("Profil")}</span>
          </Link>
          <LogoutButton withLabel tone="inverse" className="w-full justify-start rounded-lg px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      <main className="min-h-screen min-w-0 max-w-full overflow-x-clip pb-20 lg:ml-64 lg:pb-0">
        <header className="sticky top-0 z-40 flex h-[52px] w-full items-center justify-between gap-2 border-b border-border-default bg-bg-card px-3 sm:px-lg">
          <span className="font-h1 text-h1 font-bold text-primary">TOKPa</span>
          <div className="flex min-w-0 items-center gap-2 sm:gap-lg">
            <RefreshButton withLabel />
            <LogoutButton className="shrink-0 lg:hidden" />
            <SettingsLink to="/livreur/parametres" />
            <Link to="/notifications" aria-label={tx("Notifications")} className="text-text-secondary transition-colors hover:text-primary">
              <MIcon name="notifications" />
            </Link>
            <Link
              to="/profil"
              aria-label={tx("Ouvrir le profil")}
              title={tx("Ouvrir le profil")}
              className="flex min-w-0 items-center gap-sm rounded-lg border-l border-border-default py-1 pl-2 pr-1 transition-colors hover:bg-bg-app sm:pl-lg"
            >
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate font-label text-label leading-none text-text-main">{nom ?? tx("Livreur")}</p>
                {disponible !== null && (
                  <p className={clsx('text-xs font-medium', disponible ? 'text-success' : 'text-text-secondary')}>
                    {disponible ? tx("Disponible") : tx("Indisponible")}
                  </p>
                )}
              </div>
              <UserAvatar
                name={nom}
                fallback="LV"
                className="h-8 w-8 bg-primary-tint text-xs text-primary ring-2 ring-primary-container"
              />
            </Link>
          </div>
        </header>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border-default bg-bg-card lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium',
              isActive(item.to, item.exact) ? 'text-[#F97316]' : 'text-text-secondary',
            )}
          >
            <MIcon name={item.icon} className="text-[22px]" />
            <span className="max-w-full truncate">{tx(item.short)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
