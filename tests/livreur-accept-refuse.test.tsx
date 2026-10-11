// @vitest-environment jsdom
/**
 * Acceptation et refus d'une course livreur, testés UNIQUEMENT via le frontend :
 * la vraie page /livreur (tableau de bord) est rendue dans un DOM jsdom, avec le
 * vrai composant LivreurDecisionButtons, le vrai routeur et le vrai client API.
 * Seul le transport HTTP (apiClient) est simulé : chaque clic passe par l'UI.
 */
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useSearch,
} from '@tanstack/react-router';

vi.mock('../src/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../src/services/realtime/echo', () => ({ initEcho: vi.fn(), shutdownEcho: vi.fn() }));
vi.mock('../src/components/layout/livreur/LivreurLayout', () => ({
  default: (props: { children?: ReactNode }) => createElement('div', { 'data-testid': 'livreur-layout' }, props.children),
}));

import { apiClient } from '../src/services/api/client';
import { LanguageProvider } from '../src/context/LanguageContext';
import LivreurDashboardPage from '../src/pages/livreur/dashboard/LivreurDashboardPage';
import toast from 'react-hot-toast';

const get = vi.mocked(apiClient.get);
const patch = vi.mocked(apiClient.patch);

const order = (id: number, statut = 'en_preparation') => ({
  id,
  montant_total: 4520,
  frais_livraison: 500,
  statut,
  description_lieu: 'Devant le marché',
  created_at: '2026-10-07T09:12:00.000Z',
  items: [{ id: 1, product_id: 7, nom: 'Tomates', quantite: 2, prix_unitaire: 2010 }],
  landmark: { id: 3, nom: 'Wologuèdè', zone_id: 1 },
});

function mockHttp() {
  get.mockImplementation((url: string) => {
    if (url.includes('/livreur/deliveries')) {
      return Promise.resolve({ data: { success: true, data: [order(33), order(34)] } });
    }
    if (url.includes('/livreur/history')) {
      return Promise.resolve({ data: { success: true, data: [], meta: { total: 0, last_page: 1 } } });
    }
    if (url.includes('/dashboard')) {
      return Promise.resolve({ data: { commandes: 2, en_cours: 2, ca: 9040 } });
    }
    if (url.includes('/profile')) {
      return Promise.resolve({ data: { success: true, data: { nom_complet: 'Livreur Test', zone: 'Akpakpa', disponible: true } } });
    }
    return Promise.resolve({ data: { success: true, data: [] } });
  });
  patch.mockImplementation((url: string) => {
    if (url.endsWith('/accept')) {
      return Promise.resolve({ data: { success: true, message: 'Course acceptée.', data: { id: 33, statut: 'en_preparation' } } });
    }
    return Promise.resolve({ data: { success: true, message: 'Course refusée, remise en file.' } });
  });
}

function renderDashboard() {
  const rootRoute = createRootRoute();
  const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/livreur', component: LivreurDashboardPage });
  const courseRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/livreur/course',
    validateSearch: (search: Record<string, unknown>) => ({ commande: Number(search.commande ?? 0) }),
    component: () => {
      const search = useSearch({ from: '/livreur/course' });
      return createElement('div', null, `COURSE ${search.commande}`);
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute, courseRoute]),
    history: createMemoryHistory({ initialEntries: ['/livreur'] }),
  });
  return render(
    createElement(LanguageProvider, null, createElement(RouterProvider, { router })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('tokpa_token', 'jeton-test');
  localStorage.setItem('tokpa_user', JSON.stringify({ nom_complet: 'Livreur Test', role: 'livreur' }));
  mockHttp();
});

describe('course livreur : acceptation et refus via le frontend', () => {
  it('affiche les courses proposées par l\'API avant toute décision', async () => {
    renderDashboard();
    expect(await screen.findByText(/#TOK-33/)).toBeTruthy();
    expect(screen.getByText(/#TOK-34/)).toBeTruthy();
    expect(get.mock.calls.some(([url]) => String(url).includes('/livreur/deliveries'))).toBe(true);
  });

  it('accepter une course appelle PATCH /livreur/deliveries/{id}/accept puis ouvre la course', async () => {
    const success = vi.spyOn(toast, 'success');
    renderDashboard();
    await screen.findByText(/#TOK-33/);

    const acceptButtons = screen.getAllByRole('button', { name: 'Accepter' });
    fireEvent.click(acceptButtons[0]);

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/livreur/deliveries/33/accept'));
    await waitFor(() => expect(success).toHaveBeenCalled());
    // Le frontend enchaîne sur l'écran de course active avec la commande acceptée.
    expect(await screen.findByText('COURSE 33')).toBeTruthy();
  });

  it('refuser passe par la modale de confirmation, appelle PATCH …/refuse et retire la course de la liste', async () => {
    const success = vi.spyOn(toast, 'success');
    renderDashboard();
    await screen.findByText(/#TOK-33/);

    fireEvent.click(screen.getByRole('button', { name: /Refuser la course #TOK-34/ }));
    expect(screen.getByText('Refuser cette course ?')).toBeTruthy();
    expect(patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/livreur/deliveries/34/refuse'));
    await waitFor(() => expect(success).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/#TOK-34/)).toBeNull());
    expect(screen.getByText(/#TOK-33/)).toBeTruthy();
  });

  it('annuler la modale de refus n\'appelle aucun endpoint et garde la course', async () => {
    renderDashboard();
    await screen.findByText(/#TOK-33/);

    fireEvent.click(screen.getByRole('button', { name: /Refuser la course #TOK-33/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByText('Refuser cette course ?')).toBeNull());
    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText(/#TOK-33/)).toBeTruthy();
  });

  it('un refus du backend (erreur API) est signalé sans retirer la course ni naviguer', async () => {
    const error = vi.spyOn(toast, 'error');
    patch.mockRejectedValue({ response: { status: 409, data: { message: 'Transition interdite.' } } });
    renderDashboard();
    await screen.findByText(/#TOK-33/);

    fireEvent.click(screen.getAllByRole('button', { name: 'Accepter' })[0]);

    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(screen.queryByText('COURSE 33')).toBeNull();
    expect(screen.getByText(/#TOK-33/)).toBeTruthy();
  });
});
