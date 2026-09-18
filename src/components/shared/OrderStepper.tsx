import clsx from 'clsx';
import { IconCheck, IconX, IconClock, IconBasket, IconMotorbike, IconHome } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import type { OrderStatusKey } from '../../theme/tokens';

const FLOW: { key: OrderStatusKey; label: string; icon: TablerIcon }[] = [
  { key: 'pending', label: 'En attente', icon: IconClock },
  { key: 'preparing', label: 'En préparation', icon: IconBasket },
  { key: 'shipping', label: 'En livraison', icon: IconMotorbike },
  { key: 'delivered', label: 'Livré', icon: IconHome },
];

interface OrderStepperProps {
  status: OrderStatusKey;
  className?: string;
}

/**
 * Progression du flux unique CDC §4.3 :
 * En attente → En préparation → En livraison → Livré.
 * Statut « Annulé » : bandeau d'arrêt avec croix.
 */
export default function OrderStepper({ status, className }: OrderStepperProps) {
  if (status === 'cancelled') {
    return (
      <div
        className={clsx(
          'flex items-center justify-center gap-sm rounded-[10px] border border-error-border bg-error-light p-md text-[13px] font-medium text-error-dark',
          className,
        )}
      >
        <IconX size={18} />
        Commande annulée
      </div>
    );
  }

  const currentIndex = FLOW.findIndex((s) => s.key === status);

  return (
    <div className={clsx('relative px-2', className)}>
      <div className="absolute left-6 right-6 top-4 h-[2px] bg-line" aria-hidden="true" />
      <div
        className="absolute left-6 top-4 h-[2px] bg-primary transition-all duration-300"
        style={{ width: `calc((100% - 48px) * ${currentIndex / (FLOW.length - 1)})` }}
        aria-hidden="true"
      />
      <div className="relative flex justify-between">
        {FLOW.map(({ key, label, icon: Icon }, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={key} className="z-10 flex flex-col items-center gap-sm">
              <span
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  done && 'bg-primary text-white',
                  active && 'bg-primary text-white shadow-[0_0_0_4px_var(--color-primary-lighter)]',
                  !done && !active && 'bg-line text-ink-2',
                )}
              >
                {done ? <IconCheck size={16} stroke={3} /> : <Icon size={16} />}
              </span>
              <span
                className={clsx(
                  'text-[12px]',
                  active ? 'font-semibold text-primary' : done ? 'font-medium text-ink' : 'font-medium text-ink-2',
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
