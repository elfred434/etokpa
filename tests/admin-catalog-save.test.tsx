// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  useLiveRows: vi.fn(),
  getCategories: vi.fn(),
  updateProduct: vi.fn(),
  createProduct: vi.fn(),
  alert: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('../src/services/api/useLiveRows', () => ({ useLiveRows: mocks.useLiveRows }));
vi.mock('../src/services/api', () => ({
  adminApi: {
    getCategories: mocks.getCategories,
    updateProduct: mocks.updateProduct,
    createProduct: mocks.createProduct,
  },
}));
vi.mock('../src/utils/designRuntime', () => ({ useDesignScript: vi.fn() }));
vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('../src/components/shared/AdminActionDialogs', () => ({
  adminDialogs: { alert: mocks.alert, confirm: vi.fn() },
}));
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: vi.fn() }));
vi.mock('../src/hooks/useRefresh', () => ({ useGlobalRefreshTick: () => 0 }));
vi.mock('../src/i18n/tx', () => ({ tr: (fr: string) => fr, tx: (text: string) => text }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));

import AdminCatalogPage from '../src/pages/admin/AdminCatalogPage';

describe('AdminCatalogPage product save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLiveRows.mockReturnValue({
      rows: [{ id: 1, nom: 'Tomate', prix: 500, prix_minimum: 400, stock: null, disponible: true }],
      err: null,
      loading: false,
      reload: mocks.reload,
    });
    mocks.getCategories.mockResolvedValue({ data: [] });
    mocks.updateProduct.mockResolvedValue({ data: { disponible: true } });
    mocks.createProduct.mockResolvedValue({ data: {} });
    mocks.alert.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it('saves without a stock field when backend returns stock: null and blocks repeated clicks while saving', async () => {
    let resolveUpdate: ((value?: unknown) => void) | undefined;
    mocks.updateProduct.mockImplementation(() => new Promise((resolve) => { resolveUpdate = resolve; }));

    render(<AdminCatalogPage />);
    expect(screen.getByText('Disponible')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.change(screen.getByDisplayValue('Tomate'), { target: { value: 'Tomate Bio' } });

    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    const loadingButton = screen.getByRole('button', { name: 'Enregistrement…' });
    expect((loadingButton as HTMLButtonElement).disabled).toBe(true);
    expect(loadingButton.getAttribute('aria-busy')).toBe('true');
    expect(loadingButton.querySelector('.animate-spin')).not.toBeNull();
    expect(mocks.updateProduct).toHaveBeenCalledTimes(1);
    const sentPayload = mocks.updateProduct.mock.calls[0][1] as Record<string, unknown>;
    expect(sentPayload).toMatchObject({ nom: 'Tomate Bio', disponible: true });
    expect('stock' in sentPayload).toBe(false);

    fireEvent.click(loadingButton);
    expect(mocks.updateProduct).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.({ data: { disponible: true } });
    });
    expect(screen.queryByRole('button', { name: 'Enregistrement…' })).toBeNull();
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it('sends disponible: false when availability toggle is unchecked', async () => {
    render(<AdminCatalogPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));

    const checkbox = screen.getByLabelText('Disponible à la vente') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(mocks.updateProduct).toHaveBeenCalledWith(1, expect.objectContaining({ disponible: false }));
  });
});
