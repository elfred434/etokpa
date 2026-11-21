// @vitest-environment jsdom
/**
 * Bouton « Repayer » pour les commandes dont le paiement a échoué (`statut: 'echoue'`).
 *
 * Couvre :
 *   - OrdersListPage (tableau + modale de détail + non-réutilisation d'un ancien lien/clé)
 *   - OrderTrackingPage (fiche récapitulative de la commande suivie)
 *   - PaymentsPanel (vue client `source="mine"` vs vue admin `source="all"`, et ordre déjà payé ensuite)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';

const getOrders = vi.fn();
const getOrder = vi.fn();
const getTracking = vi.fn();
const cancelOrder = vi.fn();
const initPayment = vi.fn();
const listMine = vi.fn();
const listAll = vi.fn();
const getZones = vi.fn();
const getUsers = vi.fn();
const navigate = vi.fn();

vi.mock('../src/services/api', () => ({
  ordersApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getOrder: (...a: unknown[]) => getOrder(...a),
    getTracking: (...a: unknown[]) => getTracking(...a),
    cancel: (...a: unknown[]) => cancelOrder(...a),
  },
  paymentsApi: {
    initPayment: (...a: unknown[]) => initPayment(...a),
    listMine: (...a: unknown[]) => listMine(...a),
    listAll: (...a: unknown[]) => listAll(...a),
    listOwnAsAdmin: (...a: unknown[]) => listMine(...a),
  },
  catalogApi: {
    getZones: (...a: unknown[]) => getZones(...a),
  },
  adminApi: {
    getUsers: (...a: unknown[]) => getUsers(...a),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to?: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => navigate,
  useSearch: () => ({ order: 42 }),
  useLocation: () => ({ pathname: '/commandes' }),
  useRouterState: () => '/commandes',
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav data-testid="bottom-nav" /> }));
vi.mock('../src/components/client/commandes/RealBeninMap', () => ({ default: () => <div data-testid="map" /> }));
vi.mock('../src/hooks/useRiderLocation', () => ({
  useRiderLocation: () => ({ riderCoords: null, estimatedMinutes: null, source: 'none' }),
}));
vi.mock('../src/hooks/useRealtimeNotifications', () => ({
  subscribeRealtimeRefresh: () => () => {},
}));

import OrdersListPage from '../src/pages/client/commandes/OrdersListPage';
import OrderTrackingPage from '../src/pages/client/commandes/OrderTrackingPage';
import PaymentsPanel from '../src/components/payments/PaymentsPanel';
import { rememberPayment } from '../src/utils/idempotence';

function connecterClient() {
  localStorage.setItem('tokpa_token', 'tokpa-test-jwt');
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 7, role: 'client', nom_complet: 'Awa Client' }));
}

function connecterAdmin() {
  localStorage.setItem('tokpa_token', 'tokpa-admin-jwt');
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 1, role: 'admin', nom_complet: 'Admin Test' }));
}

const commandeEchoue = {
  id: 42,
  statut: 'en_attente',
  montant_total: 2500,
  frais_livraison: 500,
  description_lieu: 'Carrefour Vodjè',
  created_at: '2026-11-15T10:00:00Z',
  items: [{ id: 1, nom: 'Tomates', quantite: 2, prix_unitaire: 1000 }],
  landmark: { id: 3, nom: 'Vodjè' },
  payment: { id: 101, montant: 2500, statut: 'echoue', methode: 'fedapay' },
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  connecterClient();
  vi.clearAllMocks();
  getZones.mockResolvedValue({ data: [] });
  getTracking.mockResolvedValue({ position: null, distance_km: null });
  getUsers.mockResolvedValue({ data: [] });
  initPayment.mockResolvedValue({
    payment: { id: 202, order_id: 42, montant: 2500, statut: 'en_attente', methode: 'fedapay', fedapay_ref: 'DEV-202' },
    redirect_url: '',
  });
});

describe('bouton Repayer — OrdersListPage', () => {
  it('affiche Repayer sur la ligne et dans la modale quand le paiement a échoué, avec nouvelle clé idempotente', async () => {
    // Simule un ancien paiement échoué mémorisé en sessionStorage
    const oldIntent = rememberPayment({
      orderId: 42,
      paymentId: 101,
      redirectUrl: 'https://checkout.fedapay.com/stale-failed-link',
    });

    // GET /orders ne renvoie pas payment (comportement backend réel), mais GET /payments le renvoie
    getOrders.mockResolvedValue({
      data: [{ ...commandeEchoue, payment: undefined }],
      meta: { last_page: 1, total: 1 },
    });
    listMine.mockResolvedValue({
      data: [{ id: 101, order_id: 42, montant: 2500, statut: 'echoue', methode: 'fedapay' }],
    });
    getOrder.mockResolvedValue({ data: commandeEchoue });

    render(
      <LanguageProvider>
        <OrdersListPage />
      </LanguageProvider>,
    );

    const rowButtons = await screen.findAllByRole('button', { name: /Repayer/i });
    expect(rowButtons.length).toBeGreaterThan(0);

    // Ouvrir la modale de la commande #42
    await act(async () => {
      fireEvent.click(screen.getByText('#42'));
    });

    const dialog = await screen.findByRole('dialog');
    const modal = within(dialog);
    expect(modal.getByText('Paiement échoué')).toBeTruthy();

    const modalRepayBtn = modal.getByRole('button', { name: /Repayer/i });
    expect(modalRepayBtn).toBeTruthy();
    expect(modal.queryByRole('button', { name: /^Payer$/i })).toBeNull();

    await act(async () => {
      fireEvent.click(modalRepayBtn);
    });

    await waitFor(() => expect(initPayment).toHaveBeenCalledTimes(1));
    expect(initPayment).toHaveBeenCalledWith({ order_id: 42 }, expect.any(String));
    const usedKey = initPayment.mock.calls[0][1];
    expect(usedKey).not.toBe(oldIntent.idempotencyKey);
  });

  it("n'affiche pas Repayer si la commande est annulée ou déjà payée avec succès", async () => {
    getOrders.mockResolvedValue({
      data: [
        { ...commandeEchoue, id: 42, statut: 'annule', payment: undefined },
        { ...commandeEchoue, id: 43, statut: 'en_attente', payment: undefined },
      ],
      meta: { last_page: 1, total: 2 },
    });
    listMine.mockResolvedValue({
      data: [
        { id: 101, order_id: 42, montant: 2500, statut: 'echoue', methode: 'fedapay' },
        { id: 102, order_id: 43, montant: 2500, statut: 'echoue', methode: 'fedapay' },
        { id: 103, order_id: 43, montant: 2500, statut: 'reussi', methode: 'fedapay' },
      ],
    });

    render(
      <LanguageProvider>
        <OrdersListPage />
      </LanguageProvider>,
    );

    await screen.findByText('#42');
    await screen.findByText('#43');
    expect(screen.queryByRole('button', { name: /Repayer/i })).toBeNull();
  });
});

describe('bouton Repayer — OrderTrackingPage', () => {
  it('affiche Repayer sur le suivi si la commande a un paiement échoué et relance initPayment', async () => {
    getOrders.mockResolvedValue({ data: [{ ...commandeEchoue, payment: undefined }] });
    getOrder.mockResolvedValue({ data: commandeEchoue });
    listMine.mockResolvedValue({
      data: [{ id: 101, order_id: 42, montant: 2500, statut: 'echoue', methode: 'fedapay' }],
    });

    render(
      <LanguageProvider>
        <OrderTrackingPage />
      </LanguageProvider>,
    );

    const repayBtn = await screen.findByRole('button', { name: /Repayer/i });
    await act(async () => {
      fireEvent.click(repayBtn);
    });

    await waitFor(() => expect(initPayment).toHaveBeenCalledWith({ order_id: 42 }, expect.any(String)));
  });

  it("n'affiche pas le bouton Reçu sur OrderTrackingPage tant que la commande est en préparation, et l'affiche en livraison avec livreur", async () => {
    getOrders.mockResolvedValueOnce({ data: [{ ...commandeEchoue, statut: 'en_preparation', payment: undefined }] });
    getOrder.mockResolvedValueOnce({ data: { ...commandeEchoue, statut: 'en_preparation', livreur: null } });
    listMine.mockResolvedValueOnce({
      data: [{ id: 101, order_id: 42, montant: 2500, statut: 'reussi', methode: 'fedapay' }],
    });

    const { unmount } = render(
      <LanguageProvider>
        <OrderTrackingPage />
      </LanguageProvider>,
    );

    await screen.findByText(/Le reçu sera disponible dès la prise en charge par un livreur/i);
    expect(screen.queryByTestId('receipt-order-42')).toBeNull();
    unmount();

    getOrders.mockResolvedValueOnce({
      data: [{ ...commandeEchoue, statut: 'en_livraison', livreur: { id: 5, nom_complet: 'Koffi Livreur' }, payment: undefined }],
    });
    getOrder.mockResolvedValueOnce({
      data: { ...commandeEchoue, statut: 'en_livraison', livreur: { id: 5, nom_complet: 'Koffi Livreur' } },
    });
    listMine.mockResolvedValueOnce({
      data: [{ id: 101, order_id: 42, montant: 2500, statut: 'reussi', methode: 'fedapay' }],
    });

    render(
      <LanguageProvider>
        <OrderTrackingPage />
      </LanguageProvider>,
    );

    expect(await screen.findByTestId('receipt-order-42')).toBeTruthy();
  });
});

describe('bouton Repayer — PaymentsPanel', () => {
  it('affiche Repayer côté client uniquement si aucun paiement réussi existe pour la commande', async () => {
    listMine.mockResolvedValue({
      data: [
        {
          id: 101,
          order_id: 42,
          client_id: 7,
          montant: '2500.00',
          methode: 'fedapay',
          statut: 'echoue',
          fedapay_ref: 'DEV-101',
          order: { id: 42, statut: 'en_attente' },
        },
        {
          id: 102,
          order_id: 43,
          client_id: 7,
          montant: '1500.00',
          methode: 'fedapay',
          statut: 'echoue',
          fedapay_ref: 'DEV-102',
          order: { id: 43, statut: 'en_attente' },
        },
        {
          id: 103,
          order_id: 43,
          client_id: 7,
          montant: '1500.00',
          methode: 'fedapay',
          statut: 'reussi',
          fedapay_ref: 'DEV-103',
          order: { id: 43, statut: 'en_preparation' },
        },
      ],
    });
    getOrder.mockResolvedValue({ data: commandeEchoue });

    render(
      <LanguageProvider>
        <PaymentsPanel source="mine" title="Mes paiements" />
      </LanguageProvider>,
    );

    // Une seule ligne (#101 / commande #42) peut être repayée ; #102 (commande #43) a déjà #103 réussi
    const rowRepayButtons = await screen.findAllByRole('button', { name: /Repayer/i });
    expect(rowRepayButtons).toHaveLength(1);

    // Ouvrir la modale du paiement échoué #101
    await act(async () => {
      fireEvent.click(screen.getByText('#101'));
    });
    const dialog = await screen.findByRole('dialog');
    const modalRepayBtn = within(dialog).getByRole('button', { name: /Repayer/i });

    await act(async () => {
      fireEvent.click(modalRepayBtn);
    });
    await waitFor(() => expect(initPayment).toHaveBeenCalledWith({ order_id: 42 }, expect.any(String)));
  });

  it("n'affiche pas Repayer dans la vue admin (source='all')", async () => {
    connecterAdmin();
    listAll.mockResolvedValue({
      data: [
        {
          id: 101,
          order_id: 42,
          client_id: 7,
          montant: '2500.00',
          methode: 'fedapay',
          statut: 'echoue',
          fedapay_ref: 'DEV-101',
          order: { id: 42, statut: 'en_attente' },
        },
      ],
    });

    render(
      <LanguageProvider>
        <PaymentsPanel source="all" title="Paiements" />
      </LanguageProvider>,
    );

    await screen.findByText('#101');
    expect(screen.queryByRole('button', { name: /Repayer/i })).toBeNull();
  });
});
