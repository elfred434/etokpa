// Fiche produit détaillée permettant l’ajout au panier, la commande directe et la négociation de prix.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import ImageWithFallback from '../../../components/shared/ImageWithFallback';
import EmptyState from '../../../components/shared/EmptyState';
import ApiErrorState from '../../../components/shared/ApiErrorState';
import { ProductDetailSkeleton } from '../../../components/shared/Skeleton';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import { submitOffer, acceptCounterOffer, cancelNegotiation, setProposals, type NegotiationItem } from '../../../store/slices/negotiation/negotiationSlice';
import type { Product } from '../../../types/models';
import { catalogApi, negotiationApi, type ApiProduct } from '../../../services/api';
import { mapApiProduct } from '../../../utils/productMap';
import { alertApiError, apiErrorStatus, extractApiError, formatApiError } from '../../../utils/apiError';
import { absImageUrl } from '../../../utils/imageUrl';
import {
  extractCounterOfferPrice,
  formatNegotiationRemaining,
  isAcceptedNegotiationValid,
  isPendingNegotiationValid,
  negotiationExpiresAt,
} from '../../../utils/negotiationCounter';
import { useLanguage } from '../../../context/LanguageContext';
import { tr, tx } from '../../../i18n/tx';
import { silentRefreshActive, useGlobalRefreshTick } from '../../../hooks/useRefresh';

type TabId = 'description' | 'origine' | 'avis';

