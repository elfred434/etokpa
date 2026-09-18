import { IconPlus } from '@tabler/icons-react';
import Badge from '../../shared/Badge';
import ProductPlaceholder from './ProductPlaceholder';
import { formatFCFA } from '../../../utils/format';
import type { Product } from '../../../types/models';

interface ProductCardProps {
  product: Product;
  onAdd?: (product: Product) => void;
}

/** Carte produit (maquette catalogue) : badges, visuel, nom, origine · quantité, prix + bouton « + ». */
export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const out = product.stock === 'out';

  return (
    <article className="card relative flex flex-col gap-sm p-md">
      <div className="absolute left-md top-md z-10 flex flex-col items-start gap-xs">
        <Badge variant={product.stock} />
        {product.badges.map((b) => (
          <Badge key={b} variant={b} label={b === 'promo' ? 'Promo -20%' : undefined} />
        ))}
      </div>

      {product.image ? (
        <img src={product.image} alt={product.nom} className="h-[110px] w-full rounded-[10px] object-cover" />
      ) : (
        <ProductPlaceholder categorie={product.categorie} />
      )}

      <h3 className="text-h3 text-ink">{product.nom}</h3>
      <p className="text-[12px] text-ink-2">
        {product.origine} · {product.quantite}
      </p>

      <div className="mt-auto flex items-center justify-between gap-sm pt-sm">
        <span className="price text-[20px]">{formatFCFA(product.prix)}</span>
        <button
          type="button"
          className="btn btn-primary btn-sm h-10 w-10 !px-0"
          disabled={out}
          onClick={() => onAdd?.(product)}
          aria-label={`Ajouter ${product.nom} au panier`}
        >
          <IconPlus size={18} stroke={2.5} />
        </button>
      </div>
    </article>
  );
}
