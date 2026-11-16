// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../src/store';

const mocks = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getCategories: vi.fn(),
  getBundles: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  catalogApi: {
    getProducts: mocks.getProducts,
    getCategories: mocks.getCategories,
    getBundles: mocks.getBundles,
  },
}));
vi.mock('../src/components/layout/client/ClientNavbar', () => ({
  default: ({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) => (
    <input
      aria-label="Rechercher"
      value={search ?? ''}
      onChange={(e) => onSearch?.(e.target.value)}
    />
  ),
}));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav /> }));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'fr', t: (k: string) => k }),
}));
vi.mock('../src/hooks/useRefresh', () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));
vi.mock('../src/i18n/tx', () => ({ tr: (fr: string) => fr, tx: (text: string) => text }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouterState: (opts?: { select?: (s: { location: { search: Record<string, string> } }) => unknown }) =>
    opts?.select ? opts.select({ location: { search: {} } }) : { location: { search: {} } },
}));

import CatalogPage from '../src/pages/client/catalogue/CatalogPage';

describe('CatalogPage search resilience against case-sensitive backend LIKE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategories.mockResolvedValue({ data: [{ id: 1, nom: 'Épices', slug: 'epice' }] });
    mocks.getBundles.mockResolvedValue({ data: [] });
  });

  afterEach(() => cleanup());

  it('keeps "Cube d\'assaisonnement" visible after typing "cub" without overwriting the list via ?q=cub', async () => {
    mocks.getProducts.mockImplementation(async (params?: { q?: string }) => {
      // Simule un backend PostgreSQL dont LIKE '%cub%' est sensible à la casse
      if (params?.q === 'cub') return { data: [] };
      return {
        data: [
          {
            id: 1,
            nom: "Cube d'assaisonnement (sachet 10)",
            description: 'Cubes maggi locaux.',
            prix: 300,
            prix_minimum: 250,
            stock: null,
            disponible: true,
            categorie: { id: 1, nom: 'Épices', slug: 'epice' },
          },
          {
            id: 2,
            nom: "Pâte d'arachide (500g)",
            description: 'Pâte artisanale.',
            prix: 900,
            prix_minimum: 700,
            stock: null,
            disponible: true,
            categorie: { id: 1, nom: 'Épices', slug: 'epice' },
          },
        ],
        meta: { current_page: 1, last_page: 1 },
      };
    });

    render(
      <Provider store={store}>
        <CatalogPage />
      </Provider>,
    );

    expect(await screen.findByText("Cube d'assaisonnement (sachet 10)")).toBeTruthy();

    const searchInput = screen.getByLabelText('Rechercher');
    fireEvent.change(searchInput, { target: { value: 'cub' } });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });

    expect(screen.getByText("Cube d'assaisonnement (sachet 10)")).toBeTruthy();
    expect(screen.queryByText("Pâte d'arachide (500g)")).toBeNull();
    expect(mocks.getProducts).toHaveBeenCalledTimes(1);
    expect(mocks.getProducts.mock.calls[0][0]).not.toHaveProperty('q');

    // Vérifie aussi la recherche insensible aux accents (« pate » → « Pâte d'arachide »)
    fireEvent.change(searchInput, { target: { value: 'pate' } });
    expect(screen.getByText("Pâte d'arachide (500g)")).toBeTruthy();
    expect(screen.queryByText("Cube d'assaisonnement (sachet 10)")).toBeNull();
  });

  it('loads all catalog pages when last_page > 1', async () => {
    mocks.getProducts.mockImplementation(async (params?: { page?: number }) => {
      if (params?.page === 2) {
        return {
          data: [
            { id: 2, nom: 'Cube page 2', prix: 300, prix_minimum: 250, stock: null, disponible: true },
          ],
          meta: { current_page: 2, last_page: 2 },
        };
      }
      return {
        data: [
          { id: 1, nom: 'Tomate page 1', prix: 500, prix_minimum: 400, stock: null, disponible: true },
        ],
        meta: { current_page: 1, last_page: 2 },
      };
    });

    render(
      <Provider store={store}>
        <CatalogPage />
      </Provider>,
    );

    expect(await screen.findByText('Cube page 2')).toBeTruthy();
    expect(screen.getByText('Tomate page 1')).toBeTruthy();
    expect(mocks.getProducts).toHaveBeenCalledTimes(2);
  });
});
