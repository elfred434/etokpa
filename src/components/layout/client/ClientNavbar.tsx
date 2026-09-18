import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { IconShoppingCart, IconSearch, IconMenu2, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import NotificationBell from '../../shared/NotificationBell';
import { NOTIFICATIONS } from '../../../constants/mockData';

const NAV_ITEMS = ['Marché', 'Négociations', 'Commandes'];

interface ClientNavbarProps {
  cartCount?: number;
  searchPlaceholder?: string;
}

/** Navbar cliente (maquettes accueil/catalogue) : logo, nav, recherche, cloche, panier, avatar. */
export default function ClientNavbar({ cartCount = 0, searchPlaceholder = 'Rechercher des produits…' }: ClientNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="navbar sticky top-0 z-30">
      <Link to="/" className="navbar-logo">
        TOKPa
      </Link>

      {/* Recherche (desktop) */}
      <div className="relative hidden max-w-[420px] flex-1 md:block">
        <IconSearch size={18} className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="input rounded-full bg-surface py-[8px] pl-[40px] focus:bg-card"
        />
      </div>

      {/* Nav desktop */}
      <nav className="ml-auto hidden items-center gap-xs md:flex">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item}
            type="button"
            onClick={() => toast(`${item} — page assemblée après les composants (Sprint 1)`)}
            className={clsx('nav-item', i === 0 && 'nav-item-active')}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-sm md:ml-md">
        <NotificationBell notifications={NOTIFICATIONS} />
        <button
          type="button"
          onClick={() => toast('Panier — page assemblée après les composants (Sprint 1)')}
          aria-label={`Panier (${cartCount} articles)`}
          className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
        >
          <IconShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -right-[5px] -top-[7px] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="avatar avatar-sm avatar-client"
          aria-label="Profil"
          onClick={() => toast('Profil — page assemblée après les composants (Sprint 1)')}
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

      {/* Menu mobile */}
      {mobileOpen && (
        <nav className="absolute left-0 right-0 top-[52px] flex flex-col gap-xs border-b border-line bg-card p-md md:hidden">
          <div className="relative mb-sm md:hidden">
            <IconSearch size={18} className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-ink-3" />
            <input type="search" placeholder={searchPlaceholder} className="input pl-[40px]" />
          </div>
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item}
              type="button"
              onClick={() => toast(`${item} — page assemblée après les composants (Sprint 1)`)}
              className={clsx('nav-item text-left', i === 0 && 'nav-item-active')}
            >
              {item}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
