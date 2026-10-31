import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { clearProductRemovalNotices } from '../../store/slices/cart/cartSlice';
import { tr, tx } from '../../i18n/tx';
import MIcon from '../shared/MIcon';

/** Avertit le client lorsque le serveur constate la suppression d'un produit encore au panier. */
export default function CartProductRemovalNotice() {
  const dispatch = useAppDispatch();
  const removedProducts = useAppSelector((state) => state.cart.removedProducts);
  if (removedProducts.length === 0) return null;

  return (
    <div className="mb-lg flex min-w-0 items-start gap-3 rounded-xl border border-amber-hover/20 bg-amber-light px-4 py-3 text-amber-text" role="alert" aria-live="assertive">
      <MIcon name="info" className="mt-0.5 shrink-0 text-[20px]" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {removedProducts.length === 1
            ? tr('Désolé ce produit a été supprimé.', 'Sorry, this product has been removed.')
            : tr('Désolé, ces produits ont été supprimés du panier.', 'Sorry, these products have been removed from your cart.')}
        </p>
        <p className="mt-1 break-words text-sm">
          {removedProducts.map((product) => product.name).filter(Boolean).join(', ')}
        </p>
      </div>
      <button
        type="button"
        aria-label={tx('Fermer')}
        className="shrink-0 rounded-lg p-1 text-amber-text hover:bg-bg-secondary hover:text-text-main"
        onClick={() => dispatch(clearProductRemovalNotices())}
      >
        <MIcon name="close" className="text-[18px]" />
      </button>
    </div>
  );
}
