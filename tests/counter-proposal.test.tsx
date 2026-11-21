// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../src/store/slices/cart/cartSlice';
import negotiationReducer from '../src/store/slices/negotiation/negotiationSlice';
import { LanguageProvider } from '../src/context/LanguageContext';
import { extractCounterOfferPrice, formatCounterProposalMessage } from '../src/utils/negotiationCounter';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  getProposalsAdmin: vi.fn(),
  getCategories: vi.fn(),
  respondProposal: vi.fn(),
  getProposalsClient: vi.fn(),
  updateProposal: vi.fn(),
  getOrders: vi.fn(),
  getZones: vi.fn(),
}));

vi.mock('react-hot-toast', () => {
  const fn = Object.assign(vi.fn(), {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  });
  return { default: fn };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to?: string; [k: string]: unknown }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}));

vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../src/components/layout/client/ClientNavbar', () => ({
  default: () => <div />,
}));

vi.mock('../src/components/layout/client/ClientBottomNav', () => ({
  default: () => <div />,
}));

vi.mock('../src/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock('../src/hooks/useRefresh', () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));

vi.mock('../src/hooks/useRealtimeNotifications', () => ({
  subscribeRealtimeRefresh: () => () => undefined,
}));

vi.mock('../src/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/api')>();
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getProposals: mocks.getProposalsAdmin,
      getCategories: mocks.getCategories,
      respondProposal: mocks.respondProposal,
    },
    negotiationApi: {
      ...actual.negotiationApi,
      getProposals: mocks.getProposalsClient,
      updateProposal: mocks.updateProposal,
    },
    ordersApi: {
      ...actual.ordersApi,
      getOrders: mocks.getOrders,
    },
    catalogApi: {
      ...actual.catalogApi,
      getZones: mocks.getZones,
    },
  };
});

import AdminValidationsPage from '../src/pages/admin/AdminValidationsPage';
import NegotiationsPage from '../src/pages/client/negociations/NegotiationsPage';

function makeStore() {
  return configureStore({
    reducer: { cart: cartReducer, negotiation: negotiationReducer },
  });
}

describe('contre-proposition admin <-> client', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tokpa_lang', 'fr');
    mocks.navigate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.getProposalsAdmin.mockReset();
    mocks.getCategories.mockReset();
    mocks.respondProposal.mockReset();
    mocks.getProposalsClient.mockReset();
    mocks.updateProposal.mockReset();
    mocks.getOrders.mockReset();
    mocks.getZones.mockReset();
    mocks.getCategories.mockResolvedValue({ data: [] });
    mocks.getOrders.mockResolvedValue({ data: [] });
    mocks.getZones.mockResolvedValue({ data: [] });
  });

  it('formate et extrait le montant dune contre-proposition', () => {
    const formatted = formatCounterProposalMessage(4400, 'Dernier prix');
    expect(formatted).toContain('Contre-proposition :');
    expect(formatted).toContain('FCFA');
    expect(formatted).toContain('Dernier prix');
    expect(extractCounterOfferPrice(formatted)).toBe(4400);
    expect(extractCounterOfferPrice('Refus définitif')).toBeNull();
  });

  it('AdminValidationsPage envoie une contre-proposition via PATCH /admin/budget-proposals/{id}', async () => {
    mocks.getProposalsAdmin.mockResolvedValue({
      data: [
        {
          id: 12,
          client_id: 7,
          product_id: 3,
          prix_propose: 3800,
          quantite: 2,
          statut: 'en_attente',
          created_at: '2026-11-16T10:00:00Z',
          client: { nom_complet: 'Afi Mensah' },
          product: { id: 3, nom: 'Riz parfumé', prix: 5000, prix_minimum: 3500, categorie_id: 1 },
        },
      ],
      last_page: 1,
    });
    mocks.respondProposal.mockResolvedValue({ proposal: { id: 12, statut: 'refuse' } });

    render(
      <Provider store={makeStore()}>
        <LanguageProvider>
          <AdminValidationsPage />
        </LanguageProvider>
      </Provider>,
    );

    const buttons = await screen.findAllByRole('button', { name: /Contre-proposer/i });
    fireEvent.click(buttons[buttons.length - 1]);

    const priceInput = await screen.findByLabelText(/Montant contre-proposé/i);
    fireEvent.change(priceInput, { target: { value: '4400' } });
    fireEvent.change(screen.getByLabelText(/Message au client/i), { target: { value: 'Dernier prix' } });

    fireEvent.click(screen.getByRole('button', { name: /Envoyer la contre-proposition/i }));

    await waitFor(() =>
      expect(mocks.respondProposal).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          decision: 'refuse',
          admin_response: expect.stringContaining('4'),
        }),
      ),
    );
    expect(extractCounterOfferPrice(mocks.respondProposal.mock.calls[0][1].admin_response)).toBe(4400);
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it('NegotiationsPage affiche la contre-proposition et laccepte via PUT /budget-proposals/{id}', async () => {
    mocks.getProposalsClient.mockResolvedValue({
      data: [
        {
          id: 12,
          product_id: 3,
          prix_propose: 3800,
          quantite: 2,
          statut: 'refuse',
          admin_response: formatCounterProposalMessage(4400, 'Dernier prix'),
          created_at: '2026-11-16T10:00:00Z',
          product: { id: 3, nom: 'Riz parfumé', prix: 5000, prix_minimum: 3500 },
        },
      ],
    });
    mocks.updateProposal.mockResolvedValue({ data: { id: 13, prix_propose: 4400, quantite: 2, statut: 'en_attente' } });

    render(
      <Provider store={makeStore()}>
        <LanguageProvider>
          <NegotiationsPage />
        </LanguageProvider>
      </Provider>,
    );

    expect((await screen.findAllByText('Contre-proposition')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Dernier prix/i)).toBeTruthy();

    const acceptBtn = screen.getByRole('button', { name: /Accepter \(4/i });
    fireEvent.click(acceptBtn);

    await waitFor(() =>
      expect(mocks.updateProposal).toHaveBeenCalledWith('12', {
        product_id: 3,
        prix_propose: 4400,
        quantite: 2,
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });
});
