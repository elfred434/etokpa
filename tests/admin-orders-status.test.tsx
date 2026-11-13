// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  status: 'en_attente',
  updateOrderStatus: vi.fn(),
  confirm: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => ({ q: undefined }),
}));
vi.mock('../src/services/api', () => ({
  adminApi: { updateOrderStatus: (...args: unknown[]) => mocks.updateOrderStatus(...args) },
}));
vi.mock('../src/components/layout/admin/AdminLayout', async () => {
  const ReactModule = await import('react');
  return { default: ({ children }: { children: React.ReactNode }) => ReactModule.createElement('div', null, children) };
});
vi.mock('../src/components/orders/PlatformOrdersPanel', async () => {
  const ReactModule = await import('react');
  return {
    default: ({ renderActions, reloadKey }: { renderActions?: (order: any) => React.ReactNode; reloadKey?: number }) => ReactModule.createElement(
      'div',
      { 'data-testid': 'orders-panel', 'data-reload-key': reloadKey },
      renderActions?.({ id: 71, statut: mocks.status }),
    ),
  };
});
vi.mock('../src/components/shared/AdminActionDialogs', () => ({
  adminDialogs: { confirm: (...args: unknown[]) => mocks.confirm(...args) },
}));
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: vi.fn() }));
vi.mock('../src/i18n/tx', () => ({
  tx: (value: string) => value,
  tr: (fr: string) => fr,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import AdminOrdersPage from '../src/pages/admin/AdminOrdersPage';

beforeEach(() => {
  mocks.status = 'en_attente';
  mocks.updateOrderStatus.mockReset();
  mocks.confirm.mockReset();
  mocks.navigate.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  mocks.updateOrderStatus.mockResolvedValue({ success: true });
  mocks.confirm.mockResolvedValue(true);
});

afterEach(() => cleanup());

describe('AdminOrdersPage status workflow', () => {
  it('advances a pending order to preparation and reloads the list', async () => {
    render(<AdminOrdersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la préparation #71' }));

    await waitFor(() => expect(mocks.updateOrderStatus).toHaveBeenCalledWith(71, 'en_preparation'));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Commande #71 : démarrer la préparation.');
    await waitFor(() => expect(screen.getByTestId('orders-panel').getAttribute('data-reload-key')).toBe('1'));
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('requires confirmation before cancelling an order', async () => {
    render(<AdminOrdersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler la commande #71' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith(71, 'annule');
  });

  it('shows an API failure without pretending the status changed', async () => {
    mocks.updateOrderStatus.mockRejectedValue(new Error('transition refusée'));
    render(<AdminOrdersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la préparation #71' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(mocks.toastError).toHaveBeenCalled();
    expect(screen.getByTestId('orders-panel').getAttribute('data-reload-key')).toBe('0');
  });

  it('offers no status action for terminal orders', () => {
    mocks.status = 'livre';
    render(<AdminOrdersPage />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
