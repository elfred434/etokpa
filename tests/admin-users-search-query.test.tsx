// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getZones: vi.fn(),
  promoteAsAdmin: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  adminApi: {
    getUsers: (...args: unknown[]) => mocks.getUsers(...args),
    getZones: (...args: unknown[]) => mocks.getZones(...args),
    promoteAsAdmin: (...args: unknown[]) => mocks.promoteAsAdmin(...args),
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
  adminDialogs: { confirm: (...args: unknown[]) => mocks.confirm(...args), alert: vi.fn(), prompt: vi.fn() },
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
  vi.clearAllMocks();
  mocks.getUsers.mockResolvedValue({
    data: [
      { id: 1, nom_complet: 'Alpha User', email: 'alpha@example.test', role: 'client', statut: 'actif' },
      { id: 2, nom_complet: 'Beta User', email: 'beta@example.test', role: 'client', statut: 'actif' },
    ],
    meta: { last_page: 1 },
  });
  mocks.getZones.mockResolvedValue({ data: [] });
  mocks.promoteAsAdmin.mockResolvedValue({ data: { id: 1, role: 'admin' } });
  mocks.confirm.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
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

  it('promotes a client or manager to admin after confirmation, and hides the action for livreurs/admins', async () => {
    mocks.getUsers.mockResolvedValueOnce({
      data: [
        { id: 10, nom_complet: 'Kossi Manager', email: 'mgr@example.test', role: 'manager', statut: 'actif' },
        { id: 11, nom_complet: 'Sèna Livreur', email: 'liv@example.test', role: 'livreur', statut: 'actif' },
      ],
      meta: { last_page: 1 },
    });

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
      history: createMemoryHistory({ initialEntries: ['/admin/utilisateurs'] }),
    });

    render(<RouterProvider router={router as never} />);

    expect(await screen.findByText('Kossi Manager')).toBeTruthy();

    fireEvent.click(screen.getByText('Sèna Livreur').closest('tr')!);
    expect(screen.queryByRole('button', { name: /Promouvoir en administrateur/i })).toBeNull();

    fireEvent.click(screen.getByText('Kossi Manager').closest('tr')!);
    const promoteBtn = await screen.findByRole('button', { name: /Promouvoir en administrateur/i });
    fireEvent.click(promoteBtn);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    await waitFor(() => expect(mocks.promoteAsAdmin).toHaveBeenCalledWith(10));
  });
});
