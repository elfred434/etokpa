// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';

vi.mock('../src/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../src/services/realtime/echo', () => ({ windowEcho: vi.fn() }));
vi.mock('../src/components/layout/livreur/LivreurLayout', () => ({
  default: ({ children }: { children?: ReactNode }) => createElement('div', { 'data-testid': 'livreur-layout' }, children),
}));
vi.mock('../src/hooks/useRefresh', () => ({ useGlobalRefreshTick: () => 0 }));
vi.mock('../src/hooks/useRealtimeNotifications', () => ({ subscribeRealtimeRefresh: () => () => undefined }));
vi.mock('../src/routes/authGuard', () => ({ currentUserId: () => 41 }));
vi.mock('../src/utils/apiError', () => ({
  extractApiError: (error: unknown) => error,
  formatApiError: () => 'Erreur API',
}));
vi.mock('../src/i18n/tx', () => ({ tx: (value: string) => value, tr: (fr: string) => fr }));

import { apiClient } from '../src/services/api/client';
import { windowEcho } from '../src/services/realtime/echo';
import LivreurMessagingPage from '../src/pages/livreur/messagerie/LivreurMessagingPage';

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

function renderPage() {
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/livreur/messagerie',
    validateSearch: (search: Record<string, unknown>) => ({ commande: Number(search.commande ?? 0) || undefined }),
    component: LivreurMessagingPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: ['/livreur/messagerie?commande=12'] }),
  });
  return render(createElement(RouterProvider, { router }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('tokpa_token', 'test-session');
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 41, role: 'livreur' }));
  vi.mocked(windowEcho).mockReturnValue(null);
});

describe('livreur messaging page', () => {
  it('loads the conversation for the requested order and sends through the API', async () => {
    get.mockImplementation((url: string) => {
      if (url === '/conversations') {
        return Promise.resolve({ data: { data: [
          { id: 5, order_id: 11, client_id: 8, livreur_id: 41 },
          { id: 6, order_id: 12, client_id: 7, livreur_id: 41 },
        ] } });
      }
      return Promise.resolve({ data: { data: { data: [{ id: 9, conversation_id: 6, sender_id: 7, contenu: 'Bonjour', created_at: '2026-10-31T12:00:00.000Z' }] } } });
    });
    post.mockResolvedValue({
      data: { data: { id: 10, conversation_id: 6, sender_id: 41, contenu: 'Je vous appelle en arrivant.', created_at: '2026-10-31T12:01:00.000Z' } },
    });

    renderPage();

    expect(await screen.findByText('Bonjour')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Client #7' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Écrire un message' }), {
      target: { value: 'Je vous appelle en arrivant.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/conversations/6/messages', { contenu: 'Je vous appelle en arrivant.' }));
    expect(await screen.findByText('Je vous appelle en arrivant.')).toBeTruthy();
  });

  it('does not open an unrelated conversation when the requested order has no chat', async () => {
    get.mockImplementation((url: string) => url === '/conversations'
      ? Promise.resolve({ data: { data: [{ id: 5, order_id: 11, client_id: 8, livreur_id: 41 }] } })
      : Promise.resolve({ data: { data: [] } }));

    renderPage();

    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('commande #TOK-12');
    expect(screen.queryByRole('heading', { name: 'Client #8' })).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('explains that courier access must be enabled by the backend after a 403', async () => {
    get.mockRejectedValue({ response: { status: 403, data: { message: 'Forbidden' } } });

    renderPage();

    expect(await screen.findByText(/L’accès livreur à la messagerie n’est pas encore ouvert/)).toBeTruthy();
    expect(screen.getByText(/GET \/api\/conversations/)).toBeTruthy();
  });
});
