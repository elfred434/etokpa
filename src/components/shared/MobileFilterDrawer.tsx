// Tiroir de filtres responsive utilisé sur mobile.
import { useEffect, type ReactNode } from 'react';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

export interface MobileFilterTriggerProps {
  onClick: () => void;
  activeCount?: number;
  label?: string;
  className?: string;
}

// Composant React MobileFilterTrigger : prépare l’état et affiche son interface.
export function MobileFilterTrigger({
  onClick,
  activeCount = 0,
  label,
  className = '',
}: MobileFilterTriggerProps) {
  // Retourne le rendu JSX du composant.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border border-border-default bg-bg-card px-3 py-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-bg-secondary active:scale-95 md:hidden cursor-pointer ${className}`.trim()}
    >
      <MIcon name="tune" className="text-[18px]" />
      <span>{label ?? tx("Filtres")}</span>
      {activeCount > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}

export interface MobileFilterDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onReset?: () => void;
  onApply?: () => void;
  resetLabel?: string;
  applyLabel?: string;
  children: ReactNode;
}

// Composant React MobileFilterDrawer : prépare l’état et affiche son interface.
export function MobileFilterDrawer({
  open,
  title,
  onClose,
  onReset,
  onApply,
  resetLabel,
  applyLabel,
  children,
}: MobileFilterDrawerProps) {
  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Retourne le rendu JSX du composant.
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/50 md:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mt-auto max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-bg-card p-lg shadow-xl"
      >
        <div className="mb-md flex items-center justify-between border-b border-border-default pb-sm">
          <h3 className="font-h2 text-h2 text-on-surface">{title}</h3>
          <button
            type="button"
            aria-label={tx("Fermer les filtres")}
            onClick={onClose}
            className="rounded-full p-2 text-text-secondary hover:bg-bg-secondary cursor-pointer"
          >
            <MIcon name="close" />
          </button>
        </div>

        <div className="space-y-5">
          {children}

          <div className="pt-2 flex gap-3">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="w-1/2 rounded-lg border border-border-default py-3 text-xs font-bold text-text-secondary hover:bg-bg-secondary cursor-pointer"
              >
                {resetLabel ?? tx("Réinitialiser")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onApply) onApply();
                else onClose();
              }}
              className={`${onReset ? 'w-1/2' : 'w-full'} rounded-lg bg-primary py-3 text-xs font-bold text-white shadow-sm hover:bg-primary-hover cursor-pointer`}
            >
              {applyLabel ?? tx("Appliquer")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
