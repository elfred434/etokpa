import clsx from 'clsx';
import type { ProductBadge, StockState } from '../../types/models';

export type BadgeVariant = ProductBadge | StockState | 'nego';

const LABELS: Record<BadgeVariant, string> = {
  available: 'Disponible',
  low: 'Stock faible',
  out: 'Épuisé',
  pack: 'Pack',
  promo: 'Promo',
  new: 'Nouveau',
  nego: 'Négociation',
};

const CLASSES: Record<BadgeVariant, string> = {
  available: 'badge-available',
  low: 'badge-low-stock',
  out: 'badge-out',
  pack: 'badge-pack',
  promo: 'badge-promo',
  new: 'badge-new',
  nego: 'badge-nego',
};

interface BadgeProps {
  variant: BadgeVariant;
  /** Remplace le libellé par défaut */
  label?: string;
  className?: string;
}

/** Badge arrondi 20px avec pastille 7px (design.md §4.4). */
export default function Badge({ variant, label, className }: BadgeProps) {
  return (
    <span className={clsx(CLASSES[variant], className)}>
      {label ?? LABELS[variant]}
    </span>
  );
}
