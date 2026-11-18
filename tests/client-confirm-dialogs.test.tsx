// @vitest-environment jsdom
/**
 * Vérifie que les confirmations côté clientèle et livreur utilisent la même
 * modale in-app (AdminActionDialogHost / adminDialogs) que l'administration,
 * et jamais le `window.confirm()` natif du navigateur.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AdminActionDialogHost } from '../src/components/shared/AdminActionDialogs';
import { store } from '../src/store';
import { add, clear } from '../src/store/slices/cart/cartSlice';

const getOrders = vi.fn();
const getOrder = vi.fn();
const cancelOrder = vi.fn();
const listMinePayments = vi.fn();
const getZones = vi.fn();
const getLandmarks = vi.fn();
const getCart = vi.fn();
const listProposals = vi.fn();
const getProducts = vi.fn();
const getPacks = vi.fn();
const getDeliveries = vi.fn();
const updateDeliveryStatus = vi.fn();
const navigate = vi.fn();

vi.mock('../src/services/api', () => ({
  ordersApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getOrder: (...a: unknown[]) => getOrder(...a),
    cancelOrder: (...a: unknown[]) => cancelOrder(...a),
    cancel: (...a: unknown[]) => cancelOrder(...a),
  },
  paymentsApi: {
    initPayment: vi.fn(),
    listMine: (...a: unknown[]) => listMinePayments(...a),
  },
  catalogApi: {
    getZones: (...a: unknown[]) => getZones(...a),
    getProducts: (...a: unknown[]) => getProducts(...a),
  },
  landmarksApi: {
    list: (...a: unknown[]) => getLandmarks(...a),
  },
  cartApi: {
    getCart: (...a: unknown[]) => getCart(...a),
  },
  negotiationApi: {
    getProposals: (...a: unknown[]) => listProposals(...a),
    listMine: (...a: unknown[]) => listProposals(...a),
    list: (...a: unknown[]) => listProposals(...a),
  },
  packsApi: {
    list: (...a: unknown[]) => getPacks(...a),
  },
  livreurApi: {
    getDeliveries: (...a: unknown[]) => getDeliveries(...a),
    updateStatus: (...a: unknown[]) => updateDeliveryStatus(...a),
    sendPosition: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to?: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => navigate,
  useSearch: () => ({ commande: 42 }),
  useLocation: () => ({ pathname: '/commandes' }),
  useRouterState: () => '/commandes',
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav /> }));
vi.mock('../src/components/layout/livreur/LivreurLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/client/commandes/RealBeninMap', () => ({ default: () => <div /> }));
vi.mock('../src/hooks/useRealtimeNotifications', () => ({
  subscribeRealtimeRefresh: () => () => {},
}));

import OrdersListPage from '../src/pages/client/commandes/OrdersListPage';
import CartPage from '../src/pages/client/panier/CartPage';
import MesPacksPage from '../src/pages/client/mes-packs/MesPacksPage';
import LivreurCoursePage from '../src/pages/livreur/course-active/LivreurCoursePage';
import { savePackDraft } from '../src/utils/packDrafts';

function connecter(role: 'client' | 'livreur') {
  localStorage.setItem('tokpa_token', 'tokpa-test-jwt');
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 7, role, nom_complet: 'Test User' }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  store.dispatch(clear());
  vi.clearAllMocks();
  listMinePayments.mockResolvedValue({ data: [] });
  getZones.mockResolvedValue({ data: [] });
  getLandmarks.mockResolvedValue({ data: [] });
  getCart.mockResolvedValue({ data: { items: [] } });
  listProposals.mockResolvedValue({ data: [] });
  getProducts.mockResolvedValue({ data: [] });
  getPacks.mockResolvedValue({ data: [] });
  cancelOrder.mockResolvedValue({ success: true });
  updateDeliveryStatus.mockResolvedValue({ data: { updated_at: '2026-11-16T12:00:00Z' } });
});

describe('modale de confirmation partagée — clientèle et livreur', () => {
  it('OrdersListPage utilise la modale in-app pour annuler une commande', async () => {
    connecter('client');
    const confirmSpy = vi.spyOn(window, 'confirm');
    const commande = {
      id: 42,
      statut: 'en_attente',
      montant_total: 2500,
      frais_livraison: 500,
      created_at: '2026-11-16T10:00:00Z',
      items: [{ id: 1, nom: 'Riz', quantite: 1, prix_unitaire: 2000 }],
    };
    getOrders.mockResolvedValue({ data: [commande], meta: { last_page: 1, total: 1 } });
    getOrder.mockResolvedValue({ data: commande });

    render(
      <LanguageProvider>
        <OrdersListPage />
        <AdminActionDialogHost />
      </LanguageProvider>,
    );

    fireEvent.click(await screen.findByRole('row', { name: /#42/ }));

    const orderDialog = await screen.findByRole('dialog');
    fireEvent.click(within(orderDialog).getByRole('button', { name: 'Annuler' }));

    const confirmModal = await screen.findByTestId('admin-action-dialog');
    expect(confirmModal.textContent).toContain('Confirmer l’annulation');
    expect(confirmModal.textContent).toContain('#TOK-42');
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(within(confirmModal).getByRole('button', { name: 'Annuler la commande' }));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(42));
  });

  it('CartPage utilise la modale in-app pour vider le panier', async () => {
    connecter('client');
    const confirmSpy = vi.spyOn(window, 'confirm');
    store.dispatch(
      add({
        product: { id: 9, nom: 'Igname', prix: 1200, stock: 10, disponible: true } as never,
        quantity: 2,
      }),
    );

    render(
      <Provider store={store}>
        <LanguageProvider>
          <CartPage />
          <AdminActionDialogHost />
        </LanguageProvider>
      </Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Vider le panier/i }));

    const confirmModal = await screen.findByTestId('admin-action-dialog');
    expect(confirmModal.textContent).toContain('Vider tout le panier ?');
    expect(store.getState().cart.items).toHaveLength(1);
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(within(confirmModal).getByRole('button', { name: 'Vider le panier' }));

    await waitFor(() => expect(store.getState().cart.items).toHaveLength(0));
  });

  it('MesPacksPage utilise la modale in-app pour supprimer un pack local', async () => {
    connecter('client');
    const confirmSpy = vi.spyOn(window, 'confirm');
    savePackDraft({
      localId: 'draft-42',
      nom: 'Pack Test',
      description: 'Test',
      produits: [{ id: 1, nom: 'Tomates', prix: 500, qte: 1, x: 50, y: 50, disponible: true, stock: 5 }],
      extras: {},
      couverture: '',
      total: 500,
    });

    render(
      <Provider store={store}>
        <LanguageProvider>
          <MesPacksPage />
          <AdminActionDialogHost />
        </LanguageProvider>
      </Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));

    const confirmModal = await screen.findByTestId('admin-action-dialog');
    expect(confirmModal.textContent).toContain('Supprimer ce pack ?');
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(within(confirmModal).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(screen.queryByText('Pack Test')).toBeNull());
  });

  it('LivreurCoursePage utilise la modale in-app pour confirmer une livraison', async () => {
    connecter('livreur');
    const confirmSpy = vi.spyOn(window, 'confirm');
    getDeliveries.mockResolvedValue({
      data: [
        {
          id: 42,
          statut: 'en_livraison',
          montant_total: 3500,
          frais_livraison: 500,
          created_at: '2026-11-16T10:00:00Z',
          items: [{ id: 1, nom: 'Tomates', quantite: 1, prix_unitaire: 3000 }],
          landmark: { id: 3, nom: 'Vodjè' },
        },
      ],
    });

    render(
      <LanguageProvider>
        <LivreurCoursePage />
        <AdminActionDialogHost />
      </LanguageProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Marquer comme livré/i }));

    const confirmModal = await screen.findByTestId('admin-action-dialog');
    expect(confirmModal.textContent).toContain('#TOK-42');
    expect(updateDeliveryStatus).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(within(confirmModal).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => expect(updateDeliveryStatus).toHaveBeenCalledWith(42, 'livre'));
  });

  it("aucun appel natif window.confirm/confirm/alert/prompt ne subsiste dans src/", () => {
    const srcRoot = path.resolve(process.cwd(), 'src');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
      });

    const hits: string[] = [];
    for (const file of walk(srcRoot)) {
      const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
      if (rel === 'components/shared/AdminActionDialogs.tsx') continue;
      const stripped = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      if (/\bwindow\.(confirm|alert|prompt)\s*\(|(?<![.\w])(confirm|alert|prompt)\s*\(/.test(stripped)) {
        hits.push(rel);
      }
    }
    expect(hits).toEqual([]);
  });
});
