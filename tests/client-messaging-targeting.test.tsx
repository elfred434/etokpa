// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';

const mocks = vi.hoisted(() => ({
  getConversations: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  getOrder: vi.fn(),
  search: { commande: 12 as number | undefined },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...rest }: { children: React.ReactNode; to?: string; search?: Record<string, unknown>; [k: string]: unknown }) => (
    <a href={search ? `${to}?${new URLSearchParams(search as Record<string, string>).toString()}` : to} {...rest}>
      {children}
    </a>
  ),
  useSearch: () => mocks.search,
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav /> }));
vi.mock('../src/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock('../src/hooks/useRealtimeNotifications', () => ({
  subscribeRealtimeRefresh: () => () => undefined,
}));
vi.mock('../src/hooks/useRefresh', () => ({
  useGlobalRefreshTick: () => 0,
}));
vi.mock('../src/services/realtime/echo', () => ({
  windowEcho: () => null,
}));
vi.mock('../src/services/api', () => ({
  chatApi: {
    getConversations: (...a: unknown[]) => mocks.getConversations(...a),
    getMessages: (...a: unknown[]) => mocks.getMessages(...a),
    sendMessage: (...a: unknown[]) => mocks.sendMessage(...a),
  },
  ordersApi: {
    getOrder: (...a: unknown[]) => mocks.getOrder(...a),
  },
}));

import MessagingPage from '../src/pages/client/messagerie/MessagingPage';

describe('client targeted messaging (?commande=<id>)', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    localStorage.setItem('tokpa_lang', 'fr');
    localStorage.setItem('tokpa_user', JSON.stringify({ id: 7, role: 'client' }));
    mocks.search = { commande: 12 };
    mocks.getConversations.mockReset();
    mocks.getMessages.mockReset();
    mocks.sendMessage.mockReset();
    mocks.getOrder.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the conversation matching ?commande=12 instead of defaulting to the latest conversation', async () => {
    mocks.getConversations.mockResolvedValue({
      data: [
        { id: 99, order_id: 25, client_id: 7, livreur_id: 41, updated_at: '2026-11-22T12:00:00Z' },
        { id: 88, order_id: 12, client_id: 7, livreur_id: 42, updated_at: '2026-11-22T10:00:00Z' },
      ],
    });
    mocks.getOrder.mockImplementation((orderId: number) =>
      Promise.resolve({
        data: {
          id: orderId,
          montant_total: orderId === 12 ? 3200 : 9000,
          statut: 'en_livraison',
          livreur: { nom_complet: orderId === 12 ? 'Koffi Cible' : 'Autre Livreur', telephone: '01020304' },
          items: [{ id: 1 }],
        },
      }),
    );
    mocks.getMessages.mockImplementation((convId: number) =>
      Promise.resolve({
        data: {
          data: [
            {
              id: 1,
              conversation_id: convId,
              sender_id: 42,
              contenu: convId === 88 ? 'Message ciblé commande 12' : 'Message mauvaise commande 25',
              created_at: '2026-11-22T10:05:00Z',
            },
          ],
        },
      }),
    );

    render(
      <LanguageProvider>
        <MessagingPage />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Message ciblé commande 12')).toBeTruthy();
    expect(screen.queryByText('Message mauvaise commande 25')).toBeNull();
    expect(mocks.getMessages).toHaveBeenCalledWith(88);
    expect((await screen.findAllByText('Koffi Cible')).length).toBeGreaterThanOrEqual(1);
    const trackLink = screen.getByRole('link', { name: 'Suivre' });
    expect(trackLink.getAttribute('href')).toContain('order=12');
  });
});
