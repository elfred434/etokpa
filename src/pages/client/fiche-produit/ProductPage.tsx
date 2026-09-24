import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import EmptyState from '../../../components/shared/EmptyState';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import { submitOffer, acceptCounterOffer, cancelNegotiation } from '../../../store/slices/negotiation/negotiationSlice';
import type { CategoryId, Product } from '../../../types/models';
import { catalogApi, negotiationApi, type ApiProduct } from '../../../services/api';

/* ---- Fiche produit 100 % API : GET /api/products/{id} (route /produit/$productId) ---- */

const SLUG_TO_CATEGORY: Record<string, CategoryId> = {
  legume: 'vegetable',
  legumes: 'vegetable',
  fruit: 'vegetable',
  fruits: 'vegetable',
  poisson: 'fish',
  poissons: 'fish',
  cereale: 'grain',
  cereales: 'grain',
  grain: 'grain',
  epice: 'spice',
  epices: 'spice',
  pack: 'pack',
};

function mapApiProduct(p: ApiProduct): Product {
  const slug = p.categorie?.slug ?? '';
  return {
    id: String(p.id),
    nom: p.nom,
    origine: 'Marché Dantokpa',
    quantite: 'unité',
    prix: Number(p.prix),
    prixMinimum: Number(p.prix_minimum),
    categorie: SLUG_TO_CATEGORY[slug] ?? 'vegetable',
    stock: p.disponible && p.stock > 0 ? 'available' : 'out',
    badges: [],
    image: p.img_url || undefined,
    description: p.description,
  };
}

type TabId = 'description' | 'origine' | 'avis';

