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
      rows: [{ id: 1, nom: 'Tomate', prix: 500, prix_minimum: 400, stock: 10, disponible: true }],
      err: null,
      loading: false,
      reload: mocks.reload,
    });
    mocks.getCategories.mockResolvedValue({ data: [] });
    mocks.updateProduct.mockResolvedValue({ data: { stock: 14 } });
    mocks.createProduct.mockResolvedValue({ data: {} });
    mocks.alert.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it('keeps stock in the update payload and blocks repeated clicks while saving', async () => {
    let resolveUpdate: ((value?: unknown) => void) | undefined;
    mocks.updateProduct.mockImplementation(() => new Promise((resolve) => { resolveUpdate = resolve; }));

    render(<AdminCatalogPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '14' } });

    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    const loadingButton = screen.getByRole('button', { name: 'Enregistrement…' });
    expect((loadingButton as HTMLButtonElement).disabled).toBe(true);
    expect(loadingButton.getAttribute('aria-busy')).toBe('true');
    expect(loadingButton.querySelector('.animate-spin')).not.toBeNull();
    expect(mocks.updateProduct).toHaveBeenCalledTimes(1);
    expect(mocks.updateProduct).toHaveBeenCalledWith(1, expect.objectContaining({ stock: 14 }));

    fireEvent.click(loadingButton);
    expect(mocks.updateProduct).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.({ data: { stock: 14 } });
    });
    expect(screen.queryByRole('button', { name: 'Enregistrement…' })).toBeNull();
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it.each(['', '-1', '2.5'])('refuses invalid stock value "%s" before sending', async (stock) => {
    render(<AdminCatalogPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: stock } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(mocks.updateProduct).not.toHaveBeenCalled();
    expect(mocks.alert).toHaveBeenCalledWith(
      'Le stock doit être un entier supérieur ou égal à zéro.',
      { title: 'Stock invalide' },
    );
  });
});
