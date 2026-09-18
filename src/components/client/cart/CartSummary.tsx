import { IconLock } from '@tabler/icons-react';
import { formatFCFA } from '../../../utils/format';

interface CartSummaryProps {
  subtotal: number;
  deliveryFee: number | null;
  zoneLabel?: string;
  onSubmit?: () => void;
  submitLabel?: string;
}

/** Récapitulatif de caisse : sous-total, frais de livraison (F-19 affichés avant confirmation), total. */
export default function CartSummary({
  subtotal,
  deliveryFee,
  zoneLabel,
  onSubmit,
  submitLabel = 'Commander',
}: CartSummaryProps) {
  const total = subtotal + (deliveryFee ?? 0);

  return (
    <div className="card space-y-md p-lg">
      <h2 className="text-h3 text-ink">Récapitulatif</h2>

      <div className="flex items-baseline justify-between text-[14px]">
        <span className="text-ink-2">Sous-total</span>
        <span className="font-medium text-ink">{formatFCFA(subtotal)}</span>
      </div>

      <div className="flex items-baseline justify-between text-[14px]">
        <span className="text-ink-2">Frais de livraison{zoneLabel ? ` (${zoneLabel})` : ''}</span>
        <span className="font-medium text-ink">
          {deliveryFee === null ? '—' : formatFCFA(deliveryFee)}
        </span>
      </div>

      <div className="h-px bg-line" aria-hidden="true" />

      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-ink">Total</span>
        <span className="price text-[20px]">{formatFCFA(total)}</span>
      </div>

      <button type="button" className="btn btn-primary w-full" onClick={onSubmit}>
        {submitLabel}
      </button>

      <p className="flex items-center justify-center gap-sm text-[12px] text-ink-3">
        <IconLock size={14} />
        Paiement sécurisé via FedaPay
      </p>
    </div>
  );
}
