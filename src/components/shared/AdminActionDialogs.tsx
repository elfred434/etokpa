import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_DANGER_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
  type DialogFrameProps,
} from './DialogFrame';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

export {
  DIALOG_CANCEL_BTN_CLASS,
  DIALOG_DANGER_BTN_CLASS,
  DIALOG_PRIMARY_BTN_CLASS,
  DialogFrame,
  type DialogFrameProps,
};

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
  }, [request?.id, request?.kind]);

  if (!request) return null;

  const submitPrompt = () => {
    if (request.kind !== 'prompt') return;
    settle(request.id, promptRef.current?.value ?? request.initialValue);
  };

  return (
    <DialogFrame
      danger={request.danger}
      describedById={`admin-action-message-${request.id}`}
      dialogKind={request.kind}
      icon={request.danger ? 'warning' : request.kind === 'prompt' ? 'edit' : request.kind === 'confirm' ? 'help' : 'info'}
      role={request.kind === 'prompt' ? 'dialog' : 'alertdialog'}
      testId="admin-action-dialog"
      title={request.title}
      titleId={`admin-action-title-${request.id}`}
      zIndex={1000}
      onClose={cancelActive}
      onKeyDown={(event) => {
        if (request.kind === 'prompt' && !request.multiline && event.key === 'Enter') {
          event.preventDefault();
          submitPrompt();
        }
      }}
      footer={
        <>
          {request.kind !== 'alert' && (
            <button
              ref={cancelRef}
              type="button"
              className={DIALOG_CANCEL_BTN_CLASS}
              onClick={cancelActive}
            >
              {request.cancelLabel}
            </button>
          )}
          <button
            ref={request.kind === 'alert' ? cancelRef : undefined}
            type="button"
            className={request.danger ? DIALOG_DANGER_BTN_CLASS : DIALOG_PRIMARY_BTN_CLASS}
            onClick={() => {
              if (request.kind === 'confirm') settle(request.id, true);
              else if (request.kind === 'prompt') submitPrompt();
              else settle(request.id, undefined);
            }}
          >
            {request.confirmLabel}
          </button>
        </>
      }
    >
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
    </DialogFrame>
  );
}
