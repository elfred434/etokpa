import { useState } from 'react';
import clsx from 'clsx';
import { IconLock, IconBrandMastercard } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { formatFCFA } from '../../../utils/format';

interface FedaPayButtonProps {
  amount: number;
  /** Appelé après un paiement mock réussi */
  onPaid?: () => void;
  className?: string;
}

/**
 * Bouton de paiement FedaPay — MOCK (décision validée) :
 * loading 1,2 s puis succès (ou échec 1 fois sur 5 pour tester les états).
 * À remplacer par FedaPay Checkout.js + mutation backend au branchement (F-18).
 */
export default function FedaPayButton({ amount, onPaid, className }: FedaPayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      const success = Math.random() > 0.2;
      if (success) {
        toast.success(`Paiement FedaPay accepté : ${formatFCFA(amount)}`);
        onPaid?.();
      } else {
        toast.error('Paiement refusé par FedaPay. Réessayez.');
      }
    }, 1200);
  };

  return (
    <button
      type="button"
      className={clsx('btn btn-primary w-full', className)}
      disabled={loading || amount <= 0}
      onClick={handlePay}
    >
      {loading ? (
        'Traitement du paiement…'
      ) : (
        <>
          <IconLock size={18} />
          Payer {formatFCFA(amount)} avec FedaPay
          <IconBrandMastercard size={20} className="opacity-80" />
        </>
      )}
    </button>
  );
}
