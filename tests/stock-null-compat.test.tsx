// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../src/store';

const mocks = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  getCategories: vi.fn(),
  getBundles: vi.fn(),
  adminGetProducts: vi.fn(),
  adminGetOrders: vi.fn(),
  adminGetUsers: vi.fn(),
  adminGetDashboard: vi.fn(),
  adminGetZones: vi.fn(),
  useLiveRows: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  catalogApi: {
    getProducts: mocks.getProducts,
    getProduct: mocks.getProduct,
    getCategories: mocks.getCategories,
    getBundles: mocks.getBundles,
  },
  negotiationApi: { getProposals: vi.fn().mockResolvedValue({ data: [] }) },
  adminApi: {
    getProducts: mocks.adminGetProducts,
    getOrders: mocks.adminGetOrders,
    getUsers: mocks.adminGetUsers,
    getDashboard: mocks.adminGetDashboard,
    getZones: mocks.adminGetZones,
  },
}));
vi.mock('../src/services/api/useLiveRows', () => ({ useLiveRows: mocks.useLiveRows }));
vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/client/DarkFooter', () => ({ default: () => <footer /> }));
vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/client/NegotiationLandmarkField', () => ({ default: () => <div /> }));
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
  useParams: () => ({ productId: '1', packId: '10' }),
  useRouterState: (opts?: { select?: (s: { location: { search: Record<string, string> } }) => unknown }) =>
    opts?.select ? opts.select({ location: { search: {} } }) : { location: { search: {} } },
}));

import HomePage from '../src/pages/client/accueil/HomePage';
import CatalogPage from '../src/pages/client/catalogue/CatalogPage';
import ProductPage from '../src/pages/client/fiche-produit/ProductPage';
import PackPage from '../src/pages/client/fiche-pack/PackPage';
import AdminDashboardPage from '../src/pages/admin/AdminDashboardPage';

describe('Compatibility with backend products without stock column (stock: null)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategories.mockResolvedValue({ data: [{ id: 1, nom: 'Légumes', slug: 'legume', icone: 'eco', couleur: 'primary' }] });
    mocks.getBundles.mockResolvedValue({ data: [] });
    mocks.useLiveRows.mockReturnValue({ rows: [], err: null, loading: false, reload: vi.fn() });
    mocks.adminGetDashboard.mockResolvedValue({ data: {} });
    mocks.adminGetOrders.mockResolvedValue({ data: [] });
    mocks.adminGetUsers.mockResolvedValue({ data: [] });
    mocks.adminGetZones.mockResolvedValue({ data: [] });
  });

  afterEach(() => cleanup());

  it('HomePage renders disponible products when stock is null and excludes unavailable ones', async () => {
    mocks.getProducts.mockResolvedValue({
      data: [
        { id: 1, nom: 'Tomate Fraîche', prix: 500, prix_minimum: 400, stock: null, disponible: true, categorie: { id: 1, nom: 'Légumes', slug: 'legume' } },
        { id: 2, nom: 'Piment Épuisé', prix: 300, prix_minimum: 250, stock: null, disponible: false, categorie: { id: 1, nom: 'Légumes', slug: 'legume' } },
      ],
    });

    render(
      <Provider store={store}>
        <HomePage />
      </Provider>,
    );

    expect((await screen.findAllByText('Tomate Fraîche')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Piment Épuisé')).toBeNull();
    expect(screen.getByText('Disponible')).toBeTruthy();
  });

  it('CatalogPage shows disponible products with stock: null under default filter and keeps unavailable hidden', async () => {
    mocks.getProducts.mockResolvedValue({
      data: [
        { id: 1, nom: 'Igname Pillée', prix: 1200, prix_minimum: 1000, stock: null, disponible: true, categorie: { id: 1, nom: 'Légumes', slug: 'legume' } },
        { id: 2, nom: 'Gombo Indisponible', prix: 400, prix_minimum: 300, stock: null, disponible: false, categorie: { id: 1, nom: 'Légumes', slug: 'legume' } },
      ],
    });

    render(
      <Provider store={store}>
        <CatalogPage />
      </Provider>,
    );

    expect(await screen.findByText('Igname Pillée')).toBeTruthy();
    expect(screen.queryByText('Gombo Indisponible')).toBeNull();
  });

  it('ProductPage marks a disponible product with stock: null as available and enables cart buttons', async () => {
    mocks.getProduct.mockResolvedValue({
      data: { id: 1, nom: 'Oignon Rouge', prix: 900, prix_minimum: 700, devise: 'XOF', stock: null, disponible: true, categorie: { id: 1, nom: 'Légumes', slug: 'legume' } },
    });

    render(
      <Provider store={store}>
        <ProductPage />
      </Provider>,
    );

    expect(await screen.findByRole('heading', { name: 'Oignon Rouge' })).toBeTruthy();
    expect(screen.getByText('Disponible')).toBeTruthy();
    expect(screen.queryByText('Rupture de stock')).toBeNull();
    const addBtn = screen.getByRole('button', { name: /Ajouter au panier/i }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(false);
  });

  it('PackPage allows adding a pack whose products have stock: null and disponible: true', async () => {
    mocks.getBundles.mockResolvedValue({
      data: [
        {
          id: 10,
          nom: 'Pack Marché',
          prix_total: 1500,
          disponible: true,
          products: [
            { id: 1, nom: 'Tomate', prix: 500, stock: null, disponible: true, pivot: { qte: 2 } },
          ],
        },
      ],
    });

    render(
      <Provider store={store}>
        <PackPage />
      </Provider>,
    );

    expect(await screen.findByRole('heading', { name: 'Pack Marché' })).toBeTruthy();
    const addBtn = screen.getByRole('button', { name: /Ajouter le pack au panier/i }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(false);
  });

  it('AdminDashboardPage only flags unavailable products when stock is null', async () => {
    mocks.adminGetProducts.mockResolvedValue({
      data: [
        { id: 1, nom: 'Tomate Dispo', prix: 500, stock: null, disponible: true },
        { id: 2, nom: 'Piment Indispo', prix: 300, stock: null, disponible: false },
      ],
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Piment Indispo/)).toBeTruthy();
    });
    expect(screen.queryByText(/Tomate Dispo/)).toBeNull();
  });
});
