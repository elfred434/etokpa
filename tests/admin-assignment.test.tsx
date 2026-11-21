// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '../src/context/LanguageContext';

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getOrders: vi.fn(),
  getZones: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  updateOrderStatus: vi.fn(),
  assignLivreur: vi.fn(),
  managerGetLivreurs: vi.fn(),
  managerAssignLivreur: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
  confirm: vi.fn(),
  managerOrders: [
    { id: 88, statut: 'en_attente', landmark: { id: 3, zone_id: 7, nom: 'Akpakpa' }, livreur: null },
  ] as Array<Record<string, unknown>>,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => ({ q: undefined }),
}));

vi.mock('../src/services/api', () => ({
  adminApi: {
    getUsers: (...args: unknown[]) => mocks.getUsers(...args),
    getOrders: (...args: unknown[]) => mocks.getOrders(...args),
    getZones: (...args: unknown[]) => mocks.getZones(...args),
    deleteUser: (...args: unknown[]) => mocks.deleteUser(...args),
    updateUser: (...args: unknown[]) => mocks.updateUser(...args),
    updateOrderStatus: (...args: unknown[]) => mocks.updateOrderStatus(...args),
    assignLivreur: (...args: unknown[]) => mocks.assignLivreur(...args),
  },
  managerApi: {
    getLivreurs: (...args: unknown[]) => mocks.managerGetLivreurs(...args),
    assignLivreur: (...args: unknown[]) => mocks.managerAssignLivreur(...args),
  },
}));

vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/layout/manager/ManagerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/orders/PlatformOrdersPanel', () => ({
  default: ({
    source,
    renderActions,
    reloadKey,
  }: {
    source: 'admin' | 'zone';
    renderActions?: (order: Record<string, unknown>) => ReactNode;
    reloadKey?: number;
  }) => (
    <div data-testid={`orders-panel-${source}`} data-reload-key={reloadKey}>
      {(source === 'zone'
        ? mocks.managerOrders
        : [{ id: 71, statut: 'en_attente', landmark: { id: 3, zone_id: 7, nom: 'Akpakpa' }, livreur: null }]
      ).map((order) => (
        <div key={String(order.id)}>{renderActions?.(order)}</div>
      ))}
    </div>
  ),
}));
vi.mock('../src/components/shared/MIcon', () => ({
  default: () => <span aria-hidden="true" />,
}));
vi.mock('../src/components/shared/AdminActionDialogs', () => ({
  adminDialogs: { confirm: (...args: unknown[]) => mocks.confirm(...args) },
}));
vi.mock('../src/services/api/useLiveRows', () => ({
  zoneNom: (id: unknown) => (Number(id) === 7 ? 'Akpakpa' : '—'),
  initials: (name: string) => name.slice(0, 2).toUpperCase(),
}));
vi.mock('../src/hooks/useRefresh', () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import AdminLivreursPage from '../src/pages/admin/AdminLivreursPage';
import AdminOrdersPage from '../src/pages/admin/AdminOrdersPage';
import ManagerOrdersPage from '../src/pages/manager/ManagerOrdersPage';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  vi.clearAllMocks();
  mocks.getZones.mockResolvedValue({ data: [{ id: 7, nom: 'Akpakpa' }] });
  mocks.assignLivreur.mockResolvedValue({ data: { id: 71 } });
  mocks.managerAssignLivreur.mockResolvedValue({ data: { id: 88 } });
});

afterEach(() => {
  cleanup();
});

