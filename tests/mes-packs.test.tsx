// @vitest-environment jsdom
/**
 * « Mes packs » (client, route /mes-packs) — atelier de création inspiré de
 * l'admin (/admin/packs), testé via le frontend avec l'API mockée :
 *
 *  1. galerie : CTA « Composer un pack » + état vide ;
 *  2. atelier : un clic sur un produit du rayon l'ajoute à la page (qte 1) ;
 *  3. prix total = somme automatique produits × quantités (jamais saisi) ;
 *  4. validation : nom obligatoire → erreur en ligne, AUCUN appel réseau ;
 *  5. contrat backend : POST /bundles avec le payload exact de
 *     BundleController@store (nom, description, prix_totale, disponible,
 *     user_id, products[{id, qte}]) ;
 *  6. repli sur toute erreur serveur simulée : le pack reste conservé sur
 *     l'appareil (localStorage), badge « Brouillon », message clair, zéro perte ;
 *  7. succès 201 : badge « Publié » + toast ;
 *  8. panier : « Ajouter au panier » décompose le pack en produits (le panier
 *     ne connaît que des produits — même règle que la fiche /pack/$packId).
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';

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

import { apiClient } from '../src/services/api/client';
import { LanguageProvider } from '../src/context/LanguageContext';
import { store } from '../src/store';
import { clear as clearCart } from '../src/store/slices/cart/cartSlice';
import { listPackDrafts, savePackDraft } from '../src/utils/packDrafts';
import MesPacksPage from '../src/pages/client/mes-packs/MesPacksPage';

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

/** Erreur axios-like telle que la produit le transport HTTP (statut + message). */
function httpError(status: number, message: string) {
  return { isAxiosError: true, response: { status, data: { message } } };
}

const TOMATE = { id: 1, nom: 'Tomate', prix: 600, stock: 50, disponible: true, image_url: null, description: null, categorie: { id: 2, nom: 'Légumes' } };
const PIMENT = { id: 2, nom: 'Piment', prix: 300, stock: 20, disponible: true, image_url: null, description: null, categorie: { id: 2, nom: 'Légumes' } };

/** GET publics (produits paginés + bundles) ; POST par défaut simule une
 *  erreur serveur pour vérifier la conservation du brouillon local. */
