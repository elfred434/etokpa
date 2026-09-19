import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import type { Product } from '../../../types/models';

/* ---- Fiche exacte du code.html « fiche_produit_tokpa » ---- */

const PRODUCT: Product = {
  id: 'p1',
  nom: 'Tomates fraîches du jour',
  origine: 'Marché Dantokpa',
  quantite: '500g',
  prix: 450,
  prixMinimum: 350,
  categorie: 'vegetable',
  stock: 'available',
  badges: [],
};

const DETAILS = [
  { label: 'Origine', value: 'Dantokpa / Ouidah' },
  { label: 'Fraîcheur', value: 'Récolte du jour' },
  { label: 'Poids moyen', value: '~80g par pièce' },
  { label: 'Conservation', value: '5-7 jours au frais' },
];

const AVIS = [
  {
    id: 'r1',
    auteur: 'Kossi A.',
    note: 5,
    date: 'Il y a 2 jours',
    texte: 'Tomates très fraîches, livrées en moins d’une heure. La négociation a fonctionné, je recommande !',
  },
  {
    id: 'r2',
    auteur: 'Mariam D.',
    note: 4,
    date: 'Il y a 1 semaine',
    texte: 'Bonne qualité globale, quelques tomates un peu mûres mais la vendeuse a été arrangeante.',
  },
];

type TabId = 'description' | 'origine' | 'avis';

