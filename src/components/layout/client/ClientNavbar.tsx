import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import MIcon from '../../shared/MIcon';
import { useAppSelector } from '../../../hooks/useStore';
import { selectCount } from '../../../store/slices/cart/cartSlice';

export type NavbarVariant = 'home' | 'catalog' | 'product' | 'cart';

interface ClientNavbarProps {
  /** Variante conforme au code.html de la page : accueil, catalogue, fiche produit, panier. */
  variant?: NavbarVariant;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}

const SPRINT2 = (label: string) => () => toast(`${label} — Sprint 2`);
const SPRINT3 = (label: string) => () => toast(`${label} — Sprint 3`);

/** Navbar cliente — copie conforme des TopNavBar Stitch (code.html). */
export default function ClientNavbar({ variant = 'catalog', search, onSearch, searchPlaceholder }: ClientNavbarProps) {
  const cartCount = useAppSelector((s) => selectCount(s.cart.items));
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState('');

  const submitSearch = (e: FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const q = (search ?? localSearch).trim();
    if (q) navigate({ to: '/catalogue', search: { q } });
  };

  /* ---------------------------------------------------------------- ACCUEIL */
  if (variant === 'home') {
    return (
      <header className="fixed top-0 z-50 w-full border-b border-line bg-warm">
        <div className="mx-auto flex h-[52px] w-full max-w-[1200px] items-center justify-between px-4">
          <div className="flex items-center gap-lg">
            <Link to="/" className="font-h2 text-h2 tracking-tight text-primary">
              TOKPa
            </Link>
            <nav className="hidden gap-md md:flex">
              <Link
                to="/catalogue"
                className="border-b-2 border-primary py-3 font-body text-body font-bold text-primary transition-colors"
              >
                Marché
              </Link>
              <button
                type="button"
                onClick={SPRINT2('Négociations')}
                className="rounded px-2 py-3 font-body text-body text-on-surface-variant transition-colors hover:bg-primary-lighter"
              >
                Négociations
              </button>
              <button
                type="button"
                onClick={SPRINT3('Commandes')}
                className="rounded px-2 py-3 font-body text-body text-on-surface-variant transition-colors hover:bg-primary-lighter"
              >
                Commandes
              </button>
            </nav>
          </div>

          <form onSubmit={submitSearch} className="mx-8 hidden max-w-md flex-1 lg:block">
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

          <div className="flex items-center gap-md text-primary">
            <Link to="/notifications" className="scale-interaction" aria-label="Notifications">
              <MIcon name="notifications" />
            </Link>
            <Link to="/panier" className="scale-interaction relative" aria-label="Panier">
              <MIcon name="shopping_cart" />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />}
            </Link>
            <button type="button" onClick={SPRINT3('Profil')} className="scale-interaction" aria-label="Profil">
              <MIcon name="account_circle" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  /* --------------------------------------------------------------- CATALOGUE */
  if (variant === 'catalog') {
    return (
      <header className="sticky top-0 z-50 h-[52px] border-b border-line bg-warm">
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-h2 font-bold tracking-tight text-primary">
              TOKPa
            </Link>
            <div className="relative hidden w-[280px] sm:block">
              <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-2" />
              <input
                type="text"
                value={search ?? localSearch}
                onChange={(e) => (onSearch ? onSearch(e.target.value) : setLocalSearch(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && submitSearch(e)}
                placeholder={searchPlaceholder ?? 'Chercher un produit...'}
                className="w-full rounded-lg border border-line bg-white py-1.5 pl-10 pr-4 text-body placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <nav className="hidden items-center gap-6 md:flex">
              <Link to="/catalogue" className="text-label font-semibold text-on-surface transition-colors hover:text-primary">
                Marché
              </Link>
              <button type="button" onClick={SPRINT2('Négociations')} className="text-label font-semibold text-on-surface transition-colors hover:text-primary">
                Négociations
              </button>
              <button type="button" onClick={SPRINT3('Commandes')} className="text-label font-semibold text-on-surface transition-colors hover:text-primary">
                Commandes
              </button>
              <button type="button" onClick={SPRINT3('Profil')} className="text-label font-semibold text-on-surface transition-colors hover:text-primary">
                Profil
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-md">
            <Link
              to="/notifications"
              className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary-lighter"
              aria-label="Notifications"
            >
              <MIcon name="notifications" />
            </Link>
            <Link
              to="/panier"
              className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary-lighter"
              aria-label="Panier"
            >
              <MIcon name="shopping_cart" />
              {cartCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-warm bg-primary text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="ml-2 flex items-center gap-2 border-l border-line pl-4">
              <button
                type="button"
                onClick={SPRINT3('Profil')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-light bg-primary-lighter text-xs font-bold text-primary-dark"
                aria-label="Profil"
              >
                KO
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  /* ------------------------------------------------------------ FICHE PRODUIT */
  if (variant === 'product') {
    return (
      <header className="flex items-center justify-between whitespace-nowrap rounded-t-xl border-b border-solid border-[#f4ece6] bg-white px-4 py-3 md:px-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="size-6 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z"
                  fill="currentColor"
                />
                <path
                  clipRule="evenodd"
                  d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.739 8 35.7393 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777C43.0709 32.8052 43.0878 32.8338 43.104 32.8629L41.3563 33.8352C43.104 32.8629 43.1038 32.8626 43.104 32.8629L43.1051 32.865L43.1065 32.8675L43.1101 32.8739L43.1199 32.8918C43.1276 32.906 43.1377 32.9246 43.1497 32.9473C43.1738 32.9925 43.2062 33.0545 43.244 33.1299C43.319 33.2792 43.4196 33.489 43.5217 33.7317C43.6901 34.1321 44 34.9311 44 35.7391C44 37.4427 43.003 38.7775 41.8558 39.7209C40.6947 40.6757 39.1354 41.4464 37.385 42.0552C33.8654 43.2794 29.133 44 24 44C18.867 44 14.1346 43.2794 10.615 42.0552C8.86463 41.4464 7.30529 40.6757 6.14419 39.7209C4.99695 38.7775 3.99999 37.4427 3.99999 35.7391C3.99999 34.8725 4.29264 34.0922 4.49321 33.6393C4.60375 33.3898 4.71348 33.1804 4.79687 33.0311C4.83898 32.9556 4.87547 32.8935 4.9035 32.8471C4.91754 32.8238 4.92954 32.8043 4.93916 32.7889L4.94662 32.777L4.95178 32.7688ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <Link to="/" className="text-lg font-bold leading-tight tracking-[-0.015em] text-primary">
              TOKPa
            </Link>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/catalogue" className="text-sm font-medium text-ink transition-colors hover:text-primary">
              Marché
            </Link>
            <button type="button" onClick={SPRINT2('Négociations')} className="text-sm font-medium text-ink transition-colors hover:text-primary">
              Négociations
            </button>
            <button type="button" onClick={SPRINT3('Commandes')} className="text-sm font-medium text-ink transition-colors hover:text-primary">
              Commandes
            </button>
            <button type="button" onClick={SPRINT3('Profil')} className="text-sm font-medium text-ink transition-colors hover:text-primary">
              Profil
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <form onSubmit={submitSearch} className="hidden h-10 min-w-40 max-w-64 flex-col sm:flex">
            <div className="flex h-full w-full flex-1 items-stretch rounded-lg">
              <div className="flex items-center justify-center rounded-l-lg border-none bg-[#f4ece6] pl-4 text-[#9e6b47]">
                <MIcon name="search" />
              </div>
              <input
                type="text"
                value={search ?? localSearch}
                onChange={(e) => (onSearch ? onSearch(e.target.value) : setLocalSearch(e.target.value))}
                placeholder={searchPlaceholder ?? 'Chercher un produit...'}
                className="h-full w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-l-none border-none bg-[#f4ece6] px-4 pl-2 text-base font-normal leading-normal text-[#1c130d] placeholder:text-[#9e6b47] focus:border-none focus:outline-none focus:ring-0"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-[#f4ece6] text-[#1c130d] transition-colors hover:bg-primary-lighter"
              aria-label="Notifications"
            >
              <MIcon name="notifications" />
            </Link>
            <Link
              to="/panier"
              className="relative flex size-10 cursor-pointer items-center justify-center rounded-lg bg-[#f4ece6] text-[#1c130d] transition-colors hover:bg-primary-lighter"
              aria-label="Panier"
            >
              <MIcon name="shopping_cart" />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />}
            </Link>
            <button
              type="button"
              onClick={SPRINT3('Profil')}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary-lighter text-sm font-bold text-primary-dark"
              aria-label="Profil"
            >
              KO
            </button>
          </div>
        </div>
      </header>
    );
  }

  /* ------------------------------------------------------------------ PANIER */
  return (
    <nav className="fixed top-0 z-50 flex h-[64px] w-full items-center justify-between border-b border-line bg-white px-lg">
      <div className="flex items-center gap-xl">
        <Link to="/" className="font-h1 text-h1 font-black text-primary">
          TOKPa
        </Link>
        <div className="hidden items-center gap-lg lg:flex">
          <Link to="/catalogue" className="font-label text-on-surface transition-colors hover:text-primary">
            Marché
          </Link>
          <button type="button" onClick={SPRINT2('Négociations')} className="font-label text-on-surface transition-colors hover:text-primary">
            Négociations
          </button>
          <button type="button" onClick={SPRINT3('Commandes')} className="font-label text-on-surface transition-colors hover:text-primary">
            Commandes
          </button>
          <button type="button" onClick={SPRINT3('Profil')} className="font-label text-on-surface transition-colors hover:text-primary">
            Profil
          </button>
        </div>
      </div>

      <form onSubmit={submitSearch} className="relative mx-xl hidden max-w-md flex-1 md:block">
        <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
        <input
          type="text"
          value={search ?? localSearch}
          onChange={(e) => (onSearch ? onSearch(e.target.value) : setLocalSearch(e.target.value))}
          placeholder={searchPlaceholder ?? 'Chercher un produit...'}
          className="w-full rounded-full border-none bg-page py-2 pl-10 pr-4 text-body focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <div className="flex items-center gap-lg">
        <Link to="/notifications" className="relative text-on-surface-variant transition-colors hover:text-primary-hover" aria-label="Notifications">
          <MIcon name="notifications" />
        </Link>
        <Link to="/panier" className="relative text-on-surface-variant transition-colors hover:text-primary-hover" aria-label="Panier">
          <MIcon name="shopping_cart" />
          {cartCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />}
        </Link>
        <button
          type="button"
          onClick={SPRINT3('Profil')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-light bg-primary-lighter"
          aria-label="Profil"
        >
          <span className="text-label font-bold text-primary-dark">KO</span>
        </button>
      </div>
    </nav>
  );
}

