import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import DarkFooter from '../../../components/layout/client/DarkFooter';
import MIcon from '../../../components/shared/MIcon';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import type { Product } from '../../../types/models';

/* ---- Données exactes du code.html « accueil_tokpa » ---- */

const ATOUTS = [
  {
    icon: 'payments',
    titre: 'Négociation de prix',
    texte: 'Discutez les prix directement comme au marché Dantokpa.',
  },
  {
    icon: 'local_shipping',
    titre: 'Livraison Rapide',
    texte: 'Vos produits frais livrés en moins de 2 heures à votre porte.',
  },
  {
    icon: 'location_on',
    titre: 'Produits Locaux',
    texte: 'Soutenez les agriculteurs béninois et mangez sainement.',
  },
];

const CATEGORIES = [
  { icon: 'potted_plant', nom: 'Légumes' },
  { icon: 'set_meal', nom: 'Poissons' },
  { icon: 'liquor', nom: 'Épices' },
  { icon: 'shopping_basket', nom: 'Packs' },
];

interface SelectionItem {
  id: string;
  nom: string;
  lieu: string;
  prixLabel: string;
  prix: number;
  image: string;
  badge: 'Disponible' | 'Stock Limité';
}

const SELECTION: SelectionItem[] = [
  {
    id: 's1',
    nom: 'Tomates Fraîches (1kg)',
    lieu: 'Cotonou Sud',
    prixLabel: '1.200 FCFA',
    prix: 1200,
    image: '/images/design/tomates-1kg.png',
    badge: 'Disponible',
  },
  {
    id: 's2',
    nom: "Igname du Nord (L'unité)",
    lieu: 'Abomey-Calavi',
    prixLabel: '850 FCFA',
    prix: 850,
    image: '/images/design/igname.png',
    badge: 'Disponible',
  },
  {
    id: 's3',
    nom: 'Mangues Greffées (Lot de 3)',
    lieu: 'Zogbo',
    prixLabel: '1.500 FCFA',
    prix: 1500,
    image: '/images/design/mangues.png',
    badge: 'Stock Limité',
  },
  {
    id: 's4',
    nom: 'Piment Rouge Séché (Sachet)',
    lieu: 'Dantokpa',
    prixLabel: '500 FCFA',
    prix: 500,
    image: '/images/design/piment.png',
    badge: 'Disponible',
  },
];

