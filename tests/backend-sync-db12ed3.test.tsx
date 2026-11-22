// @vitest-environment jsdom
/**
 * Tests de synchronisation backend `f8ac3d0..db12ed3` :
 * - `05637ad`: Négociations acceptées valables 12 h sur toutes les commandes du produit, sans création automatique de commande.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { LanguageProvider } from '../src/context/LanguageContext';
import { store } from '../src/store';
import { add, clear } from '../src/store/slices/cart/cartSlice';

const mocks = vi.hoisted(() => ({
  getLandmarks: vi.fn(),
  getZones: vi.fn(),
  getProfile: vi.fn(),
  getProposals: vi.fn(),
  getCart: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  landmarksApi: {
    getLandmarks: (...a: unknown[]) => mocks.getLandmarks(...a),
  },
  catalogApi: {
    getZones: (...a: unknown[]) => mocks.getZones(...a),
  },
  authApi: {
    getProfile: (...a: unknown[]) => mocks.getProfile(...a),
  },
  negotiationApi: {
    getProposals: (...a: unknown[]) => mocks.getProposals(...a),
  },
  cartApi: {
    getCart: (...a: unknown[]) => mocks.getCart(...a),
  },
  ordersApi: {
    getOrders: vi.fn().mockResolvedValue({ data: [] }),
  },
  paymentsApi: {},
  readCreatedOrder: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to?: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => mocks.navigate,
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/panier' }),
  useRouterState: () => undefined,
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav /> }));
vi.mock('../src/hooks/useRefresh', () => ({
  useGlobalRefreshTick: () => 0,
  silentRefreshActive: () => false,
}));

import CartPage from '../src/pages/client/panier/CartPage';

describe('synchronisation backend db12ed3 (négociations 12h dans CartPage)', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('tokpa_lang', 'fr');
    localStorage.setItem('tokpa_token', 'tokpa-test-jwt');
    localStorage.setItem('tokpa_user', JSON.stringify({ id: 7, role: 'client', nom_complet: 'Awa Client' }));
    store.dispatch(clear());
    vi.clearAllMocks();

    mocks.getZones.mockResolvedValue({
      data: [{ id: 1, nom: 'Dantokpa', km_prix: 500, points_repere: [] }],
    });
    mocks.getLandmarks.mockResolvedValue([]);
    mocks.getProfile.mockResolvedValue({ data: { profil: {} } });
    mocks.getCart.mockResolvedValue({ data: { items: [] } });
  });

  it('applique automatiquement une négociation acceptée depuis moins de 12h sur un article du panier', async () => {
    const recentIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mocks.getProposals.mockResolvedValue({
      data: [
        {
          id: 21,
          product_id: 10,
          prix_propose: 1600,
          statut: 'accepte',
          responded_at: recentIso,
          created_at: recentIso,
        },
      ],
    });
    store.dispatch(
      add({
        product: { id: '10', nom: 'Riz parfumé', prix: 2000, stock: 'available', badges: [], quantite: '1kg', origine: '', prixMinimum: 1400, categorie: 'grain' },
        quantity: 2,
      }),
    );

    render(
      <Provider store={store}>
        <LanguageProvider>
          <CartPage />
        </LanguageProvider>
      </Provider>,
    );

    // 2 * 1600 = 3200 sous-total, -800 économie, +500 livraison = 3700 FCFA total
    await waitFor(() => {
      expect(screen.getByText(/Offre acceptée \(12 h\)/i)).toBeTruthy();
      expect(screen.getByText(/Prix négocié appliqué automatiquement/i)).toBeTruthy();
      expect(screen.getByText(/3[\s\u00a0\u202f]700\s*FCFA/)).toBeTruthy();
    });
    expect(screen.queryByText(/Le total à payer reste le prix catalogue/i)).toBeNull();
  });

  it('ignore une négociation acceptée expirée (> 12h) et conserve le prix catalogue', async () => {
    const expiredIso = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
    mocks.getProposals.mockResolvedValue({
      data: [
        {
          id: 22,
          product_id: 10,
          prix_propose: 1600,
          statut: 'accepte',
          responded_at: expiredIso,
          created_at: expiredIso,
        },
      ],
    });
    store.dispatch(
      add({
        product: { id: '10', nom: 'Riz parfumé', prix: 2000, stock: 'available', badges: [], quantite: '1kg', origine: '', prixMinimum: 1400, categorie: 'grain' },
        quantity: 2,
      }),
    );

    render(
      <Provider store={store}>
        <LanguageProvider>
          <CartPage />
        </LanguageProvider>
      </Provider>,
    );

    // 2 * 2000 = 4000 sous-total + 500 livraison = 4500 FCFA
    await waitFor(() => {
      expect(screen.getByText(/4[\s\u00a0\u202f]500\s*FCFA/)).toBeTruthy();
    });
    expect(screen.queryByText(/Offre acceptée \(12 h\)/i)).toBeNull();
  });
});
