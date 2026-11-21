// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';

const mocks = vi.hoisted(() => ({
  getStats: vi.fn(),
  getManagerOrders: vi.fn(),
  getAdminOrders: vi.fn(),
  getZones: vi.fn(),
  getOrders: vi.fn(),
  listMine: vi.fn(),
  getProduct: vi.fn(),
  createProposal: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
  downloadCsvFile: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to?: string }) => createElement('a', { href: to }, children),
  useNavigate: () => mocks.navigate,
  useSearch: () => ({}),
  useParams: () => ({ productId: '10' }),
}));
vi.mock('../src/services/api', () => ({
  managerApi: {
    getStats: (...args: unknown[]) => mocks.getStats(...args),
    getOrders: (...args: unknown[]) => mocks.getManagerOrders(...args),
  },
  adminApi: {
    getOrders: (...args: unknown[]) => mocks.getAdminOrders(...args),
    getZones: (...args: unknown[]) => mocks.getZones(...args),
    getDashboard: vi.fn().mockResolvedValue({ ca: 50000, commandes: 5, utilisateurs_actifs: 10, par_statut: { en_attente: 1, livre: 4, annule: 0 } }),
    getProducts: vi.fn().mockResolvedValue({ data: [] }),
  },
  catalogApi: {
    getZones: (...args: unknown[]) => mocks.getZones(...args),
    getProduct: (...args: unknown[]) => mocks.getProduct(...args),
  },
  ordersApi: {
    getOrders: (...args: unknown[]) => mocks.getOrders(...args),
    getOrder: vi.fn(),
    cancelOrder: vi.fn(),
  },
  paymentsApi: {
    listMine: (...args: unknown[]) => mocks.listMine(...args),
    initPayment: vi.fn(),
  },
  negotiationApi: {
    createProposal: (...args: unknown[]) => mocks.createProposal(...args),
  },
}));
vi.mock('../src/components/layout/manager/ManagerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));
vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));
vi.mock('../src/components/layout/client/ClientNavbar', () => ({
  default: () => createElement('div', { 'data-testid': 'client-navbar' }),
}));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({
  default: () => createElement('div', { 'data-testid': 'client-bottom-nav' }),
}));
vi.mock('../src/components/client/NegotiationLandmarkField', () => ({
  default: () => createElement('div', { 'data-testid': 'landmark-field' }),
}));
vi.mock('../src/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock('../src/routes/authGuard', () => ({
  currentUserZone: () => 'Cadjehoun',
  currentUserId: () => 1,
  currentUserName: () => 'Client Test',
  isAdminRole: () => false,
}));
vi.mock('../src/hooks/useRefresh', () => ({
  useGlobalRefreshTick: () => 0,
  silentRefreshActive: () => false,
  backgroundRefreshActive: () => false,
}));
vi.mock('../src/utils/csvExport', () => ({
  downloadCsvFile: (...args: unknown[]) => mocks.downloadCsvFile(...args),
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: mocks.toastSuccess, error: mocks.toastError }),
}));

import { LanguageProvider } from '../src/context/LanguageContext';
import { store } from '../src/store';
import ManagerStatsPage from '../src/pages/manager/ManagerStatsPage';
import AdminDashboardPage from '../src/pages/admin/AdminDashboardPage';
import PlatformOrdersPanel from '../src/components/orders/PlatformOrdersPanel';
import OrdersListPage from '../src/pages/client/commandes/OrdersListPage';
import ProductPage from '../src/pages/client/fiche-produit/ProductPage';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  localStorage.setItem('tokpa_token', 'test-token');
  vi.clearAllMocks();
  mocks.getZones.mockResolvedValue({ data: [{ id: 1, nom: 'Cadjehoun' }] });
  mocks.listMine.mockResolvedValue({ data: [] });
});

afterEach(() => cleanup());

