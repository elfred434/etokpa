// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

describe('LogoutButton', () => {
  const post = vi.fn();

  beforeEach(() => {
    localStorage.setItem('tokpa_lang', 'fr');
    localStorage.setItem('tokpa_token', 'test-session');
    localStorage.setItem('tokpa_user', JSON.stringify({ id: 7, role: 'client' }));
    post.mockReset().mockResolvedValue({ data: {} });
    vi.doMock('../src/services/api/client', () => ({
      apiClient: {
        get: vi.fn(),
        post,
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      },
    }));
    vi.doMock('../src/services/realtime/echo', () => ({
      initEcho: vi.fn(),
      shutdownEcho: vi.fn(),
      windowEcho: () => null,
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.doUnmock('../src/services/api/client');
    vi.doUnmock('../src/services/realtime/echo');
  });

  it('invalide la session puis redirige vers la connexion', async () => {
    const { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider } =
      await import('@tanstack/react-router');
    const { LanguageProvider } = await import('../src/context/LanguageContext');
    const { default: LogoutButton } = await import('../src/components/shared/LogoutButton');

    const rootRoute = createRootRoute();
    const protectedRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/espace',
      component: () => createElement(LogoutButton, { withLabel: true }),
    });
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/connexion',
      component: () => createElement('p', null, 'Connexion'),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([protectedRoute, loginRoute]),
      history: createMemoryHistory({ initialEntries: ['/espace'] }),
    });

    render(createElement(LanguageProvider, null, createElement(RouterProvider, { router })));
    fireEvent.click(await screen.findByTestId('logout-button'));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/logout'));
    await waitFor(() => expect(localStorage.getItem('tokpa_token')).toBeNull());
    await waitFor(() => expect(router.state.location.pathname).toBe('/connexion'));
  });
});