// Composant de la page Product : gère le chargement des données et le rendu.
export default function ProductPage() {
  const { isFr } = useLanguage();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { productId } = useParams({ from: '/produit/$productId' });

  const [apiProduct, setApiProduct] = useState<ApiProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refreshTick = useGlobalRefreshTick();

  const [quantity, setQuantity] = useState(1);
  const [offerInput, setOfferInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState<TabId>('description');

  const product = apiProduct ? mapApiProduct(apiProduct) : null;
  const activeNeg = useAppSelector((state) =>
    product ? state.negotiation.activeNegotiations[product.id] : undefined,
  );

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    if (!silentRefreshActive()) setIsLoading(true);
    setNotFound(false);
    setLoadError(null);
    catalogApi
      .getProduct(productId)
      .then((res) => {
        const p = (res?.data ?? res) as ApiProduct;
        if (p && p.id) {
          setApiProduct(p);
          setOfferInput((current) => current || String(Math.max(1, Math.round(Number(p.prix) * 0.9))));
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (apiErrorStatus(err) === 404) setNotFound(true);
        else {
          const message = alertApiError(err, 'product-load');
          if (!apiProduct) setLoadError(message);
        }
      })
      .finally(() => setIsLoading(false));
  }, [productId, reloadKey, refreshTick]);

  // Synchronise l’état avec le stockage local du navigateur.
  useEffect(() => {
    if (!localStorage.getItem('tokpa_token') || !negotiationApi?.getProposals) return;
    let alive = true;
    negotiationApi
      .getProposals()
      .then((res) => {
        if (!alive) return;
        const proposalsList = (res as { data?: unknown[] })?.data ?? (Array.isArray(res) ? res : []);
        if (!Array.isArray(proposalsList)) return;
        const mapped: NegotiationItem[] = proposalsList.map((raw: any) => {
          const counterPrice =
            raw.statut === 'refuse' || raw.statut === 'accepte'
              ? extractCounterOfferPrice(raw.admin_response)
              : null;
          const rawProposed = Number(raw.prix_propose) || 0;
          const acceptedValid = raw.statut === 'accepte' && isAcceptedNegotiationValid(raw);
          const pendingValid = raw.statut === 'en_attente' && isPendingNegotiationValid(raw);
          const expDate =
            raw.statut === 'accepte'
              ? negotiationExpiresAt(raw)
              : raw.statut === 'en_attente'
                ? negotiationExpiresAt({ created_at: raw.created_at })
                : null;
          return {
            id: String(raw.id),
            productId: String(raw.product_id ?? raw.product?.id ?? ''),
            productName: raw.product?.nom || `Produit #${raw.product_id ?? raw.product?.id ?? '?'}`,
            productImage: absImageUrl(raw.product?.image_url) ?? undefined,
            vendorName: '',
            originalPrice: Number(raw.product?.prix) || rawProposed,
            proposedPrice: raw.statut === 'accepte' && counterPrice != null ? counterPrice : rawProposed,
            ...(counterPrice != null ? { counterPrice } : {}),
            minPrice: Number(raw.product?.prix_minimum) || 0,
            quantite: Number(raw.quantite) || 1,
            orderId: raw.commande?.id ?? raw.order_id,
            adminResponse: raw.admin_response || undefined,
            ...((acceptedValid || pendingValid) && expDate ? { expiresAt: expDate.toISOString() } : {}),
            status:
              raw.statut === 'accepte'
                ? acceptedValid
                  ? 'accepted'
                  : 'expired'
                : counterPrice != null
                  ? 'counter_offer'
                  : raw.statut === 'refuse'
                    ? 'rejected'
                    : raw.statut === 'expire' || (raw.statut === 'en_attente' && !pendingValid)
                      ? 'expired'
                      : 'pending',
            createdAt: raw.created_at ? new Date(raw.created_at).toLocaleDateString('fr-FR') : tx('Récemment'),
          };
        });
        dispatch(setProposals(mapped));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [productId, refreshTick, dispatch]);

  // Gère l’action utilisateur SendOffer.
  const handleSendOffer = async () => {
    if (!product) return;
    const numPrice = parseInt(offerInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error(tx('Veuillez entrer un montant valide en FCFA'));
      return;
    }
    if (product.prixMinimum > 0 && numPrice < product.prixMinimum) {
      toast.error(tr('Votre offre est trop basse pour ce produit. Veuillez proposer un montant plus élevé.', 'Your offer is too low for this product. Please propose a higher amount.'));
      return;
    }
    if (product.prix > 0 && numPrice > product.prix) {
      toast.error(tr(`Votre proposition ne peut pas dépasser le prix catalogue (${product.prix.toLocaleString('fr-FR')} FCFA).`, `Your offer cannot exceed the catalog price (${product.prix.toLocaleString('fr-FR')} FCFA).`));
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await negotiationApi.createProposal({
        product_id: Number(product.id),
        prix_propose: numPrice,
        quantite: quantity,
      });
      const proposalId = Number((created as { data?: { id?: number }; id?: number })?.data?.id ?? (created as { id?: number })?.id);
      dispatch(
        submitOffer({
          id: Number.isFinite(proposalId) && proposalId > 0 ? String(proposalId) : undefined,
          productId: product.id,
          productName: product.nom,
          productImage: product.image,
          originalPrice: product.prix,
          proposedPrice: numPrice,
          minPrice: product.prixMinimum,
          quantite: quantity,
        }),
      );
      toast.success(tx("Offre envoyée au marché ! Vous serez notifié de sa réponse."));
    } catch (e: unknown) {
      toast.error(formatApiError(extractApiError(e)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gère l’action utilisateur AddNegotiatedToCart.
  const handleAddNegotiatedToCart = (price: number) => {
    if (!product) return;
    const negotiatedProduct: Product = {
      ...product,
      prix: price,
      negotiated: { oldPrice: product.prix },
    };
    dispatch(add({ product: negotiatedProduct, quantity }));
    toast.success(tr(`Ajouté au panier au prix négocié de ${price.toLocaleString('fr-FR')} FCFA !`, `Added to cart at the negotiated price of ${price.toLocaleString('fr-FR')} FCFA!`));
  };

  // Enregistre ou crée les données via addToCart.
  const addToCart = () => {
    if (!product) return;
    dispatch(add({ product, quantity }));
    toast.success(tx("Ajouté au panier"));
  };

  // Helper buyNow : réalise le traitement métier associé.
  const buyNow = () => {
    if (!product) return;
    dispatch(add({ product, quantity }));
    navigate({ to: '/panier' });
  };

  if (isLoading) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="mx-auto w-full max-w-[1200px] px-4 pt-[76px] md:px-lg">
          <ProductDetailSkeleton label={tx('Chargement du produit…')} />
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="flex justify-center pt-[80px] px-md">
          <div className="w-full max-w-[560px] bg-bg-card rounded-xl border border-border-default p-xl">
            <ApiErrorState
              title={tx("Impossible de charger le produit")}
              message={loadError}
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          </div>
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="flex justify-center pt-[80px] px-md">
          <div className="w-full max-w-[560px] bg-bg-card rounded-xl border border-border-default p-xl">
            <EmptyState
              icon={<MIcon name="search_off" className="text-4xl text-primary" />}
              title={tx("Produit introuvable")}
              description={tx("Ce produit n’existe pas ou n’est plus disponible au marché.")}
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

  const categoryNom = apiProduct?.categorie?.nom ?? tx("Catalogue");
  const unavailable = !apiProduct || apiProduct.disponible === false || (apiProduct.stock != null && Number(apiProduct.stock) <= 0);

  // Retourne le rendu JSX du composant.
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-bg-secondary font-body text-ink">
      <ClientNavbar />
      <div className="flex flex-1 justify-center px-3 pb-[80px] pt-[64px] sm:px-6 md:px-12 md:pb-8 md:pt-[72px] lg:px-20 xl:px-40">
        <div className="flex w-full max-w-[1200px] flex-1 flex-col">
          <div className="flex flex-wrap gap-2 py-3 md:px-10">
            <Link to="/" className="text-xs font-medium leading-normal text-warm-ink sm:text-sm">
              {tx("Accueil")}
            </Link>
            <span className="text-xs font-medium leading-normal text-warm-ink sm:text-sm">/</span>
            <Link to="/catalogue" className="text-xs font-medium leading-normal text-warm-ink sm:text-sm">
              {categoryNom}
            </Link>
            <span className="text-xs font-medium leading-normal text-warm-ink sm:text-sm">/</span>
            <span className="text-xs font-medium leading-normal text-on-surface sm:text-sm">{product.nom}</span>
          </div>

          <main className="grid grid-cols-1 gap-6 rounded-xl bg-bg-card p-4 pb-8 shadow-sm md:gap-8 md:px-10 md:pb-12 lg:grid-cols-2">
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-primary-lighter to-primary-light sm:h-[320px] md:h-[400px]">
                <div
                  className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1 shadow-sm ${
                    unavailable
                      ? 'border-error bg-error-light'
                      : 'border-success bg-success-light'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${unavailable ? 'bg-error' : 'bg-success'}`} />
                  <span className={`text-xs font-semibold ${unavailable ? 'text-error-dark' : 'text-success-dark'}`}>
                    {unavailable ? 'Rupture de stock' : tx("Disponible")}
                  </span>
                </div>
                <ImageWithFallback
                  src={product.image}
                  alt={product.nom}
                  className="h-full w-full object-cover"
                  loading="eager"
                  fallback={(
                    <div className="flex flex-col items-center gap-4 text-primary-hover">
                      <MIcon name="flag_2" style={{ fontSize: 64 }} />
                      <span className="text-xs font-medium opacity-70">{tx("Photo bientôt disponible")}</span>
                    </div>
                  )}
                />
              </div>
              {product.image && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 sm:gap-4">
                  <div className="flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-primary sm:h-[60px] sm:w-[60px]">
                    <ImageWithFallback
                      src={product.image}
                      alt=""
                      className="h-full w-full object-cover"
                      fallback={<MIcon name="image" className="text-primary" />}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-1 text-micro uppercase tracking-widest text-ink-3">{categoryNom}</p>
                <h1 className="text-h1 text-ink">{product.nom}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {apiProduct && apiProduct.stock != null && Number(apiProduct.stock) > 0 && (
                    <span className="text-micro text-ink-2">Stock : {apiProduct.stock} unité(s)</span>
                  )}
                </div>
              </div>

              <hr className="border-line" />

              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold leading-none text-primary">
                  {product.prix.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-label text-ink">{tx("Quantité")}</span>
                <div className="flex items-center rounded-lg border border-line">
                  <button
                    type="button"
                    aria-label={tx("Diminuer")}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="border-r border-line p-2 text-ink transition-colors hover:bg-surface cursor-pointer"
                  >
                    <MIcon name="remove" className="text-[18px]" />
                  </button>
                  <span className="px-6 py-1 font-semibold text-ink">{quantity}</span>
                  <button
                    type="button"
                    aria-label={tx("Augmenter")}
                    onClick={() => setQuantity((q) => q + 1)}
                    className="border-l border-line p-2 text-ink transition-colors hover:bg-surface cursor-pointer"
                  >
                    <MIcon name="add" className="text-[18px]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border-l-[3px] border-[#F59E0B] bg-amber-light p-4 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MIcon name="payments" className="text-[#F59E0B]" />
                    <h3 className="text-sm font-semibold uppercase tracking-tight text-amber-text">
                      {tx("Proposer votre budget")}
                    </h3>
                  </div>
                  <span className="inline-block rounded-full bg-amber-light px-2.5 py-0.5 text-micro font-bold text-amber-text">
                    {tx("Négociation F-10")}
                  </span>
                </div>

                {(!activeNeg || activeNeg.status === 'idle') && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-lg bg-page p-3 text-center">
                        <p className="mb-1 text-[10px] uppercase text-ink-2">{tx("Prix référence")}</p>
                        <p className="font-bold text-ink">
                          {product.prix.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <MIcon name="sync" className="rotate-90 text-[#F59E0B]" />
                      <div className="flex-1 rounded-lg border border-dashed border-[#F59E0B] bg-amber-light p-3 text-center">
                        <p className="mb-1 text-[10px] uppercase text-amber-text">{tx("Votre offre")}</p>
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

                {activeNeg?.status === 'pending' && (
                  <div className="space-y-3 rounded-lg border border-amber-text/40 bg-amber-light p-3">
                    <div className="flex items-center gap-2 text-amber-text">
                      <MIcon name="hourglass_top" className="text-amber-text" />
                      <span className="text-xs font-bold uppercase tracking-wider">{tx("Offre en attente")}</span>
                    </div>
                    <p className="text-xs text-ink">
                      Votre proposition de{' '}
                      <strong className="text-amber-text">
                        {activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA
                      </strong>{' '}
                      a été envoyée au marché. Suivez ou modifiez votre offre dans « Mes Négociations ».
                    </p>
                    <p className="text-[11px] font-medium text-amber-text">
                      {formatNegotiationRemaining(activeNeg.expiresAt, isFr)
                        ? `${formatNegotiationRemaining(activeNeg.expiresAt, isFr)} — ${tr('expire après 12 h sans réponse.', 'expires after 12h with no response.')}`
                        : tr('Les négociations expirent après 12 h.', 'Negotiations expire after 12h.')}
                    </p>
                    <Link
                      to="/negociations"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-text/40 bg-bg-card px-3 py-1.5 text-xs font-bold text-amber-text transition-colors hover:bg-amber-light"
                    >
                      <MIcon name="edit" className="text-[14px]" />
                      {tx('Modifier dans Mes Négociations')}
                    </Link>
                  </div>
                )}

                {activeNeg?.status === 'accepted' && (
                  <div className="space-y-3 rounded-lg border border-success/40 bg-success-light/50 p-3">
                    <div className="flex items-center gap-2 text-success-dark">
                      <MIcon name="verified" className="text-success" />
                      <span className="text-xs font-bold uppercase tracking-wider">{tx("Offre acceptée !")}</span>
                    </div>
                    <p className="text-xs text-ink">
                      {tr(
                        `Votre proposition de ${activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA a été acceptée !`,
                        `Your proposal of ${activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA was accepted!`,
                      )}{' '}
                      {formatNegotiationRemaining(activeNeg.expiresAt, isFr)
                        ? `${formatNegotiationRemaining(activeNeg.expiresAt, isFr)} — ${tr('applicable sur toutes vos commandes de ce produit.', 'valid on all your orders for this product.')}`
                        : tr('Prix valable 12 h sur toutes vos commandes de ce produit.', 'Price valid for 12h on all your orders for this product.')}
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
                        className="rounded-lg border border-line bg-bg-card px-3 py-2 text-xs font-bold text-ink-2 cursor-pointer"
                      >
                        {tx("Annuler")}
                      </button>
                    </div>
                  </div>
                )}

                {activeNeg?.status === 'counter_offer' && (
                  <div className="space-y-3 rounded-lg border border-amber-text/40 bg-amber-light p-3">
                    <div className="flex items-center gap-2 text-amber-text">
                      <MIcon name="sync" className="text-amber-text" />
                      <span className="text-xs font-bold uppercase tracking-wider">{tx("Contre-offre du marché")}</span>
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
                        disabled={isSubmitting}
                        onClick={async () => {
                          if (activeNeg.counterPrice && /^\d+$/.test(String(activeNeg.id))) {
                            setIsSubmitting(true);
                            try {
                              await negotiationApi.acceptCounterProposal(activeNeg.id, {
                                product_id: Number(product.id),
                                prix_propose: activeNeg.counterPrice,
                                quantite: activeNeg.quantite ?? quantity,
                              });
                              dispatch(acceptCounterOffer({ productId: product.id }));
                              toast.success(tx("Contre-offre acceptée !"));
                            } catch (e: unknown) {
                              toast.error(formatApiError(extractApiError(e)));
                            } finally {
                              setIsSubmitting(false);
                            }
                            return;
                          }
                          dispatch(acceptCounterOffer({ productId: product.id }));
                          toast.success(tx("Contre-offre acceptée !"));
                        }}
                        className="w-full rounded-lg bg-amber-text py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50 cursor-pointer"
                      >
                        Accepter ({activeNeg.counterPrice?.toLocaleString('fr-FR')} FCFA)
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(cancelNegotiation({ productId: product.id }))}
                        className="rounded-lg border border-line bg-bg-card px-3 py-2 text-xs font-bold text-ink-2 cursor-pointer"
                      >
                        {tx("Refuser")}
                      </button>
                    </div>
                  </div>
                )}

                {activeNeg?.status === 'rejected' && (
                  <div className="space-y-3 rounded-lg border border-error/40 bg-error-light p-3">
                    <p className="text-xs font-bold text-error">
                      Offre refusée ({activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA)
                    </p>
                    <p className="text-xs text-ink">
                      {tx("Votre proposition n’a pas été acceptée. Vous pouvez soumettre une nouvelle offre.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => dispatch(cancelNegotiation({ productId: product.id }))}
                      className="w-full rounded-lg bg-bg-card border border-line py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                    >
                      {tx("Faire une nouvelle offre")}
                    </button>
                  </div>
                )}

                {activeNeg?.status === 'expired' && (
                  <div className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-3">
                    <p className="text-xs font-bold text-text-main">
                      {tr(
                        `Offre expirée (${activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA)`,
                        `Offer expired (${activeNeg.proposedPrice.toLocaleString('fr-FR')} FCFA)`,
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {tr(
                        'La validité de 12 h de cette proposition est dépassée. Vous pouvez soumettre une nouvelle offre.',
                        'This proposal’s 12-hour validity window has ended. You can submit a new offer.',
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => dispatch(cancelNegotiation({ productId: product.id }))}
                      className="w-full rounded-lg bg-bg-card border border-line py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                    >
                      {tx("Faire une nouvelle offre")}
                    </button>
                  </div>
                )}
              </div>

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
                  className="w-full rounded-[10px] border border-primary bg-bg-card py-3.5 font-bold text-primary transition-all hover:bg-primary-lighter cursor-pointer disabled:opacity-50"
                >
                  {tx("Acheter maintenant")}
                </button>
              </div>
            </div>
          </main>

          <section className="mx-auto mt-8 mb-20 w-full max-w-[1200px] overflow-hidden rounded-xl bg-bg-card shadow-sm">
            <div className="flex flex-wrap border-b border-line">
              {(
                [
                  ['description', 'Description'],
                  ['origine', tx("Origine & Qualité")],
                  ['avis', tx("Avis")],
                ] as [TabId, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={clsx(
                    'cursor-pointer whitespace-nowrap px-4 py-3 text-sm sm:px-8 sm:py-4',
                    tab === id ? 'active-tab font-semibold' : 'font-medium text-ink-2 hover:text-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'description' && (
              <div className="flex flex-col gap-4 p-4 sm:p-8">
                <h3 className="text-h3 text-ink">{tx("Détails du produit")}</h3>
                <p className="max-w-3xl text-body leading-relaxed text-ink-2">
                  {product.description || tx("Aucune description pour ce produit.")}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3">
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">{tx("Catégorie")}</span>
                    <span className="text-sm font-medium text-ink">{categoryNom}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">{tx("Prix de base")}</span>
                    <span className="text-sm font-medium text-ink">
                      {product.prix.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-micro uppercase text-ink-3">{tx("Disponibilité")}</span>
                    <span className="text-sm font-medium text-ink">
                      {unavailable ? 'Rupture de stock' : 'En stock'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'origine' && (
              <div className="flex flex-col gap-4 p-4 md:p-8">
                <EmptyState
                  icon={<MIcon name="travel_explore" className="text-4xl text-primary" />}
                  title={tx("Origine non renseignée")}
                  description={tx("L’origine et la traçabilité des produits ne sont pas encore fournies par la plateforme. Elles s’afficheront ici dès qu’elles seront disponibles.")}
                />
              </div>
            )}

            {tab === 'avis' && (
              <div className="flex flex-col gap-4 p-4 md:p-8">
                <EmptyState
                  icon={<MIcon name="mode_comment" className="text-4xl text-primary" />}
                  title={tx("Aucun avis pour le moment")}
                  description={tx("Le système d’avis clients arrive prochainement. Vos retours après livraison nous aident à faire progresser le marché.")}
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
