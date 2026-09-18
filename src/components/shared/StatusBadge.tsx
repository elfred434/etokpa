import clsx from 'clsx';
import { orderStatus } from '../../theme/tokens';
import type { OrderStatusKey } from '../../theme/tokens';

const CLASSES: Record<OrderStatusKey, string> = {
  pending: 'status-pending',
  preparing: 'status-preparing',
  shipping: 'status-shipping',
  delivered: 'status-delivered',
  cancelled: 'status-cancelled',
};

interface StatusBadgeProps {
  status: OrderStatusKey;
  className?: string;
}

/** Statut de commande : fond clair + bordure + pastille 8px (design.md §4.5, CDC §4.3). */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={clsx(CLASSES[status], className)}>
      {orderStatus[status].label}
    </span>
  );
}
