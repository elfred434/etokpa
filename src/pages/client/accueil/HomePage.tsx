import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  IconArrowRight,
  IconCash,
  IconTruck,
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
  IconDiamond,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import DarkFooter from '../../../components/layout/client/DarkFooter';
import CategoryCard from '../../../components/client/catalog/CategoryCard';
import ProductCard from '../../../components/client/catalog/ProductCard';
import { CATEGORIES, PRODUCTS } from '../../../constants/mockData';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';

const FEATURES = [
  { icon: IconCash, title: 'Négociation de prix', text: 'Discutez les prix directement comme au marché Dantokpa.' },
  { icon: IconTruck, title: 'Livraison Rapide', text: 'Vos produits frais livrés en moins de 2 heures à votre porte.' },
  { icon: IconMapPin, title: 'Produits Locaux', text: 'Soutenez les agriculteurs béninois et mangez sainement.' },
];

/** Page d'accueil — copie conforme de la maquette accueil. */
export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [offset, setOffset] = useState(0);
  const selection = [0, 1, 2, 3].map((i) => PRODUCTS[(offset + i) % PRODUCTS.length]);

  const addToCart = (product: (typeof PRODUCTS)[number]) => {
    dispatch(add({ product }));
    toast.success(`${product.nom} ajouté au panier`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <ClientNavbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-md py-lg md:px-lg">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl">
          <img
            src="/images/brand/illustration-pattern.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#FFF7ED] via-[#FFF7EDcc] to-transparent"
            aria-hidden="true"
          />
          <div className="relative z-10 max-w-[520px] p-xl md:p-xl">
            <h1 className="text-[36px] font-bold leading-tight text-primary-darker">Ton marché, ta façon.</h1>
            <p className="mt-md text-[15px] leading-relaxed text-ink-2">
              Les produits les plus frais de Cotonou, livrés directement chez vous sans intermédiaire
              inutile.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-lg"
              onClick={() => navigate({ to: '/catalogue' })}
            >
              Commencer mes achats
              <IconArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* 3 atouts */}
        <section className="mt-lg grid grid-cols-1 gap-md md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card flex items-start gap-md p-lg">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-lighter text-primary">
                <Icon size={22} />
              </span>
              <div>
                <h3 className="text-h3 font-semibold text-ink">{title}</h3>
                <p className="mt-xs text-[13px] leading-relaxed text-ink-2">{text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Catégories */}
        <section className="mt-xl">
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-h2 text-ink">Explorer les catégories</h2>
            <button
              type="button"
              onClick={() => navigate({ to: '/catalogue' })}
              className="flex items-center gap-xs text-[13px] font-medium text-primary hover:underline"
            >
              Voir tout
              <IconChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-md md:grid-cols-4">
            {CATEGORIES.slice(0, 4).map((c) => (
              <CategoryCard key={c.id} category={c} onClick={() => navigate({ to: '/catalogue' })} />
            ))}
          </div>
        </section>

        {/* Sélection du jour */}
        <section className="mt-xl">
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-h2 text-ink">Sélection du jour</h2>
            <div className="flex gap-sm">
              <button
                type="button"
                aria-label="Précédent"
                onClick={() => setOffset((o) => (o - 1 + PRODUCTS.length) % PRODUCTS.length)}
                className="flex h-10 w-10 items-center justify-center rounded-full border-0.5 border-line bg-card text-ink-2 transition-colors hover:text-primary"
              >
                <IconChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Suivant"
                onClick={() => setOffset((o) => (o + 1) % PRODUCTS.length)}
                className="flex h-10 w-10 items-center justify-center rounded-full border-0.5 border-line bg-card text-ink-2 transition-colors hover:text-primary"
              >
                <IconChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-md xl:grid-cols-4">
            {selection.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={addToCart}
                onOpen={(prod) => navigate({ to: '/produit/$productId', params: { productId: prod.id } })}
              />
            ))}
          </div>
        </section>

        {/* Bannière négociation */}
        <section className="card mt-xl grid grid-cols-1 items-center gap-lg bg-surface p-xl lg:grid-cols-[1fr_360px]">
          <div>
            <span className="badge bg-amber-light text-amber-text">
              <IconDiamond size={12} />
              NOUVEAU : LA NÉGOCIATION DIRECTE
            </span>
            <h2 className="mt-md text-h2 text-ink">Trop cher ? Propose ton prix !</h2>
            <p className="mt-sm max-w-[480px] text-[13px] leading-relaxed text-ink-2">
              Comme au marché physique, vous pouvez désormais proposer un prix au vendeur pour certains
              produits. Recevez une réponse en temps réel.
            </p>
          </div>
          <div className="rounded-[12px] bg-card p-md shadow-sm">
            <div className="flex items-center justify-between border-b border-line py-sm">
              <span className="text-[13px] text-ink-2">Prix Vendeur</span>
              <span className="font-bold text-ink">2 500 FCFA</span>
            </div>
            <div className="flex items-center justify-between gap-sm py-sm">
              <span className="text-[13px] text-ink-2">Votre Offre</span>
              <input
                defaultValue="2 100"
                aria-label="Votre offre"
                className="w-[90px] rounded-[8px] border border-line bg-card px-sm py-xs text-right font-bold text-amber-text outline-none focus:border-amber"
              />
            </div>
            <button
              type="button"
              onClick={() => toast('Négociation — disponible au Sprint 2')}
              className="mt-sm w-full rounded-[10px] bg-[#A16207] py-[10px] font-semibold text-white transition-colors hover:bg-amber-text active:scale-[0.97]"
            >
              Envoyer l'offre
            </button>
          </div>
        </section>
      </main>

      <DarkFooter />
    </div>
  );
}
