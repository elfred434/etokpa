// @vitest-environment jsdom
/**
 * Adaptation aux commits backend `326e518` / `e82bc66` :
 * - `GET /api/landmarks` renvoie `PointRepere::query()->with('zone')->get()`
 * - Le webhook FedaPay (`GET|POST /webhooks/fedapay` & `/webhook`) redirige vers `/confirmation` sans query params.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { LanguageProvider } from '../src/context/LanguageContext';
import { store } from '../src/store';
import { add, clear } from '../src/store/slices/cart/cartSlice';

const getLandmarks = vi.fn();
const getZones = vi.fn();
const getProfile = vi.fn();
const getProposals = vi.fn();
const getCart = vi.fn();
const getOrders = vi.fn();
const getOrder = vi.fn();
const getPayment = vi.fn();
const navigate = vi.fn();

vi.mock('../src/services/api', () => ({
  landmarksApi: {
    getLandmarks: (...a: unknown[]) => getLandmarks(...a),
    createLandmark: vi.fn(),
    deleteLandmark: vi.fn(),
  },
  catalogApi: {
    getZones: (...a: unknown[]) => getZones(...a),
  },
  authApi: {
    getProfile: (...a: unknown[]) => getProfile(...a),
  },
  negotiationApi: {
    getProposals: (...a: unknown[]) => getProposals(...a),
  },
  cartApi: {
    getCart: (...a: unknown[]) => getCart(...a),
  },
  ordersApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getOrder: (...a: unknown[]) => getOrder(...a),
  },
  paymentsApi: {
    getPayment: (...a: unknown[]) => getPayment(...a),
  },
  readCreatedOrder: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to?: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => navigate,
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/confirmation' }),
  useRouterState: () => undefined,
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav /> }));
vi.mock('../src/hooks/useRefresh', () => ({
  useGlobalRefreshTick: () => 0,
  silentRefreshActive: () => false,
}));

import CartPage from '../src/pages/client/panier/CartPage';
import ConfirmationPage from '../src/pages/client/confirmation-commande/ConfirmationPage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  localStorage.setItem('tokpa_token', 'tokpa-test-jwt');
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 7, role: 'client', nom_complet: 'Awa Client' }));
  store.dispatch(clear());
  vi.clearAllMocks();

  getZones.mockResolvedValue({
    data: [
      { id: 1, nom: 'Dantokpa', km_prix: 500, points_repere: [] },
      { id: 7, nom: 'Cadjèhoun', km_prix: 1000, points_repere: [] },
    ],
  });
  getProfile.mockResolvedValue({ data: { profil: {} } });
  getProposals.mockResolvedValue({ data: [] });
  getCart.mockResolvedValue({ data: { items: [] } });
});

describe('synchronisation backend e82bc66 (landmarks with zone + webhook confirmation)', () => {
  it('CartPage résout la zone d’un repère GET /landmarks même si seul `zone.id` est fourni', async () => {
    getLandmarks.mockResolvedValue([
      { id: 15, nom: 'Carrefour Étoile', description: 'Près de la pharmacie', zone: { id: 7, nom: 'Cadjèhoun' } },
    ]);
    store.dispatch(
      add({
        product: { id: 10, nom: 'Riz parfumé', prix: 2000, stock: 5, disponible: true } as never,
        quantity: 1,
      }),
    );

    render(
      <Provider store={store}>
        <LanguageProvider>
          <CartPage />
        </LanguageProvider>
      </Provider>,
    );

    const landmarkOption = await screen.findByRole('option', { name: 'Carrefour Étoile' });
    const select = landmarkOption.closest('select')!;
    fireEvent.change(select, { target: { value: 'row-15' } });

    await waitFor(() => {
      expect(screen.getByText(/3\s*000\s*FCFA/)).toBeTruthy();
    });
  });

  it('ConfirmationPage recharge la dernière commande après une redirection webhook sans query params', async () => {
    getOrders.mockResolvedValue({ data: [{ id: 88 }] });
    getOrder.mockResolvedValue({
      data: {
        id: 88,
        montant_total: 4500,
        landmark: { nom: 'Étoile Rouge', zone: { id: 7, nom: 'Cadjèhoun' } },
        payment: { id: 301, fedapay_ref: 'FEDA-88' },
      },
    });
    getPayment.mockResolvedValue({ data: { id: 301, statut: 'reussi' } });

    render(
      <LanguageProvider>
        <ConfirmationPage />
      </LanguageProvider>,
    );

    expect(await screen.findByText('#TOK-88')).toBeTruthy();
    expect(screen.getByText('Cadjèhoun')).toBeTruthy();
    expect(screen.getByText('Étoile Rouge')).toBeTruthy();
    expect(await screen.findByText(/Votre paiement a été accepté par FedaPay/i)).toBeTruthy();
    expect(screen.getByText('FEDA-88')).toBeTruthy();
  });
});
