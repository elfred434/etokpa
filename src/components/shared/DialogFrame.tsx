import { useEffect, useId, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

export const DIALOG_CANCEL_BTN_CLASS =
  'w-full rounded-xl border border-border-default bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto cursor-pointer';

export const DIALOG_PRIMARY_BTN_CLASS =
  'w-full rounded-xl bg-primary-container px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto cursor-pointer';

export const DIALOG_DANGER_BTN_CLASS =
  'w-full rounded-xl bg-error px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-error-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto cursor-pointer';

export interface DialogFrameProps {
  icon?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  headerBadge?: ReactNode;
  danger?: boolean;
  role?: 'dialog' | 'alertdialog';
  titleId?: string;
  describedById?: string;
  maxWidth?: string;
  zIndex?: number;
  disabled?: boolean;
  testId?: string;
  dialogKind?: string;
  portal?: boolean;
  bodyClassName?: string;
  onClose: () => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Gabarit unique des modales TOKPa (identique aux dialogs admin `AdminActionDialogHost`),
 * partagé entre les espaces administration, manager, livreur et clientèle.
 */
export function DialogFrame({
  icon = 'info',
  title,
  subtitle,
  headerBadge,
  danger = false,
  role = 'dialog',
  titleId,
  describedById,
  maxWidth = '36rem',
  zIndex = 70,
  disabled = false,
  testId,
  dialogKind,
  portal = false,
  bodyClassName,
  onClose,
  onKeyDown,
  children,
  footer,
}: DialogFrameProps) {
  const autoTitleId = useId();
  const resolvedTitleId = titleId ?? autoTitleId;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disabled) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [disabled, onClose]);

  const node = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !disabled) onClose();
      }}
    >
      <section
        aria-labelledby={resolvedTitleId}
        aria-describedby={describedById}
        aria-modal="true"
        className="flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card text-text-main shadow-2xl"
        data-testid={testId}
        data-dialog-kind={dialogKind}
        role={role}
        style={{ width: '100%', maxWidth, maxHeight: 'calc(100dvh - 2rem)', boxSizing: 'border-box' }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="flex min-w-0 shrink-0 items-start gap-3 border-b border-border-default bg-surface-container-low px-4 py-4 sm:px-5">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? 'bg-error-light text-error' : 'bg-primary-tint text-primary-container'
            }`}
          >
            <MIcon name={icon} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={resolvedTitleId} className="min-w-0 break-words text-lg font-bold text-text-main">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 break-words text-xs text-text-secondary">{subtitle}</p>}
          </div>
          {headerBadge && <div className="shrink-0 self-center">{headerBadge}</div>}
          <button
            type="button"
            aria-label={tx('Fermer')}
            disabled={disabled}
            className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-main disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            onClick={onClose}
          >
            <MIcon name="close" />
          </button>
        </header>

        <div className={`min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 ${bodyClassName ?? ''}`}>
          {children}
        </div>

        {footer && (
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-default bg-bg-secondary p-4 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );

  if (portal && typeof document !== 'undefined') return createPortal(node, document.body);
  return node;
}
