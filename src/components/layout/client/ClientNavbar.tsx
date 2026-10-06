import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import MIcon from '../../shared/MIcon';
import { useAppSelector } from '../../../hooks/useStore';
import { selectCount } from '../../../store/slices/cart/cartSlice';
import { useLanguage } from '../../../context/LanguageContext';
import { currentRole, currentUserName, hasSession, initialsOf, staffSpace, useAuthRevision } from '../../../routes/authGuard';
import { tx } from '../../../i18n/tx';


interface ClientNavbarProps {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}

/**
 * Navbar cliente unique — copie conforme de la TopNavBar du code.html « accueil_tokpa »
 * (utilisée sur toutes les pages client : accueil, catalogue, fiche produit, panier…).
 * fixed 52px, fond #fff8f6, logo + liens, recherche pillule #fff1eb, icônes #9d4300, sélecteur de langue FR/EN.
 */
export default function ClientNavbar({ search, onSearch, searchPlaceholder }: ClientNavbarProps) {
  useLanguage();
  const cartCount = useAppSelector((s) => selectCount(s.cart.items));
  const negotiations = useAppSelector((s) => s.negotiation.history);
  const activeNegoCount = negotiations.filter((n) => n.status === 'accepted' || n.status === 'counter_offer').length;

  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { language, toggleLanguage, t } = useLanguage();
  useAuthRevision();
  const [localSearch, setLocalSearch] = useState('');
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  const onMarket = pathname === '/' || pathname.startsWith('/catalogue') || pathname.startsWith('/produit');
  // La recherche ne s'affiche que sur /catalogue (elle alimente les filtres de cette page).
  const onCatalog = pathname.startsWith('/catalogue');
  const onNegociations = pathname.startsWith('/negociations');
  const onCommandes = pathname.startsWith('/commandes');
  const onPaiements = pathname.startsWith('/paiements');
  const space = hasSession() ? staffSpace(currentRole()) : null;

  const submitSearch = (e: FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const q = (search ?? localSearch).trim();
    if (q) navigate({ to: '/catalogue', search: { q } });
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-line bg-warm">
      <div className="mx-auto flex h-[52px] w-full max-w-[1200px] items-center justify-between gap-2 px-3 sm:px-4">
        {/* Logo + liens */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-lg">
          <button
            type="button"
            className="rounded-lg p-1 text-primary-shade md:hidden"
            aria-label={tx("Menu")}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            <MIcon name={menu ? 'close' : 'menu'} />
          </button>
          <Link to="/" className="font-h2 text-h2 tracking-tight text-primary-shade">
            TOKPa
          </Link>
          <nav className="hidden gap-md md:flex">
            <Link
              to="/catalogue"
              className={clsx(
                'py-3 font-body text-body transition-colors',
                onMarket
                  ? 'border-b-2 border-primary-shade font-bold text-primary-shade'
                  : 'rounded px-2 text-on-surface-variant hover:bg-primary-lighter',
              )}
            >
              {t('nav.market')}
            </Link>
            <Link
              to="/negociations"
              className={clsx(
                'relative py-3 font-body text-body transition-colors',
                onNegociations
                  ? 'border-b-2 border-primary-shade font-bold text-primary-shade'
                  : 'rounded px-2 text-on-surface-variant hover:bg-primary-lighter',
              )}
            >
              {t('nav.negotiations')}
              {activeNegoCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {activeNegoCount}
                </span>
              )}
            </Link>
            <Link
              to="/commandes"
              className={clsx(
                'py-3 font-body text-body transition-colors',
                onCommandes
                  ? 'border-b-2 border-primary-shade font-bold text-primary-shade'
                  : 'rounded px-2 text-on-surface-variant hover:bg-primary-lighter',
              )}
            >
              {t('nav.orders')}
            </Link>
            <Link
              to="/paiements"
              className={clsx(
                'py-3 font-body text-body transition-colors',
                onPaiements
                  ? 'border-b-2 border-primary-shade font-bold text-primary-shade'
                  : 'rounded px-2 text-on-surface-variant hover:bg-primary-lighter',
              )}
            >
              {tx("Paiements")}
            </Link>
          </nav>
        </div>

        {/* Recherche (pillule) — visible uniquement sur /catalogue */}
        {onCatalog && (
          <form onSubmit={submitSearch} className="mx-8 hidden max-w-1xl flex-1 lg:block">
            <div className="relative flex items-center rounded-full border border-line bg-warm-low px-4 py-1.5">
              <MIcon name="search" className="mr-2 text-ink-3" />
              <input
                type="text"
                value={search ?? localSearch}
                onChange={(e) => (onSearch ? onSearch(e.target.value) : setLocalSearch(e.target.value))}
                placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
                className="w-full border-none bg-transparent p-0 text-ink-2 focus:outline-none focus:ring-0 text-xs sm:text-sm"
              />
            </div>
          </form>
        )}

        {/* Icônes & Sélecteur de langue */}
        <div className="flex shrink-0 items-center gap-1 text-primary-shade sm:gap-md">
          {/* Bouton de bascule de langue FR / EN */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={language === 'fr' ? 'Switch to English' : tx("Passer en Français")}
            className="flex items-center gap-1 rounded-full border border-primary-light bg-primary-lighter px-2.5 py-1 text-xs font-bold text-primary-shade transition-transform active:scale-95"
          >
            <MIcon name="language" className="text-[16px]" />
            <span className="hidden uppercase min-[400px]:inline">{language}</span>
          </button>

          <Link to="/notifications" className="scale-interaction" aria-label={tx("Notifications")}>
            <MIcon name="notifications" />
          </Link>
          <Link to="/panier" className="scale-interaction relative" aria-label={tx("Panier")}>
            <MIcon name="shopping_cart" />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />}
          </Link>
          {space && (
            <Link to={space.to} className="scale-interaction" aria-label={tx(space.label)} title={tx(space.label)}>
              <MIcon name={space.icon} />
            </Link>
          )}
          <Link
            to="/profil"
            className="scale-interaction"
            aria-label={hasSession() ? tx("Profil") : tx("Se connecter")}
            title={hasSession() ? tx("Profil") : tx("Se connecter")}
          >
            <MIcon name={hasSession() ? "account_circle" : "login"} />
          </Link>
        </div>
      </div>
      {menu && createPortal(
        <>
        <button
          type="button"
          aria-label={tx("Fermer")}
          className="fixed inset-0 z-[80] bg-black/50 md:hidden"
          onClick={() => setMenu(false)}
        />
      <aside
        className="fixed left-0 top-0 z-[90] flex h-full w-64 flex-col overflow-y-auto border-r border-line bg-warm p-md md:hidden"
      >
        <div className="mb-3 flex items-center justify-end">
          <button type="button" className="rounded-lg p-2 text-primary-shade" aria-label={tx("Fermer")} onClick={() => setMenu(false)}>
            <MIcon name="close" />
          </button>
        </div>
        <div className="mb-lg px-4">
          <p className="text-h2 font-h2 font-bold tracking-tight text-primary-shade">TOKPa</p>
          <p className="text-label text-on-surface-variant opacity-70">{tx("Ton marché, ta façon")}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="px-4 pb-1 pt-3 text-micro uppercase tracking-widest text-on-surface-variant opacity-50">{tx("Menu")}</p>
          {([
            { to: '/catalogue', icon: 'storefront', label: t('nav.market'), active: onMarket },
            { to: '/negociations', icon: 'handshake', label: t('nav.negotiations'), active: onNegociations, badge: activeNegoCount },
            { to: '/commandes', icon: 'receipt_long', label: t('nav.orders'), active: onCommandes },
            { to: '/paiements', icon: 'payments', label: tx("Paiements"), active: onPaiements },
          ] as const).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={item.active ? 'page' : undefined}
              className={
                item.active
                  ? 'flex items-center gap-3 rounded-lg bg-primary-lighter px-4 py-3 font-bold text-primary-shade'
                  : 'flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant hover:bg-primary-lighter/70'
              }
              onClick={() => setMenu(false)}
            >
              <MIcon name={item.icon} />
              <span className="text-body">
                {item.label}
                {'badge' in item && item.badge > 0 ? ` (${item.badge})` : ''}
              </span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-2 pt-md">
          {space && (
            <Link to={space.to} className="flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant hover:bg-primary-lighter/70" onClick={() => setMenu(false)}>
              <MIcon name={space.icon} />
              <span className="text-body">{tx(space.label)}</span>
            </Link>
          )}
          <Link to="/profil" className="flex items-center gap-3 py-4" onClick={() => setMenu(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-primary-lighter text-label font-bold text-primary-shade">
              {hasSession() ? initialsOf(currentUserName(), 'CL') : <MIcon name="login" />}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-label font-bold text-primary-shade">
                {hasSession() ? (currentUserName() ?? tx("Profil")) : tx("Se connecter")}
              </span>
              <span className="text-micro text-on-surface-variant opacity-70">{tx("Espace client")}</span>
            </span>
          </Link>
        </div>
      </aside>
        </>,
        document.body,
      )}
    </header>
  );
}
