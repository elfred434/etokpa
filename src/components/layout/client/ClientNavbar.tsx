import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';
import { useAppSelector } from '../../../hooks/useStore';
import { selectCount } from '../../../store/slices/cart/cartSlice';

interface ClientNavbarProps {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}

/**
 * Navbar cliente unique — copie conforme de la TopNavBar du code.html « accueil_tokpa »
 * (utilisée sur toutes les pages client : accueil, catalogue, fiche produit, panier…).
 * fixed 52px, fond #fff8f6, logo + liens, recherche pillule #fff1eb, icônes #9d4300.
 */
export default function ClientNavbar({ search, onSearch, searchPlaceholder }: ClientNavbarProps) {
  const cartCount = useAppSelector((s) => selectCount(s.cart.items));
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [localSearch, setLocalSearch] = useState('');
  const onMarket = pathname === '/' || pathname.startsWith('/catalogue') || pathname.startsWith('/produit');

  const submitSearch = (e: FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const q = (search ?? localSearch).trim();
    if (q) navigate({ to: '/catalogue', search: { q } });
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-line bg-warm">
      <div className="mx-auto flex h-[52px] w-full max-w-[1200px] items-center justify-between px-4">
        {/* Logo + liens */}
        <div className="flex items-center gap-lg">
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
              Marché
            </Link>
            <button
              type="button"
              onClick={() => toast('Négociations — Sprint 2')}
              className={clsx(
                'rounded px-2 py-3 font-body text-body transition-colors hover:bg-primary-lighter',
                pathname === '/notifications' ? 'font-bold text-primary-shade' : 'text-on-surface-variant',
              )}
            >
              Négociations
            </button>
            <button
              type="button"
              onClick={() => toast('Commandes — Sprint 3')}
              className="rounded px-2 py-3 font-body text-body text-on-surface-variant transition-colors hover:bg-primary-lighter"
            >
              Commandes
            </button>
          </nav>
        </div>

        {/* Recherche (pillule) */}
        <form onSubmit={submitSearch} className="mx-8 hidden max-w-1xl flex-1 lg:block">
          <div className="relative flex items-center rounded-full border border-line bg-warm-low px-4 py-1.5">
            <MIcon name="search" className="mr-2 text-ink-3" />
            <input
              type="text"
              value={search ?? localSearch}
              onChange={(e) => (onSearch ? onSearch(e.target.value) : setLocalSearch(e.target.value))}
              placeholder={searchPlaceholder ?? 'Rechercher des produits...'}
              className="w-full border-none bg-transparent p-0 text-ink-2 focus:outline-none focus:ring-0"
            />
          </div>
        </form>

        {/* Icônes */}
        <div className="flex items-center gap-md text-primary-shade">
          <Link to="/notifications" className="scale-interaction" aria-label="Notifications">
            <MIcon name="notifications" />
          </Link>
          <Link to="/panier" className="scale-interaction relative" aria-label="Panier">
            <MIcon name="shopping_cart" />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />}
          </Link>
          <Link
            to="/profil"
            className="scale-interaction"
            aria-label="Profil"
          >
            <MIcon name="account_circle" />
          </Link>
        </div>
      </div>
    </header>
  );
}
