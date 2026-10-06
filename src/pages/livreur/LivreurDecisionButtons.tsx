import { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import MIcon from '../../components/shared/MIcon';
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

/** Accepter et refuser, sans `confirm()` du navigateur (bloqué sur téléphone et dans l'aperçu). */
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
            className="flex items-center justify-center gap-1 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-3 font-bold text-[#991B1B] transition-all hover:bg-[#FEE2E2] active:scale-95 disabled:opacity-50"
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
      {ask && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => !locked && setAsk(false)}>
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-h3 text-h3 font-bold">{tx('Refuser cette course ?')}</h3>
            <p className="mt-2 text-label text-text-secondary">
              {tokRef(orderId)}. {tx('Elle sera remise en file pour une nouvelle attribution.')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-border-default px-4 py-2 font-semibold" disabled={locked} onClick={() => setAsk(false)}>
                {tx('Annuler')}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void doRefuse()}
                className="rounded-lg bg-[#991B1B] px-4 py-2 font-bold text-white disabled:opacity-50"
              >
                {busy === 'refuse' ? tx('Chargement…') : tx('Confirmer le refus')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