describe('Audit recette fixes', () => {
  it('formats ManagerStatsPage counts without FCFA and hides raw dev JSON', async () => {
    mocks.getStats.mockResolvedValue({ ca: 45000, commandes: 12, livrees: 9 });

    render(
      <Provider store={store}>
        <LanguageProvider>
          <ManagerStatsPage />
        </LanguageProvider>
      </Provider>,
    );

    expect(await screen.findByText(/45\s*000\s*FCFA/)).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.queryByText('12 FCFA')).toBeNull();
    expect(screen.queryByText('9 FCFA')).toBeNull();
    expect(screen.queryByText(/Réponse brute/i)).toBeNull();
  });

  it('offers day/week/month period choices and links Tout voir on AdminDashboardPage', async () => {
    mocks.getAdminOrders.mockResolvedValue({ data: [], meta: { last_page: 1 } });

    render(
      <Provider store={store}>
        <LanguageProvider>
          <AdminDashboardPage />
        </LanguageProvider>
      </Provider>,
    );

    const periodSelect = await screen.findByLabelText('Période des statistiques') as HTMLSelectElement;
    expect(Array.from(periodSelect.options).map((o) => o.value)).toEqual(['1', '7', '30']);
    fireEvent.change(periodSelect, { target: { value: '1' } });
    expect(periodSelect.value).toBe('1');

    const seeAll = screen.getByRole('link', { name: /Tout voir/i });
    expect(seeAll.getAttribute('href')).toBe('/admin/commandes');
  });

  it('filters orders by date range in PlatformOrdersPanel (TOK-15-02)', async () => {
    mocks.getAdminOrders.mockResolvedValue({
      data: [
        { id: 101, statut: 'en_attente', montant_total: 1500, created_at: '2026-11-10T10:00:00Z', client: { nom_complet: 'Alice' }, landmark: { nom: 'Dantokpa', zone_id: 1 } },
        { id: 102, statut: 'livre', montant_total: 3200, created_at: '2026-11-15T10:00:00Z', client: { nom_complet: 'Bob' }, landmark: { nom: 'Dantokpa', zone_id: 1 } },
      ],
      meta: { last_page: 1, total: 2 },
    });

    render(
      <Provider store={store}>
        <LanguageProvider>
          <PlatformOrdersPanel source="admin" title="Commandes" />
        </LanguageProvider>
      </Provider>,
    );

    expect(await screen.findByText('#101')).toBeTruthy();
    expect(screen.getByText('#102')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2026-11-14' } });
    await waitFor(() => expect(screen.queryByText('#101')).toBeNull());
    expect(screen.getByText('#102')).toBeTruthy();
  });

  it('filters client orders across pages by status and exports UTF-8 CSV (TOK-15-01 / TOK-18-03)', async () => {
    mocks.getOrders.mockImplementation((page: number) => Promise.resolve({
      data: page === 1
        ? [{ id: 1, statut: 'en_attente', montant_total: 1000, created_at: '2026-11-10T10:00:00Z', items: [] }]
        : [{ id: 2, statut: 'livre', montant_total: 2500, created_at: '2026-11-11T10:00:00Z', items: [] }],
      meta: { last_page: 2, total: 2 },
    }));

    render(
      <Provider store={store}>
        <LanguageProvider>
          <OrdersListPage />
        </LanguageProvider>
      </Provider>,
    );

    expect(await screen.findByText('#1')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'livre' } });

    await waitFor(() => expect(screen.getByText('#2')).toBeTruthy());
    expect(screen.queryByText('#1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Exporter CSV/i }));
    expect(mocks.downloadCsvFile).toHaveBeenCalledTimes(1);
    expect(mocks.downloadCsvFile.mock.calls[0][0]).toMatch(/^commandes-tokpa-/);
  });

  it('rejects budget proposal higher than the product catalog price (TOK-11-02)', async () => {
    mocks.getProduct.mockResolvedValue({
      data: { id: 10, nom: 'Tomates', prix: 1000, prix_minimum: 700, disponible: true, stock: 10 },
    });

    render(
      <Provider store={store}>
        <LanguageProvider>
          <ProductPage />
        </LanguageProvider>
      </Provider>,
    );

    const input = await screen.findByRole('spinbutton');
    expect(document.body.textContent).not.toContain('Budget min. accepté');
    expect(document.body.textContent).not.toContain('Prix min. négociable');
    expect(document.body.textContent).not.toContain("Ce choix reste sur cet appareil : l'API ne le garde pas encore sur la proposition.");
    expect(document.body.textContent).not.toContain('700 FCFA');
    fireEvent.change(input, { target: { value: '1500' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer l’offre/i }));
    });

    expect(mocks.createProposal).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/ne peut pas dépasser le prix catalogue/i));

    mocks.toastError.mockClear();
    fireEvent.change(input, { target: { value: '500' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Envoyer l’offre/i }));
    });
    expect(mocks.createProposal).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/trop basse/i));
    expect(mocks.toastError.mock.calls[0]?.[0]).not.toContain('700');
  });
});