/** Fiche produit — mise à jour sans vendeur. */
export default function ProductPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(2);
  const [offre, setOffre] = useState('380 FCFA');
  const [tab, setTab] = useState<TabId>('description');

  const addToCart = () => {
    dispatch(add({ product: PRODUCT, quantity }));
    toast.success('Ajouté au panier');
  };

  const buyNow = () => {
    dispatch(add({ product: PRODUCT, quantity }));
    navigate({ to: '/panier' });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#fcfaf8] font-body text-ink">
      <ClientNavbar />
      <div className="flex flex-1 justify-center px-3 pb-[80px] pt-[64px] sm:px-6 md:px-12 md:pb-8 md:pt-[72px] lg:px-20 xl:px-40">
        <div className="flex w-full max-w-[1200px] flex-1 flex-col">
          {/* ---- Breadcrumbs ---- */}
          <div className="flex flex-wrap gap-2 py-3 md:px-10">
            <Link to="/" className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">
              Accueil
            </Link>
            <span className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">/</span>
            <Link to="/catalogue" className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">
              Légumes
            </Link>
            <span className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">/</span>
            <span className="text-xs font-medium leading-normal text-[#1c130d] sm:text-sm">Tomates fraîches du jour</span>
          </div>

          {/* ---- Main Product Content ---- */}
          <main className="grid grid-cols-1 gap-6 rounded-xl bg-white p-4 pb-8 shadow-sm md:gap-8 md:px-10 md:pb-12 lg:grid-cols-2">
            {/* LEFT COLUMN: Images */}
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] sm:h-[320px] md:h-[400px]">
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-success bg-success-light px-3 py-1 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-xs font-semibold text-success-dark">Disponible</span>
                </div>
                <div className="flex flex-col items-center gap-4 text-primary-hover">
                  <MIcon name="flag_2" style={{ fontSize: 64 }} />
                </div>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 sm:gap-4">
                <div className="flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-primary bg-primary-lighter sm:h-[60px] sm:w-[60px]">
                  <MIcon name="image" className="text-primary-dark" />
                </div>
                {[2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-warm-container transition-colors hover:border-primary sm:h-[60px] sm:w-[60px]"
                  >
                    <MIcon name="image" className="text-ink-3" />
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Details */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-1 text-micro uppercase tracking-widest text-ink-3">LÉGUMES FRAIS</p>
                <h1 className="text-h1 text-ink">Tomates fraîches du jour</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MIcon name="star" filled className="text-[#F59E0B]" />
                    <span className="font-semibold text-ink">4.5/5</span>
                    <span className="text-ink-2">(127 avis)</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <MIcon name="location_on" className="text-sm" />
                    <span className="text-ink">Marché Dantokpa, Zone Akpakpa</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-lighter font-bold text-primary-dark">
                    DK
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Marché Dantokpa</p>
                    <div className="flex items-center gap-1">
                      <MIcon name="verified" className="text-[14px] text-success" />
                      <span className="text-micro text-success">Provenance vérifiée</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-line" />

              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold leading-none text-primary">450 FCFA</span>
                <span className="mb-1 text-ink-2">/ 500g</span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-label text-ink">Quantité</span>
                <div className="flex items-center rounded-lg border border-line">
                  <button
                    type="button"
                    aria-label="Diminuer"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="border-r border-line p-2 text-ink transition-colors hover:bg-surface"
                  >
                    <MIcon name="remove" className="text-[18px]" />
                  </button>
                  <span className="px-6 py-1 font-semibold text-ink">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Augmenter"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="border-l border-line p-2 text-ink transition-colors hover:bg-surface"
                  >
                    <MIcon name="add" className="text-[18px]" />
                  </button>
                </div>
              </div>

              {/* NEGOTIATION MODULE */}
              <div className="flex flex-col gap-4 rounded-lg border-l-[3px] border-[#F59E0B] bg-[#FFFBEB] p-4">
                <div className="flex items-center gap-2">
                  <MIcon name="payments" className="text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold uppercase tracking-tight text-[#92400E]">Proposer votre budget</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg bg-page p-3 text-center">
                    <p className="mb-1 text-[10px] uppercase text-ink-2">Prix référence</p>
                    <p className="font-bold text-ink">450 FCFA</p>
                  </div>
                  <MIcon name="sync" className="rotate-90 text-[#F59E0B]" />
                  <div className="flex-1 rounded-lg border border-dashed border-[#F59E0B] bg-amber-light p-3 text-center">
                    <p className="mb-1 text-[10px] uppercase text-amber-text">Votre offre</p>
                    <input
                      type="text"
                      value={offre}
                      onChange={(e) => setOffre(e.target.value)}
                      className="w-full border-none bg-transparent p-0 text-center font-bold text-ink focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
                <p className="text-[12px] italic text-[#92400E]">Budget min. accepté sur ce lot : 350 FCFA</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toast('Négociation — Sprint 2')}
                    className="w-full transform rounded-[10px] bg-success py-2.5 font-bold text-white transition-all hover:bg-success-dark active:scale-[0.98]"
                  >
                    Envoyer l'offre
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Négociation annulée')}
                    className="text-center text-xs text-ink-2 hover:text-ink"
                  >
                    Annuler la négociation
                  </button>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={addToCart}
                  className="flex w-full transform items-center justify-center gap-2 rounded-[10px] bg-primary py-3.5 font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
                >
                  <MIcon name="shopping_cart" />
                  Ajouter au panier
                </button>
                <button
                  type="button"
                  onClick={buyNow}
                  className="w-full rounded-[10px] border border-primary bg-white py-3.5 font-bold text-primary transition-all hover:bg-primary-lighter"
                >
                  Acheter maintenant
                </button>
              </div>
            </div>
          </main>

          {/* ---- Bottom Section: Tabs ---- */}
          <section className="mx-auto mt-8 mb-20 w-full max-w-[1200px] overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex border-b border-line">
              {(
                [
                  ['description', 'Description'],
                  ['origine', 'Origine & Qualité'],
                  ['avis', 'Avis (127)'],
                ] as [TabId, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={clsx(
                    'px-8 py-4 text-sm',
                    tab === id ? 'active-tab font-semibold' : 'font-medium text-ink-2 hover:text-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'description' && (
              <div className="flex flex-col gap-4 p-8">
                <h3 className="text-h3 text-ink">Détails du produit</h3>
                <p className="max-w-3xl text-body leading-relaxed text-ink-2">
                  Ces tomates fraîches proviennent directement du cœur du marché Dantokpa à Cotonou. Cultivées
                  localement avec soin, elles sont récoltées à maturité pour garantir une saveur intense et une
                  texture ferme idéale pour vos sauces, salades et plats traditionnels béninois.
                  <br />
                  <br />
                  Sourcing quotidien auprès des producteurs locaux de la zone de Ouidah pour vous offrir le meilleur de la terre. Nos tomates sont triées à la main pour éviter tout produit abîmé.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
                  {DETAILS.map((d) => (
                    <div key={d.label} className="flex flex-col">
                      <span className="text-micro uppercase text-ink-3">{d.label}</span>
                      <span className="text-sm font-medium text-ink">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'origine' && (
              <div className="flex flex-col gap-4 p-8">
                <h3 className="text-h3 text-ink">Origine & Traçabilité</h3>
                <div className="flex items-center gap-3 rounded-xl bg-surface p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-lighter font-bold text-primary-dark">
                    DK
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Marché Dantokpa</p>
                    <div className="flex items-center gap-1">
                      <MIcon name="verified" className="text-[14px] text-success" />
                      <span className="text-micro text-success">Produit certifié frais · Origine Ouidah / Cotonou</span>
                    </div>
                  </div>
                </div>
                <p className="max-w-3xl text-body leading-relaxed text-ink-2">
                  Tous les lots sont contrôlés dès leur arrivée au stand de regroupement avant la livraison finale chez vous. Note moyenne : 4.5/5 sur 127 avis clients.
                </p>
              </div>
            )}

            {tab === 'avis' && (
              <div className="flex flex-col gap-4 p-4 md:p-8">
                <h3 className="text-h3 text-ink">Avis clients (127)</h3>
                {AVIS.map((a) => (
                  <div key={a.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{a.auteur}</span>
                        <span className="flex items-center gap-0.5 text-[#F59E0B]">
                          {Array.from({ length: a.note }, (_, i) => (
                            <MIcon key={i} name="star" filled className="text-[14px]" />
                          ))}
                        </span>
                      </div>
                      <span className="text-micro text-ink-3">{a.date}</span>
                    </div>
                    <p className="mt-2 text-body text-ink-2">{a.texte}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ---- Mobile Floating Bottom Action Bar ---- */}
      <div className="fixed bottom-[52px] left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-white p-3 shadow-lg md:hidden">
        <div>
          <span className="text-micro text-ink-2">Prix total</span>
          <p className="text-base font-bold text-primary">{(450 * quantity).toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addToCart}
            className="flex items-center gap-1 rounded-lg border border-primary bg-primary-lighter px-3 py-2.5 text-xs font-bold text-primary"
          >
            <MIcon name="shopping_cart" className="text-[16px]" />
            Panier
          </button>
          <button
            type="button"
            onClick={buyNow}
            className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm"
          >
            Acheter
          </button>
        </div>
      </div>

      <ClientBottomNav />
    </div>
  );
}
