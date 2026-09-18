import clsx from 'clsx';

interface QuantityPickerProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  className?: string;
}

/** Sélecteur − / + compact, style maquette panier (fond app, coins 6px). */
export default function QuantityPicker({ quantity, onChange, min = 1, className }: QuantityPickerProps) {
  return (
    <div className={clsx('flex items-center rounded-[6px] border border-line bg-page p-0.5', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Diminuer la quantité"
        className="flex h-8 w-8 items-center justify-center rounded-[4px] text-primary transition-colors hover:bg-primary-lighter disabled:opacity-40"
      >
        −
      </button>
      <span className="px-3 font-bold text-ink" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label="Augmenter la quantité"
        className="flex h-8 w-8 items-center justify-center rounded-[4px] text-primary transition-colors hover:bg-primary-lighter"
      >
        +
      </button>
    </div>
  );
}
