// Bouton d’actualisation manuelle indiquant l’heure de la dernière synchronisation.
import clsx from 'clsx';
import toast from 'react-hot-toast';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';
import { AUTO_REFRESH_MS, useRefreshState } from '../../hooks/useRefresh';
import { requestRefresh } from '../../services/refresh/refreshBus';

interface RefreshButtonProps {
  withLabel?: boolean;
  className?: string;
}

// Helper heureCourte : réalise le traitement métier associé.
function heureCourte(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ts).toISOString().slice(11, 16);
  }
}

// Composant React RefreshButton : prépare l’état et affiche son interface.
export default function RefreshButton({ withLabel = false, className = '' }: RefreshButtonProps) {
  const { busy, lastRefreshAt } = useRefreshState();

  const libelle = tx('Actualiser');
  const secondes = Math.round(AUTO_REFRESH_MS / 1000);
  const titre = [
    `${libelle} — ${tx('Actualisation automatique')} (${tx('Toutes les 30 secondes').replace('30', String(secondes))})`,
    lastRefreshAt ? `${tx('Dernière actualisation')} : ${heureCourte(lastRefreshAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Gère l’action utilisateur Click.
  const onClick = () => {
    if (busy) return;
    void requestRefresh('manual').then(() => {
      toast.success(tx('Informations actualisées.'), { id: 'tokpa-refresh-done' });
    });
  };

  // Retourne le rendu JSX du composant.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      title={titre}
      aria-label={busy ? tx('Actualisation en cours…') : libelle}
      data-testid="refresh-button"
      className={clsx(
        'inline-flex items-center gap-1 rounded-full transition-transform active:scale-95 disabled:opacity-70',
        withLabel
          ? 'border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary'
          : 'scale-interaction p-1 text-primary-shade',
        className,
      )}
    >
      <MIcon name="refresh" className={clsx('text-[20px]', busy && 'animate-spin')} />
      {withLabel && <span className="hidden sm:inline">{libelle}</span>}
    </button>
  );
}
