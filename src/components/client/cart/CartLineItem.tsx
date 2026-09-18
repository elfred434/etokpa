import { IconTrash } from '@tabler/icons-react';
import ProductPlaceholder from '../catalog/ProductPlaceholder';
import QuantityPicker from './QuantityPicker';
import { formatFCFA } from '../../../utils/format';
import type { CartItem } from '../../../types/models';

interface CartLineItemProps {
  item: CartItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/** Ligne du panier : visuel, nom, origine, prix unitaire, quantité, sous-total, suppression. */
export default function CartLineItem({ item, onQuantityChange, onRemove }: CartLineItemProps) {
  const { product, quantite } = item;

  return (
    <div className="card flex flex-wrap items-center gap-md p-md">
      <ProductPlaceholder categorie={product.categorie} size="thumb" />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-h3 text-ink">{product.nom}</h3>
        <p className="text-[12px] text-ink-2">
          {product.origine} · {formatFCFA(product.prix)} / {product.quantite}
        </p>
      </div>

      <QuantityPicker quantity={quantite} onChange={(q) => onQuantityChange(product.id, q)} />

      <span className="w-[110px] text-right price">{formatFCFA(product.prix * quantite)}</span>

      <button
        type="button"
        onClick={() => onRemove(product.id)}
        aria-label={`Retirer ${product.nom} du panier`}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] text-error-dark transition-colors hover:bg-error-light"
      >
        <IconTrash size={18} />
      </button>
    </div>
  );
}
