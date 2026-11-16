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
      {ask && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => !locked && setAsk(false)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            className="flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card text-text-main shadow-2xl"
            style={{ width: '100%', maxWidth: '36rem', maxHeight: 'calc(100dvh - 2rem)', boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex min-w-0 shrink-0 items-start gap-3 border-b border-border-default bg-surface-container-low px-4 py-4 sm:px-5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-light text-error">
                <MIcon name="warning" />
              </span>
              <h3 className="min-w-0 flex-1 break-words text-lg font-bold text-text-main">{tx('Refuser cette course ?')}</h3>
              <button
                type="button"
                aria-label={tx('Fermer')}
                disabled={locked}
                className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-main"
                onClick={() => setAsk(false)}
              >
                <MIcon name="close" />
              </button>
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
                {tokRef(orderId)}. {tx('Elle sera remise en file pour une nouvelle attribution.')}
              </p>
            </div>
            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-default bg-bg-secondary p-4 sm:flex-row sm:justify-end sm:px-5">
              <button
                type="button"
                className="w-full rounded-xl border border-border-default bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-app sm:w-auto"
                disabled={locked}
                onClick={() => setAsk(false)}
              >
                {tx('Annuler')}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void doRefuse()}
                className="w-full rounded-xl bg-error px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-error-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {busy === 'refuse' ? tx('Chargement…') : tx('Confirmer le refus')}
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
