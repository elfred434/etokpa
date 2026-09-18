import clsx from 'clsx';
import { IconTrash, IconPlant2, IconFish, IconBasket, IconSalt, IconGrain } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import QuantityPicker from './QuantityPicker';
import { formatFCFA } from '../../../utils/format';
import type { CartItem, CategoryId } from '../../../types/models';

const THUMB: Record<CategoryId, { cls: string; icon: TablerIcon }> = {
  vegetable: { cls: 'from-[#FFF7ED] to-[#FED7AA] text-primary', icon: IconPlant2 },
  fish: { cls: 'from-[#ECFDF5] to-[#A7F3D0] text-success', icon: IconFish },
  pack: { cls: 'from-[#EFF6FF] to-[#BFDBFE] text-info', icon: IconBasket },
  spice: { cls: 'from-[#FEF3C7] to-[#FDE68A] text-amber-hover', icon: IconSalt },
  grain: { cls: 'from-[#F9FAFB] to-[#F3F4F6] text-ink-2', icon: IconGrain },
};

interface CartLineItemProps {
  item: CartItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/** Ligne du panier, copie conforme de la maquette : vignette 80px, suppression au survol, offre acceptée. */
export default function CartLineItem({ item, onQuantityChange, onRemove }: CartLineItemProps) {
  const { product, quantite } = item;
  const thumb = THUMB[product.categorie];
  const Icon = thumb.icon;

  return (
    <div className="group flex items-center gap-md border-b border-line py-md last:border-0">
      <div
        className={clsx(
          'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br',
          thumb.cls,
        )}
      >
        <Icon size={32} strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-grow">
        {product.negotiated && (
          <div className="mb-xs flex items-center gap-sm">
            <h3 className="truncate text-h3 text-ink">{product.nom}</h3>
            <span className="rounded-full border border-amber/20 bg-amber/10 px-2 py-0.5 text-micro font-bold tracking-wider text-amber uppercase">
              Offre acceptée
            </span>
          </div>
        )}
        {!product.negotiated && <h3 className="truncate text-h3 text-ink">{product.nom}</h3>}
        <p className="truncate text-secondary text-ink-2">
          {product.origine} · {product.quantite}
        </p>
        {product.negotiated ? (
          <div className="mt-xs flex items-center gap-sm">
            <p className="price">{formatFCFA(product.prix)}</p>
            <p className="text-secondary text-ink-3 line-through">{formatFCFA(product.negotiated.oldPrice)}</p>
          </div>
        ) : (
          <p className="price mt-xs">{formatFCFA(product.prix)}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-md">
        <QuantityPicker quantity={quantite} onChange={(q) => onQuantityChange(product.id, q)} />
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Retirer ${product.nom} du panier`}
          className="rounded-full p-2 text-error opacity-0 transition-all hover:bg-error-light focus:opacity-100 group-hover:opacity-100"
        >
          <IconTrash size={20} />
        </button>
      </div>
    </div>
  );
}
