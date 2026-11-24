// Boutons permettant au livreur d’accepter ou de refuser une course assignée.
import { useState } from 'react';
import toast from 'react-hot-toast';
import MIcon from '../../components/shared/MIcon';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_DANGER_BTN_CLASS,
  DialogFrame,
} from '../../components/shared/DialogFrame';
import { livreurApi } from '../../services/api';
import { alertApiError } from '../../utils/apiError';
import { tx } from '../../i18n/tx';
import { tokRef } from './livreurData';

type Props = {
  orderId: number;
  accept?: boolean;
  refuse?: boolean;
  disabled?: boolean;
  layout?: 'row' | 'stack';
  onAccepted?: () => void;
  onRefused?: () => void;
};

// Composant React LivreurDecisionButtons : prépare l’état et affiche son interface.
export default function LivreurDecisionButtons({
  orderId,
  accept = true,
  refuse = true,
  disabled = false,
  layout = 'row',
  onAccepted,
  onRefused,
}: Props) {
  const [busy, setBusy] = useState<'accept' | 'refuse' | null>(null);
  const [ask, setAsk] = useState(false);
  const locked = disabled || busy != null;

  // Helper doAccept : réalise le traitement métier associé.
  const doAccept = async () => {
    const id = Number(orderId);
    if (!Number.isInteger(id) || id <= 0) return;
    setBusy('accept');
    try {
      const r = await livreurApi.acceptDelivery(id);
      toast.success(r?.message || tx('Course acceptée.'));
      onAccepted?.();
    } catch (e) {
      alertApiError(e, 'livreur-accept');
    } finally {
      setBusy(null);
    }
  };

  // Helper doRefuse : réalise le traitement métier associé.
  const doRefuse = async () => {
    const id = Number(orderId);
    if (!Number.isInteger(id) || id <= 0) return;
    setBusy('refuse');
    try {
      const r = await livreurApi.refuseDelivery(id);
      toast.success(r?.message || tx('Course refusée.'));
      setAsk(false);
      onRefused?.();
    } catch (e) {
      alertApiError(e, 'livreur-refuse');
    } finally {
      setBusy(null);
    }
  };

  // Retourne le rendu JSX du composant.
  return (
    <>
      <div className={layout === 'stack' ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-xs'}>
        {refuse && (
          <button
            type="button"
            title={tx('Refuser')}
            aria-label={`${tx('Refuser la course')} ${tokRef(orderId)}`}
            disabled={locked}
            onClick={() => setAsk(true)}
            className="flex items-center justify-center gap-1 rounded-xl border border-error bg-error-light px-3 py-3 font-bold text-error-dark transition-all hover:bg-error-light active:scale-95 disabled:opacity-50"
          >
            <MIcon name="close" className="text-[20px]" />
            {layout === 'stack' && <span>{tx('Refuser')}</span>}
          </button>
        )}
        {accept && (
          <button
            type="button"
            disabled={locked}
            onClick={() => void doAccept()}
            className="flex items-center justify-center gap-xs rounded-lg bg-success px-lg py-md font-bold text-white transition-all hover:bg-success-dark active:scale-95 disabled:opacity-50"
          >
            <MIcon name="check" />
            {busy === 'accept' ? tx('Chargement…') : tx('Accepter')}
          </button>
        )}
      </div>
      {ask && (
        <DialogFrame
          danger
          icon="warning"
          portal
          role="alertdialog"
          title={tx('Refuser cette course ?')}
          disabled={locked}
          zIndex={1000}
          onClose={() => setAsk(false)}
          footer={
            <>
              <button
                type="button"
                className={DIALOG_CANCEL_BTN_CLASS}
                disabled={locked}
                onClick={() => setAsk(false)}
              >
                {tx('Annuler')}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void doRefuse()}
                className={DIALOG_DANGER_BTN_CLASS}
              >
                {busy === 'refuse' ? tx('Chargement…') : tx('Confirmer le refus')}
              </button>
            </>
          }
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
            {tokRef(orderId)}. {tx('Elle sera remise en file pour une nouvelle attribution.')}
          </p>
        </DialogFrame>
      )}
    </>
  );
}
