// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getZones: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  adminApi: {
    getUsers: (...args: unknown[]) => mocks.getUsers(...args),
    getZones: (...args: unknown[]) => mocks.getZones(...args),
  },
  authApi: { forgotPassword: vi.fn() },
}));
vi.mock('../src/services/api/useLiveRows', () => ({
  zoneNom: () => '—',
  initials: (name: string) => name.slice(0, 2).toUpperCase(),
}));
vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/layout/admin/AdminNotificationBell', () => ({ default: () => null }));
vi.mock('../src/components/shared/AdminActionDialogs', () => ({
  adminDialogs: { confirm: vi.fn(), alert: vi.fn(), prompt: vi.fn() },
}));
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: vi.fn() }));
vi.mock('../src/i18n/tx', () => ({ tx: (value: string) => value, tr: (fr: string) => fr }));
vi.mock('../src/hooks/useRefresh', () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import AdminUsersPage from '../src/pages/admin/AdminUsersPage';

beforeEach(() => {
  mocks.getUsers.mockResolvedValue({
    data: [
      { id: 1, nom_complet: 'Alpha User', email: 'alpha@example.test', role: 'client', statut: 'actif' },
      { id: 2, nom_complet: 'Beta User', email: 'beta@example.test', role: 'client', statut: 'actif' },
    ],
    meta: { last_page: 1 },
  });
  mocks.getZones.mockResolvedValue({ data: [] });
});

describe('AdminUsersPage search query', () => {
  it('initializes the existing user filter from the route query', async () => {
    const root = createRootRoute();
    const users = createRoute({
      getParentRoute: () => root,
      path: '/admin/utilisateurs',
      validateSearch: (search: Record<string, unknown>) => ({
        q: typeof search.q === 'string' ? search.q : undefined,
      }),
      component: AdminUsersPage,
    });
    const router = createRouter({
      routeTree: root.addChildren([users]),
      history: createMemoryHistory({ initialEntries: ['/admin/utilisateurs?q=alpha'] }),
    });

    render(<RouterProvider router={router as never} />);

    await waitFor(() => expect(mocks.getUsers).toHaveBeenCalled());
    expect(screen.getByPlaceholderText('Rechercher nom, email, tél...').getAttribute('value')).toBe('alpha');
    expect(await screen.findByText('Alpha User')).toBeTruthy();
    expect(screen.queryByText('Beta User')).toBeNull();
  });
});
