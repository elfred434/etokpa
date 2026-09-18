import { useState } from 'react';
import clsx from 'clsx';
import { IconCreditCard } from '@tabler/icons-react';
import toast from 'react-hot-toast';

interface FedaPayButtonProps {
  onPaid?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Bouton « Payer avec FedaPay » (maquette panier) — MOCK validé :
 * loading 1,2 s puis succès (échec 1/5 pour tester les états).
 * Branchement FedaPay Checkout.js + backend au Sprint suivant (F-18).
 */
export default function FedaPayButton({ onPaid, disabled, className }: FedaPayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      if (Math.random() > 0.2) {
        toast.success('Paiement accepté par FedaPay');
        onPaid?.();
      } else {
        toast.error('Paiement refusé par FedaPay. Réessayez.');
      }
    }, 1200);
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={handlePay}
      className={clsx(
        'flex w-full items-center justify-center gap-sm rounded-lg bg-primary py-4 text-h3 text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover active:scale-[0.95] disabled:opacity-60',
        className,
      )}
    >
      <IconCreditCard size={22} />
      {loading ? 'Traitement…' : 'Payer avec FedaPay'}
    </button>
  );
}
