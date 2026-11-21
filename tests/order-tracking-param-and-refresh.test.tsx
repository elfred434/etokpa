// @vitest-environment jsdom
/**
 * Régression `/commandes/suivi?order=%2256%22` :
 *   1. Parse propre des paramètres `?order=%2256%22`, `?order="56"`, `?order=56` (jamais NaN).
 *   2. Aucun flash d'informations ou de carte avant résolution de `isOwnOrder` / `getOrder`.
 *   3. Aucun flash lors des actualisations silencieuses répétées (`requestRefresh('auto')`) sur une commande refusée.
 *   4. Une commande appartenant au client s'affiche même si `/tracking` est indisponible ou si la commande est en page 2.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import { parseOrderIdParam } from '../src/utils/ownOrder';
import { requestRefresh } from '../src/services/refresh/refreshBus';

const getOrders = vi.fn();
const getOrder = vi.fn();
const getTracking = vi.fn();
const listMine = vi.fn();
const getZones = vi.fn();
const navigate = vi.fn();
const useRiderLocationSpy = vi.fn();
let currentSearch: Record<string, unknown> = { order: '"56"' };

vi.mock('../src/services/api', () => ({
  ordersApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getOrder: (...a: unknown[]) => getOrder(...a),
    getTracking: (...a: unknown[]) => getTracking(...a),
  },
  paymentsApi: {
    initPayment: vi.fn(),
    listMine: (...a: unknown[]) => listMine(...a),
  },
  catalogApi: {
    getZones: (...a: unknown[]) => getZones(...a),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to?: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => navigate,
  useSearch: () => currentSearch,
  useLocation: () => ({ pathname: '/commandes/suivi' }),
  useRouterState: () => '/commandes/suivi',
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <nav data-testid="bottom-nav" /> }));
vi.mock('../src/components/client/commandes/RealBeninMap', () => ({ default: () => <div data-testid="map" /> }));
vi.mock('../src/hooks/useRiderLocation', () => ({
  useRiderLocation: (opts: unknown) => {
    useRiderLocationSpy(opts);
    return { riderCoords: null, estimatedMinutes: null, source: 'none' };
  },
}));
vi.mock('../src/hooks/useRealtimeNotifications', () => ({
  subscribeRealtimeRefresh: () => () => {},
}));

import OrderTrackingPage from '../src/pages/client/commandes/OrderTrackingPage';

function connecterClient() {
  localStorage.setItem('tokpa_token', 'tokpa-test-jwt');
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 13, role: 'client', nom_complet: 'Elfred Client' }));
}

describe('parseOrderIdParam', () => {
  it('extrait un entier positif depuis 56, "56", \'"56"\' et rejette les valeurs invalides', () => {
    expect(parseOrderIdParam(56)).toBe(56);
    expect(parseOrderIdParam('56')).toBe(56);
    expect(parseOrderIdParam('"56"')).toBe(56);
    expect(parseOrderIdParam("'56'")).toBe(56);
    expect(parseOrderIdParam('  "56"  ')).toBe(56);
    expect(parseOrderIdParam('')).toBeNull();
    expect(parseOrderIdParam('abc')).toBeNull();
    expect(parseOrderIdParam('-5')).toBeNull();
    expect(parseOrderIdParam('0')).toBeNull();
    expect(parseOrderIdParam(null)).toBeNull();
    expect(parseOrderIdParam(undefined)).toBeNull();
  });
});

describe('OrderTrackingPage — ?order=%2256%22 et anti-flash sur actualisations répétées', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('tokpa_lang', 'fr');
    connecterClient();
    vi.clearAllMocks();
    currentSearch = { order: '"56"' };
    getZones.mockResolvedValue({ data: [] });
    listMine.mockResolvedValue({ data: [] });
    getTracking.mockResolvedValue({ position: null, distance_km: null });
  });

  it('résout ?order=\'"56"\' en commande #56 (même en page 2 et si /tracking échoue)', async () => {
    getOrders
      .mockResolvedValueOnce({ data: [{ id: 12, statut: 'en_attente' }], meta: { last_page: 2 } })
      .mockResolvedValueOnce({ data: [{ id: 56, statut: 'en_preparation' }], meta: { last_page: 2 } });
    getOrder.mockResolvedValue({
      data: {
        id: 56,
        statut: 'en_preparation',
        montant_total: 4500,
        frais_livraison: 500,
        items: [{ id: 1, nom: 'Igname', quantite: 2, prix_unitaire: 2000 }],
        landmark: { id: 4, nom: 'Akpakpa' },
      },
    });
    getTracking.mockRejectedValue(new Error('Tracking temporarily unavailable'));

    render(
      <LanguageProvider>
        <OrderTrackingPage />
      </LanguageProvider>,
    );

    const matches = await screen.findAllByText('Commande #56');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/4[\s\u202f]500 FCFA/)).toBeTruthy();
    expect(screen.queryByText(/Tracking temporarily unavailable/i)).toBeNull();
    expect(screen.queryByText(/Commande introuvable/i)).toBeNull();
  });

  it("n'affiche ni flash d'information ni carte pendant le chargement initial puis les actualisations répétées d'une commande refusée", async () => {
    let resolvePage1!: (val: unknown) => void;
    getOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage1 = resolve;
        }),
    );

    render(
      <LanguageProvider>
        <OrderTrackingPage />
      </LanguageProvider>,
    );

    // Pendant le chargement initial, ni carte ni infos de suivi ne doivent flasher
    expect(screen.queryByTestId('map')).toBeNull();
    expect(screen.queryByText(/Suivi en direct/i)).toBeNull();
    expect(screen.queryByText('Commande #56')).toBeNull();
    expect(useRiderLocationSpy).toHaveBeenCalled();
    expect(useRiderLocationSpy.mock.calls.every((c) => (c[0] as { enabled: boolean }).enabled === false)).toBe(true);

    // Résolution : la commande 56 n'appartient pas au compte
    await act(async () => {
      resolvePage1({ data: [{ id: 37, statut: 'en_attente' }], meta: { last_page: 1 } });
    });

    expect(await screen.findByText(/Commande introuvable/i)).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull();
    expect(screen.queryByText(/Suivi en direct/i)).toBeNull();
    expect(getOrder).not.toHaveBeenCalled();

    // Actualisations silencieuses répétées : le message d'erreur reste stable sans jamais flasher la carte ni les infos
    getOrders.mockResolvedValue({ data: [{ id: 37, statut: 'en_attente' }], meta: { last_page: 1 } });
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await requestRefresh('auto');
      });
      expect(screen.getByText(/Commande introuvable/i)).toBeTruthy();
      expect(screen.queryByTestId('map')).toBeNull();
      expect(screen.queryByText(/Suivi en direct/i)).toBeNull();
      expect(screen.queryByText('Commande #56')).toBeNull();
    }
  });

  it('bascule proprement sur Commande introuvable sans flash si getOrder renvoie 403/404, puis reste stable aux actualisations', async () => {
    getOrders.mockResolvedValue({ data: [{ id: 56, statut: 'en_attente' }], meta: { last_page: 1 } });
    getOrder.mockRejectedValue({ response: { status: 403, data: { message: 'Forbidden' } } });

    render(
      <LanguageProvider>
        <OrderTrackingPage />
      </LanguageProvider>,
    );

    expect(await screen.findByText(/Commande introuvable/i)).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull();
    expect(screen.queryByText(/Suivi en direct/i)).toBeNull();

    await act(async () => {
      await requestRefresh('auto');
    });

    expect(screen.getByText(/Commande introuvable/i)).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull();
    expect(screen.queryByText(/Suivi en direct/i)).toBeNull();
  });
});
