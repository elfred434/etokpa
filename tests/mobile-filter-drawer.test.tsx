// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../src/context/LanguageContext';
import { MobileFilterDrawer, MobileFilterTrigger } from '../src/components/shared/MobileFilterDrawer';
import AdminLogsPage from '../src/pages/admin/AdminLogsPage';
import AdminUsersPage from '../src/pages/admin/AdminUsersPage';
import AdminCatalogPage from '../src/pages/admin/AdminCatalogPage';
import PlatformOrdersPanel from '../src/components/orders/PlatformOrdersPanel';

const {
  getAuditLogsMock,
  getOrdersMock,
  getZonesMock,
  getUsersMock,
  getProductsMock,
  getCategoriesMock,
} = vi.hoisted(() => ({
  getAuditLogsMock: vi.fn(),
  getOrdersMock: vi.fn(),
  getZonesMock: vi.fn(),
  getUsersMock: vi.fn(),
  getProductsMock: vi.fn(),
  getCategoriesMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: any) => <a href={typeof to === 'string' ? to : '#'} {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../src/components/layout/admin/AdminNotificationBell', () => ({
  default: () => null,
}));

vi.mock('../src/services/api', () => ({
  adminApi: {
    getAuditLogs: (...args: any[]) => getAuditLogsMock(...args),
    getOrders: (...args: any[]) => getOrdersMock(...args),
    getZones: (...args: any[]) => getZonesMock(...args),
    getUsers: (...args: any[]) => getUsersMock(...args),
    getProducts: (...args: any[]) => getProductsMock(...args),
    getCategories: (...args: any[]) => getCategoriesMock(...args),
    getNotifications: vi.fn().mockResolvedValue({ data: [] }),
  },
  managerApi: {
    getOrders: vi.fn().mockResolvedValue({ data: [] }),
    getZones: vi.fn().mockResolvedValue({ data: [] }),
  },
  catalogApi: {
    getProduct: vi.fn().mockResolvedValue({ data: {} }),
    getZones: (...args: any[]) => getZonesMock(...args),
  },
  authApi: {},
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MobileFilterDrawer & mobile filter sections', () => {
  it('renders badge and handles reset/apply/close on MobileFilterDrawer', () => {
    const onClose = vi.fn();
    const onReset = vi.fn();
    const onApply = vi.fn();
    render(
      <LanguageProvider>
        <MobileFilterTrigger onClick={vi.fn()} activeCount={3} />
        <MobileFilterDrawer
          open
          title="Filtres test"
          onClose={onClose}
          onReset={onReset}
          onApply={onApply}
        >
          <p>Contenu filtre</p>
        </MobileFilterDrawer>
      </LanguageProvider>,
    );

    expect(screen.getByText('3')).toBeTruthy();
    const dialog = screen.getByRole('dialog', { name: 'Filtres test' });
    expect(dialog.className).toContain('rounded-t-2xl');

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(onReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));
    expect(onApply).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens mobile filter drawer in AdminLogsPage and applies date/action filters', async () => {
    getAuditLogsMock.mockResolvedValue({
      data: [{ id: 1, action: 'GET /api/admin/orders', created_at: '2026-11-18T10:00:00Z' }],
      current_page: 1,
      last_page: 1,
      total: 1,
    });

    render(
      <LanguageProvider>
        <AdminLogsPage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }));
    const drawer = screen.getByRole('dialog', { name: 'Filtres des logs' });
    expect(drawer).toBeTruthy();

    const dateInputs = screen.getAllByLabelText('Date de début');
    fireEvent.change(dateInputs[0], { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Appliquer' })[0]);

    await waitFor(() => {
      expect(getAuditLogsMock).toHaveBeenLastCalledWith({ page: 1, from: '2026-11-01' });
    });
  });

  it('opens mobile filter drawer in PlatformOrdersPanel and filters by status', async () => {
    getZonesMock.mockResolvedValue({ data: [{ id: 1, nom: 'Akpakpa' }] });
    getOrdersMock.mockResolvedValue({
      data: [
        { id: 10, statut: 'en_attente', montant_total: 1000, created_at: '2026-11-18T08:00:00Z' },
        { id: 11, statut: 'livre', montant_total: 2000, created_at: '2026-11-18T09:00:00Z' },
      ],
      meta: { current_page: 1, last_page: 1, total: 2 },
    });

    render(
      <LanguageProvider>
        <PlatformOrdersPanel source="admin" title="Commandes" />
      </LanguageProvider>,
    );

    await waitFor(() => expect(getOrdersMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }));
    const drawer = screen.getByRole('dialog', { name: 'Filtres des commandes' });
    expect(drawer).toBeTruthy();

    const livreesButtons = screen.getAllByRole('button', { name: 'Livrées' });
    fireEvent.click(livreesButtons[0]);

    await waitFor(() => {
      expect(getOrdersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ statut: 'livre' }),
      );
    });
  });

  it('opens mobile filter drawer in AdminUsersPage', async () => {
    getZonesMock.mockResolvedValue({ data: [{ id: 1, nom: 'Akpakpa' }] });
    getUsersMock.mockResolvedValue({
      data: [
        { id: 1, nom_complet: 'Ali Test', email: 'ali@test.bj', role: { nom: 'client' }, statut: 'actif' },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    render(
      <LanguageProvider>
        <AdminUsersPage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(getUsersMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }));
    expect(screen.getByRole('dialog', { name: 'Filtres utilisateurs' })).toBeTruthy();
  });

  it('opens mobile filter drawer in AdminCatalogPage', async () => {
    getProductsMock.mockResolvedValue({
      data: [{ id: 1, nom: 'Tomate', prix: 500, disponible: true, categorie: { id: 1, nom: 'Légumes' } }],
      meta: { current_page: 1, last_page: 1 },
    });
    getCategoriesMock.mockResolvedValue({ data: [{ id: 1, nom: 'Légumes' }] });

    render(
      <LanguageProvider>
        <AdminCatalogPage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(getProductsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }));
    expect(screen.getByRole('dialog', { name: 'Filtres du catalogue' })).toBeTruthy();
  });
});