describe('Assignation livreur — AdminLivreursPage, AdminOrdersPage, ManagerOrdersPage', () => {
  it('AdminLivreursPage : affiche directement les commandes assignables au clic sur le livreur et assigne la commande choisie', async () => {
    mocks.getUsers.mockResolvedValue({
      data: [
        {
          id: 11,
          nom_complet: 'Koffi Livreur',
          statut: 'actif',
          profil: { zone_id: 7, disponibilite: true, zone: { id: 7, nom: 'Akpakpa' } },
        },
      ],
      meta: { last_page: 1 },
    });
    mocks.getOrders.mockResolvedValue({
      data: [
        {
          id: 71,
          statut: 'en_attente',
          montant_total: 3500,
          landmark: { id: 3, zone_id: 7, nom: 'Akpakpa' },
          client: { nom_complet: 'Awa Client' },
          livreur: null,
        },
        {
          id: 72,
          statut: 'en_attente',
          montant_total: 2000,
          landmark: { id: 9, zone_id: 2, nom: 'Cadjehoun' },
          client: { nom_complet: 'Autre Zone' },
          livreur: null,
        },
        {
          id: 73,
          statut: 'en_preparation',
          montant_total: 4800,
          landmark: { id: 4, zone_id: 7, nom: 'Akpakpa Centre' },
          client: { nom_complet: 'Bio Client' },
          livreur: null,
        },
      ],
      meta: { last_page: 1 },
    });

    render(
      <LanguageProvider>
        <AdminLivreursPage />
      </LanguageProvider>,
    );

    expect(await screen.findByText(/#71 — Awa Client/)).toBeTruthy();
    expect(screen.getByText(/#73 — Bio Client/)).toBeTruthy();
    expect(screen.queryByText(/#72 — Autre Zone/)).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: /#73 — Bio Client/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assigner' }));

    await waitFor(() => expect(mocks.assignLivreur).toHaveBeenCalledWith(73, 11));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Commande #73 assignée à Koffi Livreur.');
  });

  it('AdminLivreursPage : explique clairement si le livreur est indisponible', async () => {
    mocks.getUsers.mockResolvedValue({
      data: [
        {
          id: 12,
          nom_complet: 'Mika Repos',
          statut: 'actif',
          profil: { zone_id: 7, disponibilite: false, zone: { id: 7, nom: 'Akpakpa' } },
        },
      ],
      meta: { last_page: 1 },
    });
    mocks.getOrders.mockResolvedValue({ data: [], meta: { last_page: 1 } });

    render(
      <LanguageProvider>
        <AdminLivreursPage />
      </LanguageProvider>,
    );

    expect(await screen.findByText(/actuellement indisponible/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Assigner' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('AdminOrdersPage : propose Assigner sur une commande sans livreur et envoie adminApi.assignLivreur', async () => {
    mocks.getUsers.mockResolvedValue({
      data: [
        {
          id: 11,
          nom_complet: 'Koffi Livreur',
          telephone: '0197000001',
          statut: 'actif',
          profil: { zone_id: 7, disponibilite: true },
        },
      ],
      meta: { last_page: 1 },
    });

    render(
      <LanguageProvider>
        <AdminOrdersPage />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Assigner #71' }));
    expect(await screen.findByText('Koffi Livreur')).toBeTruthy();

    const buttons = screen.getAllByRole('button', { name: 'Assigner' });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(mocks.assignLivreur).toHaveBeenCalledWith(71, 11));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Commande #71 assignée avec succès.');
  });

  it('ManagerOrdersPage : affiche un message clair si plusieurs livreurs et aucun sélectionné, puis assigne après sélection', async () => {
    mocks.managerGetLivreurs.mockResolvedValue({
      data: [
        { id: 11, nom_complet: 'Livreur Un', profil: { zone_id: 7, disponibilite: true } },
        { id: 12, nom_complet: 'Livreur Deux', profil: { zone_id: 7, disponibilite: true } },
      ],
    });

    render(
      <LanguageProvider>
        <ManagerOrdersPage />
      </LanguageProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Assigner' }));
    await screen.findByText('Livreur Un');

    const buttons = screen.getAllByRole('button', { name: 'Assigner' });
    fireEvent.click(buttons[buttons.length - 1]);

    expect(await screen.findByText(/Veuillez sélectionner un livreur disponible/i)).toBeTruthy();
    expect(mocks.managerAssignLivreur).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: /Livreur Deux/ }));
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(mocks.managerAssignLivreur).toHaveBeenCalledWith(88, 12));
  });
});
