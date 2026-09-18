import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import { IconShoppingCart, IconSearch, IconMenu2, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import NotificationBell from '../../shared/NotificationBell';
import { NOTIFICATIONS } from '../../../constants/mockData';
import { useAppSelector } from '../../../hooks/useStore';
import { selectCount } from '../../../store/slices/cart/cartSlice';

interface ClientNavbarProps {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}

/** Navbar cliente : logo, nav, recherche, cloche, panier (Redux), avatar, menu mobile. */
export default function ClientNavbar({ search, onSearch, searchPlaceholder = 'Chercher un produit…' }: ClientNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartCount = useAppSelector((s) => selectCount(s.cart.items));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onMarket = pathname.startsWith('/catalogue') || pathname.startsWith('/produit');

  const searchInput = (extraClass = '') => (
    <div className={clsx('relative', extraClass)}>
      <IconSearch size={18} className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={search ?? ''}
        onChange={(e) => onSearch?.(e.target.value)}
        placeholder={searchPlaceholder}
        className="input rounded-full bg-page py-[8px] pl-[40px] focus:bg-card"
      />
    </div>
  );

  return (
    <header className="navbar sticky top-0 z-30">
      <Link to="/" className="navbar-logo">
        TOKPa
      </Link>

      {searchInput('hidden max-w-[420px] flex-1 md:block')}

      <nav className="ml-auto hidden items-center gap-xs md:flex">
        <Link to="/catalogue" className={clsx('nav-item', onMarket && 'nav-item-active')}>
          Marché
        </Link>
        <button type="button" onClick={() => toast('Négociations — Sprint 2')} className="nav-item">
          Négociations
        </button>
        <button type="button" onClick={() => toast('Commandes — Sprint 2')} className="nav-item">
          Commandes
        </button>
        <button type="button" onClick={() => toast('Profil — Sprint 2')} className="nav-item">
          Profil
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-sm md:ml-md">
        <NotificationBell notifications={NOTIFICATIONS} />
        <Link
          to="/panier"
          aria-label={`Panier (${cartCount} articles)`}
          className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
        >
          <IconShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -right-[5px] -top-[7px] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          className="avatar avatar-sm avatar-client"
          aria-label="Profil"
          onClick={() => toast('Profil — Sprint 2')}
        >
          KO
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 hover:bg-surface md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          {mobileOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="absolute left-0 right-0 top-[52px] flex flex-col gap-xs border-b border-line bg-card p-md md:hidden">
          {searchInput('mb-sm')}
          <Link to="/catalogue" className={clsx('nav-item text-left', onMarket && 'nav-item-active')}>
            Marché
          </Link>
          <button type="button" onClick={() => toast('Négociations — Sprint 2')} className="nav-item text-left">
            Négociations
          </button>
          <button type="button" onClick={() => toast('Commandes — Sprint 2')} className="nav-item text-left">
            Commandes
          </button>
          <button type="button" onClick={() => toast('Profil — Sprint 2')} className="nav-item text-left">
            Profil
          </button>
        </nav>
      )}
    </header>
  );
}
