import { IconShieldCheck, IconInfoCircle } from '@tabler/icons-react';
import FedaPayButton from '../checkout/FedaPayButton';
import { formatFCFA } from '../../../utils/format';

interface CartSummaryProps {
  subtotal: number;
  savings: number;
  deliveryFee: number;
  onPaid: () => void;
  onContinueShopping: () => void;
}

/** Colonne droite « Récapitulatif » de la maquette panier (sticky). */
export default function CartSummary({
  subtotal,
  savings,
  deliveryFee,
  onPaid,
  onContinueShopping,
}: CartSummaryProps) {
  const total = subtotal - savings + deliveryFee;

  return (
    <div className="sticky top-[72px] rounded-lg border border-line/50 bg-card p-lg shadow-sm">
      <h2 className="mb-lg text-h2 text-ink">Récapitulatif</h2>

      <div className="space-y-sm border-b border-line pb-lg">
        <div className="flex items-center justify-between">
          <span className="text-body text-ink-2">Sous-total</span>
          <span className="text-body font-medium text-ink">{formatFCFA(subtotal)}</span>
        </div>
        {savings > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-body text-ink-2">Économie (négociations)</span>
            <span className="text-body font-medium text-success">-{formatFCFA(savings)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-body text-ink-2">Frais de livraison</span>
          <span className="text-body font-medium text-ink">{formatFCFA(deliveryFee)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-lg">
        <span className="text-h2 text-ink">Total</span>
        <span className="text-[22px] font-bold text-primary">{formatFCFA(total)}</span>
      </div>

      <div className="flex flex-col gap-md">
        <FedaPayButton onPaid={onPaid} />
        <div className="flex items-center justify-center gap-xs rounded-full border border-success-light bg-success-light px-md py-sm">
          <IconShieldCheck size={18} className="text-success-dark" />
          <span className="text-micro font-bold text-success-dark">Paiement sécurisé FedaPay</span>
        </div>
        <button
          type="button"
          onClick={onContinueShopping}
          className="w-full rounded-lg border-2 border-primary py-3 text-label font-medium text-primary transition-colors hover:bg-primary-lighter"
        >
          Continuer les achats
        </button>
      </div>

      <div className="mt-lg rounded-lg bg-page p-md">
        <div className="flex gap-sm">
          <IconInfoCircle size={20} className="shrink-0 text-info" />
          <p className="text-secondary text-ink-2">
            Livraison prévue dans <span className="font-bold text-ink">35-50 min</span> par nos coursiers
            partenaires TOKPa Express.
          </p>
        </div>
      </div>
    </div>
  );
}
