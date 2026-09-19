import { Link, useRouterState } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';
import { useAppSelector } from '../../../hooks/useStore';
import { selectCount } from '../../../store/slices/cart/cartSlice';

/**
 * ClientBottomNav — Composant commun de navigation mobile pour toutes les pages client.
 * Fixe en bas de l'écran (lg:hidden).
 */
export default function ClientBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cartCount = useAppSelector((s) => selectCount(s.cart.items));

  const isHome = pathname === '/';
  const isCatalogue = pathname.startsWith('/catalogue');
  const isPanier = pathname.startsWith('/panier');

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-line bg-warm px-2 py-2 shadow-lg lg:hidden">
      <Link
        to="/"
        className={`scale-interaction flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-colors ${
          isHome ? 'bg-primary-lighter text-primary-shade font-semibold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <MIcon name="home" className="text-[20px]" />
        <span className="font-micro text-micro">Home</span>
      </Link>

      <Link
        to="/catalogue"
        className={`scale-interaction flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-colors ${
          isCatalogue ? 'bg-primary-lighter text-primary-shade font-semibold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <MIcon name="category" className="text-[20px]" />
        <span className="font-micro text-micro">Catégories</span>
      </Link>

      <button
        type="button"
        onClick={() => toast('Historique des commandes — Sprint 3')}
        className="scale-interaction flex flex-col items-center justify-center rounded-xl px-3 py-1 text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <MIcon name="receipt_long" className="text-[20px]" />
        <span className="font-micro text-micro">Commandes</span>
      </button>

      <Link
        to="/panier"
        className={`scale-interaction relative flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-colors ${
          isPanier ? 'bg-primary-lighter text-primary-shade font-semibold' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <div className="relative">
          <MIcon name="shopping_cart" className="text-[20px]" />
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-container text-[9px] font-bold text-white">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </div>
        <span className="font-micro text-micro">Panier</span>
      </Link>
    </nav>
  );
}
