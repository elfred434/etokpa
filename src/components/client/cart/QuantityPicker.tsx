import clsx from 'clsx';
import { IconMinus, IconPlus } from '@tabler/icons-react';

interface QuantityPickerProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/** Sélecteur de quantité − / + (panier, F-09). */
export default function QuantityPicker({ quantity, onChange, min = 1, max = 99, className }: QuantityPickerProps) {
  return (
    <div className={clsx('flex items-center rounded-[10px] border-[1.5px] border-line bg-card', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Diminuer la quantité"
        className="flex h-9 w-9 items-center justify-center text-ink-2 transition-colors hover:text-primary disabled:opacity-40"
      >
        <IconMinus size={16} />
      </button>
      <span className="w-8 text-center text-[14px] font-semibold text-ink" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        aria-label="Augmenter la quantité"
        className="flex h-9 w-9 items-center justify-center text-ink-2 transition-colors hover:text-primary disabled:opacity-40"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
