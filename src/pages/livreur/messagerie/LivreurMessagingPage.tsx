import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearch } from '@tanstack/react-router';
import LivreurLayout from '../../../components/layout/livreur/LivreurLayout';
import MIcon from '../../../components/shared/MIcon';
import { chatApi, type ConversationItem } from '../../../services/api/chat';
import { useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { subscribeRealtimeRefresh } from '../../../hooks/useRealtimeNotifications';
import { windowEcho } from '../../../services/realtime/echo';
import { currentUserId } from '../../../routes/authGuard';
import { extractApiError, formatApiError } from '../../../utils/apiError';
import { tr, tx } from '../../../i18n/tx';

interface UiMessage {
  id: string | number;
  senderId: number;
  contenu: string;
  createdAt?: string;
  pending?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Accepte les enveloppes Resource et paginées actuellement renvoyées par Laravel. */
function rowsFrom(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response.map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => row !== null);
  const root = asRecord(response);
  const data = root?.data;
  if (Array.isArray(data)) return data.map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => row !== null);
  const page = asRecord(data);
  if (Array.isArray(page?.data)) return page.data.map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => row !== null);
  return [];
}

function toUiMessage(row: Record<string, unknown>): UiMessage | null {
  if (typeof row.contenu !== 'string') return null;
  const senderId = Number(row.sender_id);
  if (!Number.isFinite(senderId)) return null;
  const id = typeof row.id === 'number' || typeof row.id === 'string' ? row.id : `msg-${Date.now()}`;
  return {
    id,
    senderId,
    contenu: row.contenu,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

function timeLabel(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function responseStatus(error: unknown): number | undefined {
  return (asRecord(asRecord(error)?.response)?.status as number | undefined) ?? undefined;
}

/** Messagerie du livreur — UI prête pour les endpoints /conversations et le canal Reverb `chat.{id}`. */
export default function LivreurMessagingPage() {
  const { commande: commandeRecherche } = useSearch({ from: '/livreur/messagerie' });
  const refreshTick = useGlobalRefreshTick();
  const userId = currentUserId();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setLoadingConversations(false);
      return;
    }
    setLoadingConversations(true);
    setBackendDenied(false);
    setProblem(null);
    try {
      const response = await chatApi.getConversations();
      const list = rowsFrom(response) as unknown as ConversationItem[];
      setConversations(list);
      setActiveConversationId((previous) => {
        if (commandeRecherche) {
          const requested = list.find((conversation) => Number(conversation.order_id) === Number(commandeRecherche));
          return requested ? Number(requested.id) : null;
        }
        if (previous && list.some((conversation) => Number(conversation.id) === previous)) return previous;
        return list[0] ? Number(list[0].id) : null;
      });
    } catch (error) {
      if (responseStatus(error) === 403) {
        setBackendDenied(true);
        setConversations([]);
        setActiveConversationId(null);
      } else {
        setProblem(formatApiError(extractApiError(error)));
      }
    } finally {
      setLoadingConversations(false);
    }
  }, [commandeRecherche, userId]);

  useEffect(() => {
    void loadConversations();
    return subscribeRealtimeRefresh(['orders'], (event) => {
      if (event.scope === 'orders') void loadConversations();
    });
  }, [loadConversations, refreshTick]);

  useEffect(() => {
    if (!activeConversationId || backendDenied) {
      setMessages([]);
      return;
    }
    let alive = true;
    setLoadingMessages(true);
    setMessages([]);
    chatApi
      .getMessages(activeConversationId)
      .then((response) => {
        if (!alive) return;
        setMessages(rowsFrom(response).map(toUiMessage).filter((message): message is UiMessage => message !== null));
      })
      .catch((error) => {
        if (!alive) return;
        if (responseStatus(error) === 403) setBackendDenied(true);
        else setProblem(formatApiError(extractApiError(error)));
      })
      .finally(() => alive && setLoadingMessages(false));
    return () => {
      alive = false;
    };
  }, [activeConversationId, backendDenied, refreshTick]);

  useEffect(() => {
    if (!activeConversationId || !userId || backendDenied) return undefined;
    const echo = windowEcho();
    if (!echo) return undefined;
    try {
      const channel = echo.private(`chat.${activeConversationId}`);
      const handler = (payload: { id?: number; sender_id?: number; contenu?: string; created_at?: string }) => {
        if (!payload.contenu || Number(payload.sender_id) === userId) return;
        const incoming: UiMessage = {
          id: payload.id ?? `rt-${Date.now()}`,
          senderId: Number(payload.sender_id ?? 0),
          contenu: payload.contenu,
          createdAt: payload.created_at,
        };
        setMessages((previous) => previous.some((message) => String(message.id) === String(incoming.id))
          ? previous
          : [...previous, incoming]);
      };
      channel.listen('message.sent', handler);
      return () => {
        channel.stopListening('message.sent', handler);
      };
    } catch {
      return undefined;
    }
  }, [activeConversationId, backendDenied, userId]);

  const activeConversation = conversations.find((conversation) => Number(conversation.id) === activeConversationId) ?? null;
  const requestedConversationMissing = Boolean(
    commandeRecherche &&
    !loadingConversations &&
    !backendDenied &&
    !conversations.some((conversation) => Number(conversation.order_id) === Number(commandeRecherche)),
  );

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || !activeConversationId || !userId || sending || backendDenied) return;

    const temporaryId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: UiMessage = {
      id: temporaryId,
      senderId: userId,
      contenu: content,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((previous) => [...previous, optimistic]);
    setInput('');
    setSending(true);
    setProblem(null);
    try {
      const response = await chatApi.sendMessage(activeConversationId, content);
      const savedRow = asRecord(asRecord(response)?.data);
      const saved = savedRow ? toUiMessage(savedRow) : null;
      setMessages((previous) => previous.map((message) => message.id === temporaryId
        ? (saved ?? { ...message, pending: false })
        : message));
    } catch (error) {
      setMessages((previous) => previous.filter((message) => message.id !== temporaryId));
      if (responseStatus(error) === 403) setBackendDenied(true);
      else setProblem(formatApiError(extractApiError(error)));
    } finally {
      setSending(false);
    }
  };

  return (
    <LivreurLayout>
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 p-3 sm:p-lg">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-h2 text-h2 font-bold text-text-main">{tr('Messagerie', 'Messages')}</h1>
            <p className="mt-1 text-label text-text-secondary">{tr('Échangez avec le client au sujet de la livraison.', 'Chat with the customer about the delivery.')}</p>
          </div>
          {activeConversation && (
            <span className="rounded-full bg-primary-tint px-3 py-1 text-xs font-bold text-primary-container">
              #TOK-{activeConversation.order_id}
            </span>
          )}
        </header>

        {backendDenied && (
          <div role="alert" className="rounded-xl border border-error bg-error-container p-4 text-sm text-on-error-container">
            <p className="font-bold">{tr('L’accès livreur à la messagerie n’est pas encore ouvert côté serveur (403).', 'Rider chat access is not enabled on the server yet (403).')}</p>
            <p className="mt-1">
              {tr('Le backend doit autoriser le rôle livreur sur GET /api/conversations et GET/POST /api/conversations/{id}/messages.', 'The backend must allow the rider role on GET /api/conversations and GET/POST /api/conversations/{id}/messages.')}
            </p>
          </div>
        )}
        {problem && (
          <div role="alert" className="rounded-lg border border-error bg-error-container p-3 text-label text-on-error-container">
            {problem}
          </div>
        )}
        {requestedConversationMissing && (
          <div role="status" className="rounded-lg border border-border-default bg-bg-secondary p-3 text-sm text-text-secondary">
            {tr(
              `Aucune conversation n’est encore associée à la commande #TOK-${commandeRecherche}.`,
              `No conversation is linked to order #TOK-${commandeRecherche} yet.`,
            )}
          </div>
        )}

        <section
          aria-label={tr('Messagerie client-livreur', 'Customer-rider messaging')}
          className="flex min-h-[420px] overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-sm"
          style={{ height: 'min(68dvh, 720px)' }}
        >
          <aside className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-border-default bg-bg-card md:w-[320px]`}>
            <div className="border-b border-border-default px-4 py-3">
              <h2 className="font-h3 text-h3 font-bold">{tr('Conversations', 'Conversations')}</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="p-4 text-sm text-text-secondary">{tx('Chargement…')}</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-sm text-text-secondary">
                  {backendDenied
                    ? tr('Les conversations apparaîtront dès que l’API aura ouvert l’accès livreur.', 'Conversations will appear once the API enables rider access.')
                    : tr('Aucune conversation assignée pour le moment.', 'No assigned conversations yet.')}
                </div>
              ) : conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  aria-pressed={activeConversationId === Number(conversation.id)}
                  onClick={() => setActiveConversationId(Number(conversation.id))}
                  className={`flex w-full items-center gap-3 border-b border-border-default px-4 py-3 text-left transition-colors ${activeConversationId === Number(conversation.id) ? 'bg-primary-tint' : 'hover:bg-bg-secondary'}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-white">
                    <MIcon name="person" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{tr('Client', 'Customer')} #{conversation.client_id}</span>
                    <span className="block text-xs text-text-secondary">#TOK-{conversation.order_id}</span>
                  </span>
                  <MIcon name="chevron_right" className="text-text-tertiary" />
                </button>
              ))}
            </div>
          </aside>

          <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-bg-app`}>
            {activeConversation ? (
              <>
                <header className="flex items-center gap-3 border-b border-border-default bg-bg-card px-3 py-3 sm:px-5">
                  <button
                    type="button"
                    className="rounded-lg p-1 text-text-secondary md:hidden"
                    aria-label={tx('Retour')}
                    onClick={() => setActiveConversationId(null)}
                  >
                    <MIcon name="arrow_back" />
                  </button>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-white">
                    <MIcon name="person" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-h3 text-h3 font-bold">{tr('Client', 'Customer')} #{activeConversation.client_id}</h2>
                    <p className="text-xs text-text-secondary">{tr('Commande', 'Order')} #TOK-{activeConversation.order_id}</p>
                  </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
                  {loadingMessages ? (
                    <p className="m-auto text-sm text-text-secondary">{tx('Chargement…')}</p>
                  ) : messages.length === 0 ? (
                    <div className="m-auto max-w-sm text-center text-text-secondary">
                      <MIcon name="chat_bubble_outline" className="mb-2 text-4xl" />
                      <p className="font-semibold">{tr('Début de la conversation', 'Start of conversation')}</p>
                      <p className="mt-1 text-sm">{tr('Écrivez au client pour préciser le lieu de livraison.', 'Message the customer to clarify the delivery location.')}</p>
                    </div>
                  ) : messages.map((message) => {
                    const mine = message.senderId === userId;
                    return (
                      <div key={message.id} className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className={`break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${mine ? 'bg-primary-container text-white' : 'border border-border-default bg-bg-card text-text-main'} ${message.pending ? 'opacity-70' : ''}`}>
                          {message.contenu}
                        </div>
                        <span className="px-1 text-[11px] text-text-tertiary">
                          {timeLabel(message.createdAt)}{message.pending ? ` · ${tx('Envoi…')}` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border-default bg-bg-card p-3 sm:px-5">
                  <input
                    aria-label={tr('Écrire un message', 'Write a message')}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    maxLength={1000}
                    placeholder={tx('Écrire un message...')}
                    disabled={backendDenied}
                    className="min-w-0 flex-1 rounded-full border border-border-default bg-bg-app px-4 py-2.5 text-sm outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    aria-label={tr('Envoyer', 'Send')}
                    disabled={!input.trim() || sending || backendDenied}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MIcon name="send" />
                  </button>
                </form>
              </>
            ) : (
              <div className="m-auto max-w-sm p-6 text-center text-text-secondary">
                <MIcon name="chat_bubble_outline" className="mb-3 text-5xl text-text-tertiary" />
                <p className="font-semibold">{tr('Sélectionnez une conversation.', 'Select a conversation.')}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </LivreurLayout>
  );
}