function mockHttp(opts: { bundles?: unknown[]; postImpl?: () => Promise<unknown> } = {}) {
  get.mockImplementation((url: string) => {
    if (String(url).includes('/products')) {
      return Promise.resolve({ data: { data: [TOMATE, PIMENT], meta: { last_page: 1 } } });
    }
    if (String(url).includes('/bundles')) {
      return Promise.resolve({ data: { data: opts.bundles ?? [] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  post.mockImplementation(() =>
    opts.postImpl
      ? opts.postImpl()
      : Promise.reject(
          httpError(500, 'Erreur serveur simulée'),
        ),
  );
}

function renderMesPacks() {
  const rootRoute = createRootRoute();
  const accueilRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => createElement('div', null, 'ACCUEIL') });
  const catalogueRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/catalogue',
    validateSearch: (search: Record<string, unknown>) => ({ cat: typeof search.cat === 'string' ? search.cat : undefined }),
    component: () => createElement('div', null, 'CATALOGUE'),
  });
  const fichePackRoute = createRoute({ getParentRoute: () => rootRoute, path: '/pack/$packId', component: () => createElement('div', null, 'FICHE PACK') });
  const mesPacksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mes-packs', component: MesPacksPage });
  const router = createRouter({
    routeTree: rootRoute.addChildren([accueilRoute, catalogueRoute, fichePackRoute, mesPacksRoute]),
    history: createMemoryHistory({ initialEntries: ['/mes-packs'] }),
  });
  return render(
    createElement(
      Provider,
      { store },
      createElement(LanguageProvider, null, createElement(RouterProvider, { router })),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  store.dispatch(clearCart());
  localStorage.setItem('tokpa_token', 'jeton-test');
  // id 5 → user_id du payload (BundleController@store attend le propriétaire).
  localStorage.setItem('tokpa_user', JSON.stringify({ id: 5, nom_complet: 'Client Test', role: 'client' }));
  mockHttp();
});

/** Ouvre l'atelier et attend le rayon produits (GET /products public). */
async function ouvrirAtelier() {
  const cta = await screen.findAllByRole('button', { name: 'Composer un pack' });
  fireEvent.click(cta[0]);
  await screen.findByText('Rayon produits');
  await screen.findAllByText('Tomate');
}

describe('Mes packs (client) — atelier de création', () => {
  it('galerie : CTA « Composer un pack » et état vide avant toute création', async () => {
    renderMesPacks();
    expect(await screen.findByText("Aucun pack créé pour l'instant.")).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Composer un pack' }).length).toBeGreaterThan(0);
    // Le rayon vient de l'API PUBLIQUE, jamais de l'API admin.
    expect(get.mock.calls.some(([url]) => String(url).includes('/products'))).toBe(true);
    expect(get.mock.calls.every(([url]) => !String(url).includes('/admin/'))).toBe(true);
  });

  it('atelier : cliquer un produit du rayon l\'ajoute à la page avec la quantité 1', async () => {
    renderMesPacks();
    await ouvrirAtelier();

    const ligneTomate = screen.getAllByText('Tomate')[0];
    fireEvent.click(ligneTomate);

    // Carte posée (grille mobile + page blanche) et prix total recalculé.
    await waitFor(() => expect(screen.getAllByText('Tomate').length).toBeGreaterThan(1));
    expect(screen.getByDisplayValue('600')).toBeTruthy();
  });

  it('prix total = somme automatique des produits × quantités (jamais saisi)', async () => {
    renderMesPacks();
    await ouvrirAtelier();
    fireEvent.click(screen.getAllByText('Tomate')[0]);
    await screen.findByDisplayValue('600');

    // Quantité +1 sur Tomate (600 × 2) puis Piment (+300) → 1500.
    const plus = screen.getAllByLabelText('Quantité +');
    fireEvent.click(plus[0]);
    await screen.findByDisplayValue('1200');
    fireEvent.click(screen.getAllByText('Piment')[0]);
    await screen.findByDisplayValue('1500');

    // Le champ prix total est en lecture seule (calcul automatique).
    const prixTotal = screen.getByDisplayValue('1500');
    expect(prixTotal.getAttribute('readonly')).not.toBeNull();
  });

  it('validation : sans nom, erreur en ligne et AUCUN appel réseau', async () => {
    renderMesPacks();
    await ouvrirAtelier();
    fireEvent.click(screen.getAllByText('Tomate')[0]);
    await screen.findByDisplayValue('600');

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pack' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Le nom du pack est obligatoire.');
    expect(post).not.toHaveBeenCalled();
  });

  it('contrat backend : POST /bundles avec le payload exact ; erreur serveur → brouillon local sans perte', async () => {
    const success = vi.spyOn(toast, 'success');
    renderMesPacks();
    await ouvrirAtelier();
    fireEvent.click(screen.getAllByText('Tomate')[0]);
    await screen.findByDisplayValue('600');
    fireEvent.click(screen.getAllByText('Piment')[0]);
    await screen.findByDisplayValue('900');
    fireEvent.change(screen.getByPlaceholderText('Nom du pack — obligatoire'), { target: { value: 'Mon pack' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pack' }));

    // Payload conforme au contrat BundleController@store actuel : products[].qte.
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toBe('/bundles');
    expect(post.mock.calls[0][1]).toEqual({
      nom: 'Mon pack',
      description: null,
      prix_totale: 900,
      disponible: true,
      user_id: 5,
      products: [
        { id: 1, qte: 1 },
        { id: 2, qte: 1 },
      ],
    });

    // L'erreur serveur simulée → retour galerie, pack conservé sur l'appareil
    // avec son prix minimum et sa photo (champs locaux).
    expect(await screen.findByText('Brouillon — enregistré sur cet appareil')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      "Le serveur n'a pas pu enregistrer ce pack",
    );
    expect(success).toHaveBeenCalledWith('Pack enregistré sur cet appareil.');
    const drafts = listPackDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].nom).toBe('Mon pack');
    expect(drafts[0].serverId).toBeNull();
    expect(drafts[0].produits.map((p) => [p.id, p.qte])).toEqual([[1, 1], [2, 1]]);
  });

  it('succès 201 : le pack passe « Publié » avec son id serveur', async () => {
    mockHttp({
      bundles: [{ id: 9, nom: 'Mon pack', prix_total: 900, disponible: true, products: [] }],
      postImpl: () => Promise.resolve({ data: { data: { id: 9 } } }),
    });
    const success = vi.spyOn(toast, 'success');
    renderMesPacks();
    await ouvrirAtelier();
    fireEvent.click(screen.getAllByText('Tomate')[0]);
    await screen.findByDisplayValue('600');
    fireEvent.change(screen.getByPlaceholderText('Nom du pack — obligatoire'), { target: { value: 'Mon pack' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pack' }));

    expect(await screen.findByText('Publié')).toBeTruthy();
    expect(success).toHaveBeenCalledWith('Pack enregistré.');
    expect(listPackDrafts()[0].serverId).toBe(9);
    // Le pack accepté est public (GET /bundles) → lien vers sa fiche.
    expect(screen.getByRole('link', { name: 'Voir la fiche' })).toBeTruthy();
  });

  it('panier : « Ajouter au panier » décompose le pack en produits avec leurs quantités', async () => {
    savePackDraft({
      localId: 'd-test',
      serverId: null,
      nom: 'Pack Fête',
      description: null,
      prix_total: 1500,
      prix_minimum: null,
      img_url: null,
      disponible: true,
      produits: [
        { id: 1, qte: 2, nom: 'Tomate', prix: 600, description: null, image_url: null, stock: 50, disponible: true },
        { id: 2, qte: 1, nom: 'Piment', prix: 300, description: null, image_url: null, stock: 20, disponible: true },
      ],
      createdAt: new Date().toISOString(),
      syncedAt: null,
    });
    renderMesPacks();

    fireEvent.click(await screen.findByRole('button', { name: /Ajouter au panier/ }));

    const items = store.getState().cart.items;
    expect(items).toHaveLength(2);
    expect(items[0].product.id).toBe('1');
    expect(items[0].quantite).toBe(2);
    expect(items[1].product.id).toBe('2');
    expect(items[1].quantite).toBe(1);
  });
});