/** Fiche produit avec module de négociation F-10 — données réelles Backend API Laravel. */
export default function ProductPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { productId } = useParams({ from: '/produit/$productId' });

  const [apiProduct, setApiProduct] = useState<ApiProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [offerInput, setOfferInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<TabId>('description');

  const product = apiProduct ? mapApiProduct(apiProduct) : null;
  const activeNeg = useAppSelector((state) =>
    product ? state.negotiation.activeNegotiations[product.id] : undefined,
  );

  // GET /api/products/{id}
  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);
    catalogApi
      .getProduct(productId)
      .then((res) => {
        const p = (res?.data ?? res) as ApiProduct;
        if (p && p.id) {
          setApiProduct(p);
          // Suggestion d'offre : -10 % du prix, arrondi
          setOfferInput(String(Math.max(1, Math.round(Number(p.prix) * 0.9))));
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setNotFound(status === 404 ? true : isLoading);
        if (status !== 404) {
          // Backend injoignable : on affiche l'état d'erreur (pas de produit factice)
          setNotFound(true);
        }
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSendOffer = async () => {
    if (!product) return;
    const numPrice = parseInt(offerInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Veuillez entrer un montant valide en FCFA');
      return;
    }
    if (numPrice < product.prixMinimum) {
      toast.error(`Le prix minimum négociable est de ${product.prixMinimum.toLocaleString('fr-FR')} FCFA`);
      return;
    }

    setIsSubmitting(true);
    try {
      // POST /api/budget-proposals (le backend rejette aussi < prix_minimum en 422)
      await negotiationApi.createProposal({
        product_id: Number(product.id),
        prix_propose: numPrice,
        quantite: quantity,
      });
      dispatch(
        submitOffer({
          productId: product.id,
          productName: product.nom,
          productImage: product.image,
          originalPrice: product.prix,
          proposedPrice: numPrice,
          minPrice: product.prixMinimum,
        }),
      );
      toast.success('Offre envoyée au marché ! Vous serez notifié de sa réponse.');
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(detail?.message || 'Impossible d’envoyer l’offre (serveur inaccessible ?)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNegotiatedToCart = (price: number) => {
    if (!product) return;
    const negotiatedProduct: Product = {
      ...product,
      prix: price,
      negotiated: { oldPrice: product.prix },
    };
    dispatch(add({ product: negotiatedProduct, quantity }));
    toast.success(`Ajouté au panier au prix négocié de ${price.toLocaleString('fr-FR')} FCFA !`);
  };

  const addToCart = () => {
    if (!product) return;
    dispatch(add({ product, quantity }));
    toast.success('Ajouté au panier');
  };

  const buyNow = () => {
    if (!product) return;
    dispatch(add({ product, quantity }));
    navigate({ to: '/panier' });
  };

  /* ---------- États de chargement / erreur ---------- */
  if (isLoading) {
    return (
      <div className="bg-bg-app min-h-screen flex items-center justify-center font-body text-text-main">
        <MIcon name="sync" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="flex justify-center pt-[80px] px-md">
          <div className="w-full max-w-[560px] bg-white rounded-xl border border-border-default p-xl">
            <EmptyState
              icon={<MIcon name="search_off" className="text-4xl text-primary" />}
              title="Produit introuvable"
              description="Ce produit n’existe pas ou n’est plus disponible au marché."
              action={
                <Link
                  to="/catalogue"
                  className="px-lg py-3 bg-primary-container text-white rounded-lg font-bold"
                >
                  Retour au catalogue
                </Link>
              }
            />
          </div>
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  const categoryNom = apiProduct?.categorie?.nom ?? 'Catalogue';
  const unavailable = !apiProduct?.disponible;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#fcfaf8] font-body text-ink">
      <ClientNavbar />
      <div className="flex flex-1 justify-center px-3 pb-[80px] pt-[64px] sm:px-6 md:px-12 md:pb-8 md:pt-[72px] lg:px-20 xl:px-40">
        <div className="flex w-full max-w-[1200px] flex-1 flex-col">
          {/* ---- Breadcrumbs (catégorie réelle de l'API) ---- */}
          <div className="flex flex-wrap gap-2 py-3 md:px-10">
            <Link to="/" className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">
              Accueil
            </Link>
            <span className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">/</span>
            <Link to="/catalogue" className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">
              {categoryNom}
            </Link>
            <span className="text-xs font-medium leading-normal text-[#9e6b47] sm:text-sm">/</span>
            <span className="text-xs font-medium leading-normal text-[#1c130d] sm:text-sm">{product.nom}</span>
          </div>

          {/* ---- Main Product Content ---- */}
          <main className="grid grid-cols-1 gap-6 rounded-xl bg-white p-4 pb-8 shadow-sm md:gap-8 md:px-10 md:pb-12 lg:grid-cols-2">
            {/* LEFT COLUMN: Images */}
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] sm:h-[320px] md:h-[400px]">
                <div
                  className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1 shadow-sm ${
                    unavailable
                      ? 'border-error bg-error-light'
                      : 'border-success bg-success-light'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${unavailable ? 'bg-error' : 'bg-success'}`} />
                  <span className={`text-xs font-semibold ${unavailable ? 'text-error-dark' : 'text-success-dark'}`}>
                    {unavailable ? 'Rupture de stock' : 'Disponible'}
                  </span>
                </div>
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.nom}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-primary-hover">
                    <MIcon name="flag_2" style={{ fontSize: 64 }} />
                    <span className="text-xs font-medium opacity-70">Photo bientôt disponible</span>
                  </div>
                )}
              </div>
              {product.image && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 sm:gap-4">
                  <div className="flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-primary sm:h-[60px] sm:w-[60px]">
                    <img src={product.image} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Details */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-1 text-micro uppercase tracking-widest text-ink-3">{categoryNom}</p>
                <h1 className="text-h1 text-ink">{product.nom}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1 text-primary">
                    <MIcon name="location_on" className="text-sm" />
                    <span className="text-ink">Marché Dantokpa, Cotonou</span>
                  </div>
                  {apiProduct && apiProduct.stock > 0 && (
                    <span className="text-micro text-ink-2">Stock : {apiProduct.stock} unité(s)</span>
                  )}
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
                <span className="text-[28px] font-bold leading-none text-primary">
                  {product.prix.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-label text-ink">Quantité</span>
                <div className="flex items-center rounded-lg border border-line">
                  <button
                    type="button"
                    aria-label="Diminuer"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="border-r border-line p-2 text-ink transition-colors hover:bg-surface cursor-pointer"
                  >
                    <MIcon name="remove" className="text-[18px]" />
                  </button>
                  <span className="px-6 py-1 font-semibold text-ink">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Augmenter"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="border-l border-line p-2 text-ink transition-colors hover:bg-surface cursor-pointer"
                  >
                    <MIcon name="add" className="text-[18px]" />
                  </button>
                </div>
              </div>

              {/* DYNAMIC NEGOTIATION MODULE (F-10) — prix réels de l'API */}
              <div className="flex flex-col gap-4 rounded-lg border-l-[3px] border-[#F59E0B] bg-[#FFFBEB] p-4 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MIcon name="payments" className="text-[#F59E0B]" />
                    <h3 className="text-sm font-semibold uppercase tracking-tight text-[#92400E]">
                      Proposer votre budget
                    </h3>
                  </div>
                  <span className="inline-block rounded-full bg-amber-light px-2.5 py-0.5 text-micro font-bold text-amber-text">
                    Négociation F-10
                  </span>
                </div>

                {/* State: Idle or submitting */}
                {(!activeNeg || activeNeg.status === 'idle') && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-lg bg-page p-3 text-center">
                        <p className="mb-1 text-[10px] uppercase text-ink-2">Prix référence</p>
                        <p className="font-bold text-ink">
                          {product.prix.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <MIcon name="sync" className="rotate-90 text-[#F59E0B]" />
                      <div className="flex-1 rounded-lg border border-dashed border-[#F59E0B] bg-amber-light p-3 text-center">
                        <p className="mb-1 text-[10px] uppercase text-amber-text">Votre offre</p>
                        <div className="flex items-center justify-center gap-1 font-bold text-ink">
                          <input
                            type="number"
                            value={offerInput}
                            onChange={(e) => setOfferInput(e.target.value)}
                            className="w-16 border-none bg-transparent p-0 text-center font-bold text-ink focus:outline-none focus:ring-0"
                          />
                          <span className="text-xs">FCFA</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[12px] italic text-[#92400E]">
                      Budget min. accepté : {product.prixMinimum.toLocaleString('fr-FR')} FCFA
                    </p>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSendOffer}
                      className="w-full transform rounded-[10px] bg-success py-2.5 font-bold text-white transition-all hover:bg-success-dark active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Traitement de l’offre…' : 'Envoyer l’offre'}
                    </button>
                  </>
                )}

                {/* State: Pending (offre envoyée, en attente du marché) */}
                {activeNeg?.status === 'pending' && (
                  <div className="space-y-3 rounded-lg border border-amber-text/40 bg-amber-light p-3">
                    <div className="flex items-center gap-2 text-amber-text">
                      <MIcon name="hourglass_top" className="text-amber-text" />
                      <span className="text-xs font-bold uppercase tracking-wider">Offre en attente</span>
                    </div>
                    <p className="text-xs text-ink">
                      Votre proposition de{' '}
                      <strong className="text-amber-text">
                        {activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA
                      </strong>{' '}
                      a été envoyée au marché. Suivez sa réponse dans « Mes Négociations ».
                    </p>
                  </div>
                )}

                {/* State: Accepted */}
                {activeNeg?.status === 'accepted' && (
                  <div className="space-y-3 rounded-lg border border-success/40 bg-success-light/50 p-3">
                    <div className="flex items-center gap-2 text-success-dark">
                      <MIcon name="verified" className="text-success" />
                      <span className="text-xs font-bold uppercase tracking-wider">Offre acceptée !</span>
                    </div>
                    <p className="text-xs text-ink">
                      Votre proposition de{' '}
                      <strong className="text-success-dark">
                        {activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA
                      </strong>{' '}
                      a été acceptée par le marché !
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddNegotiatedToCart(activeNeg.proposedPrice)}
                        className="w-full rounded-lg bg-success py-2 text-xs font-bold text-white shadow-sm hover:bg-success-dark cursor-pointer"
                      >
                        Ajouter au panier ({activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA)
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(cancelNegotiation({ productId: product.id }))}
                        className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink-2 cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* State: Counter Offer (simulation locale avant réponse du marché) */}
                {activeNeg?.status === 'counter_offer' && (
                  <div className="space-y-3 rounded-lg border border-amber-text/40 bg-amber-light p-3">
                    <div className="flex items-center gap-2 text-amber-text">
                      <MIcon name="sync" className="text-amber-text" />
                      <span className="text-xs font-bold uppercase tracking-wider">Contre-offre du marché</span>
                    </div>
                    <p className="text-xs text-ink">
                      Votre offre ({activeNeg.proposedPrice} FCFA) est légèrement basse. Le marché vous propose :{' '}
                      <strong className="text-amber-text">
                        {activeNeg.counterPrice?.toLocaleString('fr-FR')} FCFA
                      </strong>
                      .
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch(acceptCounterOffer({ productId: product.id }));
                          toast.success('Contre-offre acceptée !');
                        }}
                        className="w-full rounded-lg bg-amber-text py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-text/90 cursor-pointer"
                      >
                        Accepter ({activeNeg.counterPrice?.toLocaleString('fr-FR')} FCFA)
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(cancelNegotiation({ productId: product.id }))}
                        className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink-2 cursor-pointer"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                )}

                {/* State: Rejected */}
                {activeNeg?.status === 'rejected' && (
                  <div className="space-y-3 rounded-lg border border-error/40 bg-error-light p-3">
                    <p className="text-xs font-bold text-error">
                      Offre refusée ({activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA)
                    </p>
                    <p className="text-xs text-ink">
                      Le prix minimum accepté pour ce produit est de{' '}
                      {activeNeg.minPrice.toLocaleString('fr-FR')} FCFA.
                    </p>
                    <button
                      type="button"
                      onClick={() => dispatch(cancelNegotiation({ productId: product.id }))}
                      className="w-full rounded-lg bg-white border border-line py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                    >
                      Faire une nouvelle offre
                    </button>
                  </div>
                )}
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={unavailable}
                  className="flex w-full transform items-center justify-center gap-2 rounded-[10px] bg-primary py-3.5 font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <MIcon name="shopping_cart" />
                  Ajouter au panier ({product.prix.toLocaleString('fr-FR')} FCFA)
                </button>
                <button
                  type="button"
                  onClick={buyNow}
                  disabled={unavailable}
                  className="w-full rounded-[10px] border border-primary bg-white py-3.5 font-bold text-primary transition-all hover:bg-primary-lighter cursor-pointer disabled:opacity-50"
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
                  ['avis', 'Avis'],
                ] as [TabId, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={clsx(
                    'px-8 py-4 text-sm cursor-pointer',
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
                  {product.description ||
                    'Ce produit est disponible au Marché Dantokpa. Saisissez la quantité souhaitée, puis finalisez votre commande — livraison partout à Cotonou.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">Catégorie</span>
                    <span className="text-sm font-medium text-ink">{categoryNom}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">Prix de base</span>
                    <span className="text-sm font-medium text-ink">
                      {product.prix.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">Prix min. négociable</span>
                    <span className="text-sm font-medium text-ink">
                      {product.prixMinimum.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">Disponibilité</span>
                    <span className="text-sm font-medium text-ink">
                      {unavailable ? 'Rupture de stock' : 'En stock'}
                    </span>
                  </div>
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
                      <span className="text-micro text-success">Produit certifié frais · Origine Cotonou</span>
                    </div>
                  </div>
                </div>
                <p className="max-w-3xl text-body leading-relaxed text-ink-2">
                  Tous les lots sont contrôlés dès leur arrivée au stand de regroupement avant la livraison
                  finale chez vous. La négociation de prix se fait en direct avec le marché via le module
                  « Proposer votre budget ».
                </p>
              </div>
            )}

            {tab === 'avis' && (
              <div className="flex flex-col gap-4 p-4 md:p-8">
                <EmptyState
                  icon={<MIcon name="mode_comment" className="text-4xl text-primary" />}
                  title="Aucun avis pour le moment"
                  description="Le système d’avis clients arrive prochainement. Vos retours après livraison nous aident à faire progresser le marché."
                />
              </div>
            )}
          </section>
        </div>
      </div>
      <ClientBottomNav />
    </div>
  );
}
