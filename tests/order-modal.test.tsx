// @vitest-environment jsdom
/**
 * Modales de détail d'une commande — même gabarit que la modale de paiement.
 *
 * Deux modales affichent le détail d'une commande : celle de l'administration et
 * du manager (`PlatformOrdersPanel`) et celle du client (`OrdersListPage`). Elles
 * partagent désormais les primitives `ModalShell` (+ `BandeauFiche`, `FicheCard`,
 * `LigneFiche`, `BoutonFermer`, `BoutonPrincipal`), extraites de la modale de
 * paiement qui sert de référence :
 *
 *   en-tête : icône + titre + sous-titre + fermer rond ;
 *   corps   : bandeau #id / date / montant / statut, puis cartes de section ;
 *   pied    : actions (Fermer + action principale).
 *
 * Ces tests verrouillent la disposition des deux modales et la présence de
 * toutes les informations (articles, livraison, paiement, livreur).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { Provider } from 'react-redux';

vi.mock('../src/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../src/services/realtime/echo', () => ({ initEcho: vi.fn(), shutdownEcho: vi.fn() }));
vi.mock('../src/components/layout/client/ClientNavbar', () => ({
  default: () => createElement('div', { 'data-testid': 'client-navbar' }),
}));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({
  default: () => createElement('div', { 'data-testid': 'client-bottom-nav' }),
}));

const getOrders = vi.fn();
const getZones = vi.fn();
const annulerCommande = vi.fn();
vi.mock('../src/services/api', () => ({
  adminApi: { getOrders: (...a: unknown[]) => getOrders(...a) },
  managerApi: { getOrders: (...a: unknown[]) => getOrders(...a) },
  catalogApi: { getZones: (...a: unknown[]) => getZones(...a) },
  // La page cliente interroge GET /orders via ordersApi ; sans ces stubs, l'appel
  // échouerait et la liste resterait vide (l'erreur est capturée par la page).
  ordersApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getOrder: (...a: unknown[]) => getOrders(...a),
    cancelOrder: (...a: unknown[]) => annulerCommande(...a),
  },
  paymentsApi: { initiatePayment: vi.fn(), getPayment: vi.fn() },
}));

import { apiClient } from '../src/services/api/client';
import { LanguageProvider } from '../src/context/LanguageContext';
import { store } from '../src/store';
import { ModalShell, FicheCard, LigneFiche } from '../src/components/shared/ModalShell';
import PlatformOrdersPanel from '../src/components/orders/PlatformOrdersPanel';
import OrdersListPage from '../src/pages/client/commandes/OrdersListPage';

const get = vi.mocked(apiClient.get);

const commande = {
  id: 31,
  statut: 'en_livraison',
  montant_total: 4200,
  frais_livraison: 700,
  description_lieu: 'Près de la pharmacie',
  created_at: '2026-10-14T09:30:00.000Z',
  items: [
    { id: 1, nom: 'Riz parfumé 5 kg', quantite: 1, prix_unitaire: 3500 },
    { id: 2, nom: 'Tomates fraîches', quantite: 1, prix_unitaire: 0 },
  ],
  landmark: { id: 4, nom: 'Marché Dantokpa', zone_id: 2 },
  livreur: { id: 9, nom_complet: 'Bio Sounon', telephone: '22961000003' },
  client: { nom_complet: 'Amenan Dossou', telephone: '22961000004' },
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  localStorage.setItem('tokpa_token', 'jeton-de-test');
  vi.clearAllMocks();
  getOrders.mockResolvedValue({ data: [commande], meta: { last_page: 1, total: 1 } });
  getZones.mockResolvedValue({ data: [{ id: 2, nom: 'Cadjehoun' }] });
  get.mockResolvedValue({ data: [commande], meta: { last_page: 1, total: 1 } } as never);
});

function avecProviders(ui: React.ReactElement) {
  return (
    <Provider store={store}>
      <LanguageProvider>{ui}</LanguageProvider>
    </Provider>
  );
}

describe('ModalShell — gabarit commun des modales de détail', () => {
  it('affiche en-tête (icône, titre, sous-titre, fermer rond), corps et pied', () => {
    const onFermer = vi.fn();
    render(
      avecProviders(
        <ModalShell
          icone="receipt_long"
          titre="Commande #31"
          sousTitre="Détail de la commande"
          onFermer={onFermer}
          pied={<button type="button">Fermer</button>}
        >
          <FicheCard icone="person" titre="Client">
            <LigneFiche icone="badge" etiquette="Nom">
              Amenan Dossou
            </LigneFiche>
          </FicheCard>
        </ModalShell>,
      ),
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Commande #31')).toBeTruthy();
    expect(screen.getByText('Détail de la commande')).toBeTruthy();
    expect(screen.getByText('receipt_long')).toBeTruthy(); // icône (police locale)
    expect(screen.getByText('Client')).toBeTruthy();
    expect(screen.getByText(/Nom/)).toBeTruthy();
    expect(screen.getByText('Amenan Dossou')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Fermer le modal'));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });

  it('ferme au clic sur le voile, mais pas au clic dans le panneau', () => {
    const onFermer = vi.fn();
    render(
      avecProviders(
        <ModalShell icone="receipt_long" titre="Commande #31" onFermer={onFermer}>
          <span>corps</span>
        </ModalShell>,
      ),
    );
    fireEvent.click(screen.getByText('corps'));
    expect(onFermer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });
});

describe('Modale de commande — administration et manager', () => {
  async function ouvrir() {
    render(avecProviders(<PlatformOrdersPanel source="admin" title="Commandes" />));
    const ligne = await screen.findByText('#31');
    fireEvent.click(ligne);
    return screen.getByRole('dialog');
  }

  it('reprend le gabarit : titre, sous-titre daté, bandeau, cartes, pied', async () => {
    const modale = within(await ouvrir());
    expect(modale.getByText('Commande #31')).toBeTruthy();
    expect(modale.getByText(/Détail de la commande/)).toBeTruthy();

    // bandeau : montant en grand + statut en pastille
    expect(modale.getAllByText('4 200 FCFA').length).toBeGreaterThan(0);
    expect(modale.getByText('En livraison')).toBeTruthy();

    // les trois cartes du détail
    for (const titre of ['Client', 'Livraison', 'Articles']) {
      expect(modale.getByText(titre), `carte « ${titre} »`).toBeTruthy();
    }
    expect(modale.getByText(/Livreur/)).toBeTruthy();
    expect(modale.getByText('Cadjehoun')).toBeTruthy(); // zone résolue par identifiant
    expect(modale.getByText('Fermer')).toBeTruthy();
  });

  it('liste les articles avec leur montant et le total de la commande', async () => {
    const modale = within(await ouvrir());
    expect(modale.getByText(/Riz parfumé 5 kg/)).toBeTruthy();
    expect(modale.getByText('3 500 FCFA')).toBeTruthy();
    expect(modale.getByText('Total')).toBeTruthy();
  });

  it('place l’action fournie (Assigner) dans le pied de modale', async () => {
    render(
      avecProviders(
        <PlatformOrdersPanel
          source="zone"
          title="Commandes de votre zone"
          renderActions={() => <button type="button">Assigner</button>}
        />,
      ),
    );
    fireEvent.click(await screen.findByText('#31'));
    expect(within(await screen.findByRole('dialog')).getByText('Assigner')).toBeTruthy();
  });
});

describe('Modale de commande — client', () => {
  async function ouvrir() {
    const racine = createRootRoute();
    const liste = createRoute({
      getParentRoute: () => racine,
      path: '/commandes',
      validateSearch: (search: Record<string, unknown>) => search,
      component: () => avecProviders(<OrdersListPage />),
    });
    const router = createRouter({
      routeTree: racine.addChildren([liste]),
      history: createMemoryHistory({ initialEntries: ['/commandes'] }),
    });
    render(<RouterProvider router={router as never} />);
    const ligne = await screen.findByText('#31');
    fireEvent.click(ligne);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    return screen.getByRole('dialog');
  }

  it('affiche le détail avec les mêmes cartes et le total', async () => {
    const modale = within(await ouvrir());
    expect(modale.getByText('Commande #31')).toBeTruthy();
    for (const titre of ['Articles', 'Livraison', 'Paiement']) {
      expect(modale.getByText(titre), `carte « ${titre} »`).toBeTruthy();
    }
    expect(modale.getByText('Sous-total produits')).toBeTruthy();
    expect(modale.getByText(/Frais de livraison/)).toBeTruthy();
    expect(modale.getByText('Total')).toBeTruthy();
  });

  it('montre le repère, le livreur joignable et l’état du paiement', async () => {
    const modale = within(await ouvrir());
    expect(modale.getByText('Marché Dantokpa')).toBeTruthy();
    expect(modale.getByText('Bio Sounon')).toBeTruthy();
    expect(modale.getByText('22961000003').closest('a')?.getAttribute('href')).toBe('tel:22961000003');
    expect(modale.getAllByText('Paiement non initialisé').length).toBeGreaterThan(0);
  });

  it('garde les actions du client dans le pied (Payer, Suivre, Fermer)', async () => {
    const modale = within(await ouvrir());
    expect(modale.getByText('Payer')).toBeTruthy();
    expect(modale.getByText('Suivre cette commande')).toBeTruthy();
    expect(modale.getByText('Fermer')).toBeTruthy();
  });
});
