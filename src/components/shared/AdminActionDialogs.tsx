import { useEffect, useRef, useSyncExternalStore } from 'react';
import MIcon from './MIcon';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

export interface AdminDialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  danger?: boolean;
  multiline?: boolean;
}

type DialogKind = 'alert' | 'confirm' | 'prompt';
type DialogValue = void | boolean | string | null;

interface PendingDialog {
  id: number;
  kind: DialogKind;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  placeholder: string;
  initialValue: string;
  danger: boolean;
  multiline: boolean;
  resolve: (value: DialogValue) => void;
}

let nextId = 0;
let activeDialog: PendingDialog | null = null;
const dialogQueue: PendingDialog[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activeDialog;
}

function enqueue<T extends DialogValue>(
  request: Omit<PendingDialog, 'id' | 'resolve'>,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const pending: PendingDialog = {
      ...request,
      id: ++nextId,
      resolve: resolve as (value: DialogValue) => void,
    };
    if (activeDialog) dialogQueue.push(pending);
    else activeDialog = pending;
    notify();
  });
}

function settle(id: number, value: DialogValue) {
  if (!activeDialog || activeDialog.id !== id) return;
  const current = activeDialog;
  activeDialog = dialogQueue.shift() ?? null;
  current.resolve(value);
  notify();
}

function cancelActive() {
  if (!activeDialog) return;
  const result: DialogValue = activeDialog.kind === 'confirm'
    ? false
    : activeDialog.kind === 'prompt'
      ? null
      : undefined;
  settle(activeDialog.id, result);
}

function normalized(message: string, kind: DialogKind, options: AdminDialogOptions, initialValue = '') {
  return {
    kind,
    title: options.title ?? (kind === 'alert' ? tx('Information') : kind === 'prompt' ? tx('Votre réponse') : tx('Confirmation')),
    message,
    confirmLabel: options.confirmLabel ?? (kind === 'alert' ? tx('Fermer') : tx('Confirmer')),
    cancelLabel: options.cancelLabel ?? tx('Annuler'),
    placeholder: options.placeholder ?? '',
    initialValue,
    danger: options.danger ?? false,
    multiline: options.multiline ?? false,
  };
}

/** API asynchrone partagée pour les confirmations, informations et saisies admin. */
export const adminDialogs = {
  alert(message: string, options: AdminDialogOptions = {}): Promise<void> {
    return enqueue<void>(normalized(message, 'alert', options));
  },
  confirm(message: string, options: AdminDialogOptions = {}): Promise<boolean> {
    return enqueue<boolean>(normalized(message, 'confirm', options));
  },
  prompt(message: string, initialValue = '', options: AdminDialogOptions = {}): Promise<string | null> {
    return enqueue<string | null>(normalized(message, 'prompt', options, initialValue));
  },
};

declare global {
  interface Window {
    tokpaAdminDialogs?: typeof adminDialogs;
  }
}

/** Hôte global des modales admin. La largeur est bornée en CSS, pas par max-w-lg/md. */
export function AdminActionDialogHost() {
  useLanguage();
  const request = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    window.tokpaAdminDialogs = adminDialogs;
    return () => {
      if (window.tokpaAdminDialogs === adminDialogs) delete window.tokpaAdminDialogs;
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    if (request.kind === 'prompt') promptRef.current?.focus();
    else cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelActive();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request?.id, request?.kind]);

  if (!request) return null;

  const submitPrompt = () => {
    if (request.kind !== 'prompt') return;
    settle(request.id, promptRef.current?.value ?? request.initialValue);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      style={{ zIndex: 1000 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancelActive();
      }}
    >
      <section
        aria-labelledby={`admin-action-title-${request.id}`}
        aria-describedby={`admin-action-message-${request.id}`}
        aria-modal="true"
        className="flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card text-text-main shadow-2xl"
        data-testid="admin-action-dialog"
        data-dialog-kind={request.kind}
        role={request.kind === 'prompt' ? 'dialog' : 'alertdialog'}
        style={{ width: '100%', maxWidth: '36rem', maxHeight: 'calc(100dvh - 2rem)', boxSizing: 'border-box' }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (request.kind === 'prompt' && !request.multiline && event.key === 'Enter') {
            event.preventDefault();
            submitPrompt();
          }
        }}
      >
        <header className="flex min-w-0 shrink-0 items-start gap-3 border-b border-border-default bg-surface-container-low px-4 py-4 sm:px-5">
          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${request.danger ? 'bg-error-light text-error' : 'bg-primary-tint text-primary-container'}`}>
            <MIcon name={request.danger ? 'warning' : request.kind === 'prompt' ? 'edit' : request.kind === 'confirm' ? 'help' : 'info'} />
          </span>
          <h2 id={`admin-action-title-${request.id}`} className="min-w-0 flex-1 break-words text-lg font-bold text-text-main">
            {request.title}
          </h2>
          <button
            type="button"
            aria-label={tx('Fermer')}
            className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-main"
            onClick={cancelActive}
          >
            <MIcon name="close" />
          </button>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <p id={`admin-action-message-${request.id}`} className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
            {request.message}
          </p>
          {request.kind === 'prompt' && (
            <textarea
              ref={promptRef}
              aria-label={request.placeholder || tx('Votre réponse')}
              className="mt-4 min-h-24 w-full resize-y rounded-xl border border-border-default bg-bg-card px-3 py-2 text-sm text-text-main outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              defaultValue={request.initialValue}
              placeholder={request.placeholder}
              rows={request.multiline ? 4 : 2}
            />
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-default bg-bg-secondary p-4 sm:flex-row sm:justify-end sm:px-5">
          {request.kind !== 'alert' && (
            <button
              ref={cancelRef}
              type="button"
              className="w-full rounded-xl border border-border-default bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-app sm:w-auto"
              onClick={cancelActive}
            >
              {request.cancelLabel}
            </button>
          )}
          <button
            ref={request.kind === 'alert' ? cancelRef : undefined}
            type="button"
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${request.danger ? 'bg-error hover:bg-error-dark' : 'bg-primary-container hover:bg-primary-hover'}`}
            onClick={() => {
              if (request.kind === 'confirm') settle(request.id, true);
              else if (request.kind === 'prompt') submitPrompt();
              else settle(request.id, undefined);
            }}
          >
            {request.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
