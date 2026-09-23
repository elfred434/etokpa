import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import { acceptCounterOffer, cancelNegotiation, type NegotiationItem } from '../../../store/slices/negotiation/negotiationSlice';
import { useLanguage } from '../../../context/LanguageContext';
import type { Product } from '../../../types/models';

type FilterTab = 'all' | 'pending' | 'accepted' | 'rejected';

/**
 * Page dédiée Mes Négociations — conforme au design Stitch `mes_n_gociations_tokpa/code.html`
 */
export default function NegotiationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isFr } = useLanguage();
  const history = useAppSelector((state) => state.negotiation.history);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const pendingCount = history.filter((n) => n.status === 'pending' || n.status === 'counter_offer').length;
  const acceptedCount = history.filter((n) => n.status === 'accepted').length;
  const rejectedCount = history.filter((n) => n.status === 'rejected').length;

  const filteredHistory = history.filter((n) => {
    if (activeTab === 'pending') return n.status === 'pending' || n.status === 'counter_offer';
    if (activeTab === 'accepted') return n.status === 'accepted';
    if (activeTab === 'rejected') return n.status === 'rejected';
    return true;
  });

  const handleAddToCart = (neg: NegotiationItem) => {
    const product: Product = {
      id: neg.productId,
      nom: neg.productName,
      origine: neg.vendorName || 'Marché Dantokpa',
      quantite: 'unité',
      prix: neg.proposedPrice,
      prixMinimum: neg.minPrice,
      categorie: 'vegetable',
      stock: 'available',
      badges: [],
      image: neg.productImage,
      negotiated: { oldPrice: neg.originalPrice },
    };
    dispatch(add({ product, quantity: 1 }));
    toast.success(isFr ? `Ajouté au panier au prix négocié de ${neg.proposedPrice.toLocaleString('fr-FR')} FCFA` : `Added to cart at negotiated price of ${neg.proposedPrice.toLocaleString('fr-FR')} FCFA`);
    navigate({ to: '/panier' });
  };

  const handleAcceptCounter = (productId: string, counterPrice: number) => {
    dispatch(acceptCounterOffer({ productId }));
    toast.success(isFr ? `Contre-offre de ${counterPrice.toLocaleString('fr-FR')} FCFA acceptée !` : `Counter offer of ${counterPrice.toLocaleString('fr-FR')} FCFA accepted!`);
  };

  const handleDiscussionClick = (neg: NegotiationItem) => {
    toast(isFr ? `Discussion en direct avec ${neg.vendorName || 'le vendeur'} ouverte.` : `Live chat with ${neg.vendorName || 'seller'} open.`, {
      icon: '💬',
    });
  };

  return (
    <div className="min-h-screen bg-bg-app pb-24 text-ink">
      <ClientNavbar />

      <main className="mx-auto max-w-[1000px] px-md pt-[76px] md:px-lg">
        {/* Header Section */}
        <div className="mb-lg">
          <h1 className="font-h1 text-h1 text-on-surface mb-xs">
            {isFr ? 'Mes Négociations' : 'My Negotiations'}
          </h1>
          <p className="font-body text-body text-text-secondary">
            {isFr
              ? 'Suivez vos offres en cours, gérez vos contre-propositions et concluez vos meilleures affaires ici.'
              : 'Track active offers, manage counter-proposals and close your best deals here.'}
          </p>
        </div>

        <div className="flex flex-col gap-lg lg:flex-row">
          {/* Main Content: Negotiations List */}
          <div className="flex-1 space-y-md">
            {/* Filters / Tabs */}
            <nav className="mb-md flex border-b border-border-default overflow-x-auto whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={clsx(
                  'px-md py-sm font-label text-label transition-colors',
                  activeTab === 'all'
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'text-on-surface-variant hover:text-primary',
                )}
              >
                {isFr ? `Toutes (${history.length})` : `All (${history.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={clsx(
                  'px-md py-sm font-label text-label transition-colors',
                  activeTab === 'pending'
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'text-on-surface-variant hover:text-primary',
                )}
              >
                {isFr ? `En cours (${pendingCount})` : `Pending (${pendingCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('accepted')}
                className={clsx(
                  'px-md py-sm font-label text-label transition-colors',
                  activeTab === 'accepted'
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'text-on-surface-variant hover:text-primary',
                )}
              >
                {isFr ? `Acceptées (${acceptedCount})` : `Accepted (${acceptedCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rejected')}
                className={clsx(
                  'px-md py-sm font-label text-label transition-colors',
                  activeTab === 'rejected'
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'text-on-surface-variant hover:text-primary',
                )}
              >
                {isFr ? `Refusées (${rejectedCount})` : `Rejected (${rejectedCount})`}
              </button>
            </nav>

            {/* Negotiation Items */}
            {filteredHistory.length === 0 ? (
              <div className="rounded-card border border-border-default bg-bg-card p-lg text-center shadow-sm">
                <MIcon name="handshake" className="mx-auto text-[48px] text-text-tertiary mb-2" />
                <p className="font-h3 text-h3 font-medium text-on-surface">
                  {isFr ? 'Aucune négociation dans cette catégorie' : 'No negotiations in this category'}
                </p>
                <p className="mt-1 font-secondary text-secondary">
                  {isFr ? 'Rendez-vous sur le marché pour proposer votre prix aux vendeurs !' : 'Visit the market to submit price offers to vendors!'}
                </p>
              </div>
            ) : (
              filteredHistory.map((neg) => {
                const isAccepted = neg.status === 'accepted';
                const isCounter = neg.status === 'counter_offer';
                const isPending = neg.status === 'pending';
                const isRejected = neg.status === 'rejected';

                return (
                  <article
                    key={neg.id}
                    className={clsx(
                      'flex flex-col sm:flex-row gap-md items-start rounded-card p-md shadow-sm border border-border-default bg-bg-card transition-all',
                      isAccepted && 'border-l-4 border-l-success',
                      isCounter && 'border-l-4 border-l-primary',
                      isPending && 'border-l-4 border-l-[#F59E0B]',
                      isRejected && 'border-l-4 border-l-error',
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="h-24 w-24 shrink-0 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden border border-border-default">
                      {neg.productImage ? (
                        <img src={neg.productImage} alt={neg.productName} className="h-full w-full object-cover" />
                      ) : (
                        <MIcon
                          name={
                            neg.productName.toLowerCase().includes('riz') || neg.productName.toLowerCase().includes('légume')
                              ? 'restaurant'
                              : neg.productName.toLowerCase().includes('huile')
                              ? 'oil_barrel'
                              : 'inventory_2'
                          }
                          className="text-4xl text-outline"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex justify-between items-start mb-xs gap-2">
                        <div>
                          <h3 className="font-h3 text-h3 text-on-surface truncate">{neg.productName}</h3>
                          <p className="font-secondary text-secondary">
                            {isFr ? 'Vendu par :' : 'Sold by:'}{' '}
                            <span className="font-medium text-on-surface">{neg.vendorName || 'Agro-Business Bénin'}</span>
                          </p>
                        </div>

                        {/* Status Badge */}
                        {isPending && (
                          <span className="inline-flex items-center px-sm py-[2px] rounded-full bg-amber-light text-amber-text text-micro font-micro uppercase tracking-wider shrink-0">
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-amber-text inline-block" />
                            {isFr ? 'En attente du vendeur' : 'Waiting for seller'}
                          </span>
                        )}
                        {isCounter && (
                          <span className="inline-flex items-center px-sm py-[2px] rounded-full bg-primary-light text-primary-deep text-micro font-micro uppercase tracking-wider shrink-0">
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-primary-deep inline-block" />
                            {isFr ? 'Contre-proposition' : 'Counter proposal'}
                          </span>
                        )}
                        {isAccepted && (
                          <span className="inline-flex items-center px-sm py-[2px] rounded-full bg-success-light text-success-dark text-micro font-micro uppercase tracking-wider shrink-0">
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-success inline-block" />
                            {isFr ? 'Offre acceptée' : 'Offer accepted'}
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center px-sm py-[2px] rounded-full bg-error-light text-error-dark text-micro font-micro uppercase tracking-wider shrink-0">
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-error inline-block" />
                            {isFr ? 'Offre refusée' : 'Offer rejected'}
                          </span>
                        )}
                      </div>

                      {/* Prices comparison */}
                      <div className="flex flex-wrap gap-md mt-md mb-lg">
                        <div className="flex flex-col">
                          <span className="font-secondary text-secondary">{isFr ? 'Prix initial' : 'Original price'}</span>
                          <span className="font-price text-price text-text-secondary line-through opacity-70">
                            {neg.originalPrice.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>

                        {isCounter ? (
                          <>
                            <div className="flex flex-col bg-amber-light border border-[#F59E0B] px-sm py-xs rounded-lg">
                              <span className="font-secondary text-amber-text">{isFr ? 'Votre offre' : 'Your offer'}</span>
                              <span className="font-price text-price text-amber-text">
                                {neg.proposedPrice.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                            <div className="flex flex-col bg-primary-light border border-primary px-sm py-xs rounded-lg">
                              <span className="font-secondary text-primary-deep">{isFr ? 'Contre-offre' : 'Counter offer'}</span>
                              <span className="font-price text-price text-primary-deep">
                                {(neg.counterPrice || neg.minPrice).toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </>
                        ) : isAccepted ? (
                          <div className="flex flex-col bg-success-light border border-success-dark px-sm py-xs rounded-lg">
                            <span className="font-secondary text-success-dark">{isFr ? 'Prix final accordé' : 'Final price'}</span>
                            <span className="font-price text-price text-success-dark">
                              {neg.proposedPrice.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col bg-amber-light border border-[#F59E0B] px-sm py-xs rounded-lg">
                            <span className="font-secondary text-amber-text">{isFr ? 'Votre offre' : 'Your offer'}</span>
                            <span className="font-price text-price text-amber-text">
                              {neg.proposedPrice.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-sm">
                        {isAccepted && (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(neg)}
                            className="px-md py-2 bg-primary-container text-white font-medium text-label rounded-button hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-xs shadow-sm"
                          >
                            <MIcon name="shopping_basket" className="text-[18px]" />
                            {isFr ? 'Finaliser l’achat' : 'Checkout deal'}
                          </button>
                        )}

                        {isCounter && neg.counterPrice && (
                          <button
                            type="button"
                            onClick={() => handleAcceptCounter(neg.productId, neg.counterPrice!)}
                            className="px-md py-2 bg-primary-container text-white font-medium text-label rounded-button hover:bg-primary-hover active:scale-95 transition-all shadow-sm"
                          >
                            {isFr ? `Accepter ${neg.counterPrice.toLocaleString('fr-FR')} FCFA` : `Accept ${neg.counterPrice.toLocaleString('fr-FR')} FCFA`}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDiscussionClick(neg)}
                          className="px-md py-2 border border-primary text-primary font-medium text-label rounded-button hover:bg-primary-tint active:scale-95 transition-all"
                        >
                          {isFr ? 'Voir la discussion' : 'View chat'}
                        </button>

                        <button
                          type="button"
                          onClick={() => dispatch(cancelNegotiation({ productId: neg.productId }))}
                          className="px-md py-2 bg-white border border-border-default text-on-surface font-medium text-label rounded-button hover:bg-bg-secondary hover:text-error active:scale-95 transition-all"
                        >
                          {isFr ? 'Annuler' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Sidebar: Guide */}
          <aside className="w-full lg:w-[300px] shrink-0">
            <div className="sticky top-[80px] rounded-card border border-border-default bg-white p-lg shadow-sm">
              <div className="mb-md flex items-center gap-sm text-primary">
                <MIcon name="tips_and_updates" />
                <h2 className="font-h2 text-h2 font-bold">{isFr ? 'Guide de Négociation' : 'Bargaining Guide'}</h2>
              </div>
              <p className="font-secondary text-secondary mb-md">
                {isFr
                  ? 'Sur TOKPa, la négociation est un art. Voici comment obtenir le meilleur prix :'
                  : 'On TOKPa, bargaining is an art. Here is how to get the best price:'}
              </p>

              <ul className="space-y-md">
                <li className="flex gap-sm">
                  <span className="font-bold text-primary">1.</span>
                  <div className="font-body text-body text-on-surface">
                    <p className="font-bold">{isFr ? 'Restez réaliste' : 'Be realistic'}</p>
                    <p className="text-secondary">
                      {isFr
                        ? 'Une offre trop basse est souvent rejetée immédiatement. Proposez -10% à -15%.'
                        : 'Offers that are too low are rejected immediately. Aim for -10% to -15%.'}
                    </p>
                  </div>
                </li>
                <li className="flex gap-sm">
                  <span className="font-bold text-primary">2.</span>
                  <div className="font-body text-body text-on-surface">
                    <p className="font-bold">{isFr ? 'Soyez réactif' : 'Be responsive'}</p>
                    <p className="text-secondary">
                      {isFr
                        ? 'Les vendeurs apprécient les clients qui répondent vite aux contre-propositions.'
                        : 'Vendors appreciate buyers who respond quickly to counter-proposals.'}
                    </p>
                  </div>
                </li>
                <li className="flex gap-sm">
                  <span className="font-bold text-primary">3.</span>
                  <div className="font-body text-body text-on-surface">
                    <p className="font-bold">{isFr ? 'Achat groupé' : 'Bulk orders'}</p>
                    <p className="text-secondary">
                      {isFr
                        ? 'Indiquez au vendeur si vous comptez acheter plusieurs articles pour plus de poids.'
                        : 'Mention to the vendor if you intend to buy multiple items.'}
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-lg rounded-lg border border-primary-light bg-primary-tint p-md">
                <p className="font-label text-label font-medium italic text-primary-deep">
                  {isFr ? '"Le marché appartient à ceux qui osent proposer."' : '"The market belongs to those who dare to bargain."'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <ClientBottomNav />
    </div>
  );
}