/** Accueil TOKPa — copie conforme du code.html Stitch « accueil_tokpa ». */
export default function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [offre, setOffre] = useState('2.100');

  const addToCart = (item: SelectionItem) => {
    const product: Product = {
      id: item.id,
      nom: item.nom,
      origine: item.lieu,
      quantite: 'unité',
      prix: item.prix,
      prixMinimum: Math.round(item.prix * 0.8),
      categorie: 'vegetable',
      stock: item.badge === 'Disponible' ? 'available' : 'low',
      badges: [],
      image: item.image,
    };
    dispatch(add({ product }));
    toast.success(`${item.nom} ajouté au panier`);
  };

  return (
    <div className="min-h-screen bg-page font-body text-on-surface">
      <ClientNavbar />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[80px] pt-[52px] lg:pb-0">
        {/* ---- Hero ---- */}
        <section className="relative mt-lg flex min-h-[500px] items-center overflow-hidden rounded-[24px] border border-line bg-white shadow-sm">
          <div className="absolute inset-0 z-0">
            <img
              alt="Marché TOKPa Illustration"
              className="h-full w-full object-cover"
              src="/images/brand/illustration-pattern.png"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          </div>
          <div className="relative z-10 max-w-3xl p-xl">
            <h1 className="mb-md font-h1 text-[42px] font-bold leading-tight text-primary-darker">Ton marché, ta façon.</h1>
            <p className="mb-lg text-lg leading-relaxed text-on-surface-variant">
              Les produits les plus frais de Cotonou, livrés directement chez vous sans intermédiaire inutile.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: '/catalogue' })}
              className="scale-interaction flex items-center gap-2 rounded-[10px] bg-primary px-lg py-3.5 font-bold text-white hover:bg-primary-hover"
            >
              Commencer mes achats
              <MIcon name="arrow_forward" />
            </button>
          </div>
        </section>

        {/* ---- Value Propositions ---- */}
        <section className="my-xl grid grid-cols-1 gap-lg md:grid-cols-3">
          {ATOUTS.map((a) => (
            <div key={a.titre} className="flex items-start gap-md rounded-[14px] border border-line bg-card p-lg">
              <div className="rounded-xl bg-primary-lighter p-sm">
                <MIcon name={a.icon} className="text-[32px] text-primary-shade" />
              </div>
              <div>
                <h3 className="font-h3 font-bold text-on-surface">{a.titre}</h3>
                <p className="mt-xs text-body text-ink-2">{a.texte}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ---- Categories Grid ---- */}
        <section className="mb-xl">
          <div className="mb-lg flex items-end justify-between">
            <h2 className="font-h1 text-h1 text-on-surface">Explorer les catégories</h2>
            <Link to="/catalogue" className="flex items-center gap-1 font-bold text-primary-shade hover:underline">
              Voir tout <MIcon name="chevron_right" className="text-[18px]" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-md md:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div
                key={c.nom}
                onClick={() => navigate({ to: '/catalogue' })}
                className="bento-hover group flex cursor-pointer flex-col items-center gap-sm rounded-[14px] border border-transparent bg-warm-low p-lg hover:border-primary-light"
              >
                <MIcon name={c.icon} className="text-[48px] text-primary-shade transition-transform group-hover:scale-110" />
                <span className="font-h3 text-on-surface">{c.nom}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Featured Products ---- */}
        <section className="mb-xl">
          <div className="mb-lg flex items-end justify-between">
            <h2 className="font-h1 text-h1 text-on-surface">Sélection du jour</h2>
            <div className="flex gap-sm">
              <button
                type="button"
                aria-label="Précédent"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white hover:bg-primary-lighter"
              >
                <MIcon name="chevron_left" />
              </button>
              <button
                type="button"
                aria-label="Suivant"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white hover:bg-primary-lighter"
              >
                <MIcon name="chevron_right" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-md md:grid-cols-4">
            {SELECTION.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate({ to: '/produit/$productId', params: { productId: 'p1' } })}
                className="bento-hover group cursor-pointer overflow-hidden rounded-[14px] border border-line bg-white p-md"
              >
                <div className="relative mb-md h-40 overflow-hidden rounded-[10px] bg-page">
                  <img
                    src={item.image}
                    alt={item.nom}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {item.badge === 'Disponible' ? (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-micro text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" /> Disponible
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-micro text-on-secondary-container">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-text" /> Stock Limité
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="text-label text-ink-2">{item.lieu}</span>
                  <h3 className="font-h3 font-bold text-on-surface">{item.nom}</h3>
                  <div className="mt-sm flex items-center justify-between">
                    <span className="font-price text-price text-primary-shade">{item.prixLabel}</span>
                    <button
                      type="button"
                      aria-label={`Ajouter ${item.nom}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className="scale-interaction flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                    >
                      <MIcon name="add" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Negotiation Module ---- */}
        <section className="mb-xl flex flex-col items-center justify-between gap-lg rounded-[14px] border-l-[3px] border-secondary-container bg-white p-lg md:flex-row">
          <div className="max-w-xl">
            <div className="mb-sm inline-flex items-center gap-2 rounded-full bg-secondary-container/10 px-3 py-1 text-on-secondary-container">
              <MIcon name="handshake" className="text-[18px]" />
              <span className="text-label uppercase tracking-wider">Nouveau : La Négociation Directe</span>
            </div>
            <h2 className="mb-xs font-h2 text-h1 text-on-surface">Trop cher ? Propose ton prix !</h2>
            <p className="text-body text-ink-2">
              Comme au marché physique, vous pouvez désormais proposer un prix au vendeur pour certains produits.
              Recevez une réponse en temps réel.
            </p>
          </div>
          <div className="w-full min-w-[300px] rounded-xl bg-page p-md md:w-auto">
            <div className="flex flex-col gap-sm">
              <div className="flex items-center justify-between">
                <span className="text-label text-ink-2">Prix Vendeur</span>
                <span className="font-bold text-on-surface">2.500 FCFA</span>
              </div>
              <div className="h-[1.5px] w-full bg-line" />
              <div className="flex items-center justify-between">
                <span className="text-label text-ink-2">Votre Offre</span>
                <input
                  type="text"
                  value={offre}
                  onChange={(e) => setOffre(e.target.value)}
                  className="w-24 rounded-lg border-none bg-white p-1 text-right font-bold text-primary-shade focus:ring-1 focus:ring-primary-shade"
                />
              </div>
              <button
                type="button"
                onClick={() => toast('Négociation — Sprint 2')}
                className="scale-interaction mt-2 w-full rounded-lg bg-secondary py-2 font-bold text-white"
              >
                Envoyer l'offre
              </button>
            </div>
          </div>
        </section>
      </main>

      <DarkFooter />

      {/* ---- BottomNavBar (Mobile only) ---- */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-line bg-warm px-2 py-2 shadow-lg lg:hidden">
        <Link
          to="/"
          className="scale-interaction flex flex-col items-center justify-center rounded-xl bg-primary-lighter px-3 py-1 text-primary-shade"
        >
          <MIcon name="home" />
          <span className="font-micro text-micro">Home</span>
        </Link>
        <Link to="/catalogue" className="scale-interaction flex flex-col items-center justify-center text-on-surface-variant">
          <MIcon name="category" />
          <span className="font-micro text-micro">Categories</span>
        </Link>
        <button
          type="button"
          onClick={() => toast('Commandes — Sprint 3')}
          className="scale-interaction flex flex-col items-center justify-center text-on-surface-variant"
        >
          <MIcon name="receipt_long" />
          <span className="font-micro text-micro">Orders</span>
        </button>
        <Link to="/panier" className="scale-interaction flex flex-col items-center justify-center text-on-surface-variant">
          <MIcon name="shopping_cart" />
          <span className="font-micro text-micro">Cart</span>
        </Link>
      </nav>
    </div>
  );
}
