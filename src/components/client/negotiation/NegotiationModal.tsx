import { useAppDispatch, useAppSelector } from '../../../hooks/useStore';
import MIcon from '../../shared/MIcon';
import { DIALOG_CANCEL_BTN_CLASS, DialogFrame } from '../../shared/DialogFrame';
import { useLanguage } from '../../../context/LanguageContext';
import { add } from '../../../store/slices/cart/cartSlice';
import { acceptCounterOffer, cancelNegotiation } from '../../../store/slices/negotiation/negotiationSlice';
import toast from 'react-hot-toast';
import type { Product } from '../../../types/models';

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NegotiationModal({ isOpen, onClose }: NegotiationModalProps) {
  const dispatch = useAppDispatch();
  const { isFr } = useLanguage();
  const history = useAppSelector((state) => state.negotiation.history);

  if (!isOpen) return null;

  const handleAddToCart = (neg: typeof history[0]) => {
    const product: Product = {
      id: neg.productId,
      nom: neg.productName,
      origine: neg.vendorName ?? '',
      quantite: '',
      prix: neg.proposedPrice,
      prixMinimum: neg.minPrice,
      categorie: 'vegetable',
      stock: 'available',
      badges: [],
      image: neg.productImage,
      negotiated: { oldPrice: neg.originalPrice },
    };
    dispatch(add({ product, quantity: 1 }));
    toast.success(isFr ? `Ajouté au panier au prix de ${neg.proposedPrice} FCFA` : `Added to cart at ${neg.proposedPrice} FCFA`);
  };

  const handleAcceptCounter = (productId: string, counterPrice: number) => {
    dispatch(acceptCounterOffer({ productId }));
    toast.success(isFr ? `Contre-offre de ${counterPrice} FCFA acceptée !` : `Counter-offer of ${counterPrice} FCFA accepted!`);
  };

  const totalSavings = history
    .filter((n) => n.status === 'accepted')
    .reduce((sum, n) => sum + (n.originalPrice - n.proposedPrice), 0);

  return (
    <DialogFrame
      icon="handshake"
      title={isFr ? 'Mes Négociations en cours (F-10)' : 'My Active Negotiations'}
      subtitle={isFr ? 'Offres de prix proposées en direct au marché' : 'Price offers submitted directly to the market'}
      maxWidth="37.5rem"
      bodyClassName="space-y-3"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={DIALOG_CANCEL_BTN_CLASS}>
          {isFr ? 'Fermer' : 'Close'}
        </button>
      }
    >
      {totalSavings > 0 && (
        <div className="rounded-xl bg-success-light/70 px-4 py-2.5 border border-success/20 flex items-center justify-between text-xs font-semibold text-success-dark">
          <div className="flex items-center gap-1.5">
            <MIcon name="payments" className="text-success" />
            <span>{isFr ? 'Économies totales négociées :' : 'Total savings negotiated:'}</span>
          </div>
          <span className="font-bold text-sm text-primary">{totalSavings.toLocaleString('fr-FR')} FCFA</span>
        </div>
      )}

      {history.length === 0 ? (
        <div className="py-12 text-center text-ink-2">
          <MIcon name="handshake" className="mx-auto text-[48px] text-ink-3 mb-2" />
          <p className="font-medium">{isFr ? 'Aucune négociation en cours' : 'No active negotiations'}</p>
          <p className="text-xs text-ink-3 mt-1">
            {isFr ? 'Proposez un prix sur une fiche produit pour commencer à négocier !' : 'Make an offer on a product page to start bargaining!'}
          </p>
        </div>
      ) : (
        history.map((neg) => (
          <div
            key={neg.id}
            className="rounded-xl border border-line bg-card p-3 sm:p-4 transition-all hover:border-primary-light"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-page border border-line flex items-center justify-center">
                  {neg.productImage ? (
                    <img src={neg.productImage} alt={neg.productName} className="h-full w-full object-cover" />
                  ) : (
                    <MIcon name="image" className="text-ink-3" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-ink">{neg.productName}</h4>
                  <p className="text-micro text-ink-3">{neg.createdAt}</p>
                </div>
              </div>

              {neg.status === 'accepted' && (
                <span className="shrink-0 rounded-full bg-success-light px-2.5 py-1 text-micro font-bold text-success-dark">
                  {isFr ? 'Offre acceptée' : 'Offer accepted'}
                </span>
              )}
              {neg.status === 'counter_offer' && (
                <span className="shrink-0 rounded-full bg-amber-light px-2.5 py-1 text-micro font-bold text-amber-text">
                  {isFr ? 'Contre-offre' : 'Counter offer'}
                </span>
              )}
              {neg.status === 'pending' && (
                <span className="shrink-0 rounded-full bg-page px-2.5 py-1 text-micro font-bold text-ink-2">
                  {isFr ? 'En traitement...' : 'Processing...'}
                </span>
              )}
              {neg.status === 'rejected' && (
                <span className="shrink-0 rounded-full bg-error-light px-2.5 py-1 text-micro font-bold text-error">
                  {isFr ? 'Offre refusée' : 'Offer rejected'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-surface p-2.5 text-xs my-2">
              <span className="text-ink-2">
                {isFr ? 'Prix d’origine :' : 'Original price:'}{' '}
                <span className="line-through font-medium">{neg.originalPrice} FCFA</span>
              </span>
              <span className="font-bold text-primary text-sm">
                {isFr ? 'Votre offre :' : 'Your offer:'} {neg.proposedPrice.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {neg.status === 'accepted' && (
                <button
                  type="button"
                  onClick={() => handleAddToCart(neg)}
                  className="scale-interaction rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover"
                >
                  {isFr ? 'Ajouter au panier' : 'Add to cart'}
                </button>
              )}

              {neg.status === 'counter_offer' && neg.counterPrice && (
                <button
                  type="button"
                  onClick={() => handleAcceptCounter(neg.productId, neg.counterPrice!)}
                  className="scale-interaction rounded-lg bg-amber-text px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                >
                  {isFr ? `Accepter ${neg.counterPrice} FCFA` : `Accept ${neg.counterPrice} FCFA`}
                </button>
              )}

              <button
                type="button"
                onClick={() => dispatch(cancelNegotiation({ productId: neg.productId }))}
                className="rounded-lg p-1.5 text-xs text-ink-3 hover:text-error hover:bg-error-light transition-colors"
                title={isFr ? 'Supprimer la négociation' : 'Delete negotiation'}
              >
                <MIcon name="delete" className="text-sm" />
              </button>
            </div>
          </div>
        ))
      )}
    </DialogFrame>
  );
}
