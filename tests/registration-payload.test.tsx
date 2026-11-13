// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { LanguageProvider } from '../src/context/LanguageContext';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  authApi: { register: (...args: unknown[]) => mocks.register(...args) },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import InscriptionPage from '../src/pages/auth/InscriptionPage';

function renderInscription() {
  const root = createRootRoute();
  const inscription = createRoute({
    getParentRoute: () => root,
    path: '/inscription',
    component: InscriptionPage,
  });
  const verification = createRoute({
    getParentRoute: () => root,
    path: '/verification-2fa',
    component: () => <div>Vérification</div>,
  });
  const connexion = createRoute({
    getParentRoute: () => root,
    path: '/connexion',
    component: () => <div>Connexion</div>,
  });
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <div>Accueil</div>,
  });
  const router = createRouter({
    routeTree: root.addChildren([inscription, verification, connexion, home]),
    history: createMemoryHistory({ initialEntries: ['/inscription'] }),
  });
  return render(<LanguageProvider><RouterProvider router={router as never} /></LanguageProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  mocks.register.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  mocks.register.mockResolvedValue({ success: true, message: 'Code 2FA envoyé.' });
});

describe('InscriptionPage API contract', () => {
  it('sends phone, city, quartier and both consent fields with password confirmation', async () => {
    renderInscription();
    await screen.findByRole('heading', { name: 'Créer votre compte' });

    fireEvent.change(screen.getByPlaceholderText('Ex: Jean'), { target: { value: 'Awa' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: Dossou'), { target: { value: 'Kouassi' } });
    fireEvent.change(screen.getByPlaceholderText('jean.dossou@email.com'), { target: { value: 'awa@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('90000000'), { target: { value: '97001122' } });
    fireEvent.change(screen.getByLabelText('Quartier (facultatif)'), { target: { value: 'Cadjehoun' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuer/ }));

    const testPassword = `FrontendTest-${Date.now()}!`;
    const passwords = screen.getAllByPlaceholderText('••••••••••••');
    fireEvent.change(passwords[0], { target: { value: testPassword } });
    fireEvent.change(passwords[1], { target: { value: testPassword } });
    const consentBoxes = screen.getAllByRole('checkbox');
    fireEvent.click(consentBoxes[0]);
    fireEvent.click(consentBoxes[1]); // désinscription SMS : opt_in_sms doit rester false
    fireEvent.click(screen.getByRole('button', { name: /Créer mon compte/ }));

    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
    expect(mocks.register).toHaveBeenCalledWith({
      nom: 'Kouassi',
      prenom: 'Awa',
      email: 'awa@example.test',
      telephone: '+22997001122',
      password: testPassword,
      password_confirmation: testPassword,
      accept_cgu: true,
      opt_in_sms: false,
      ville: 'Cotonou',
      role: 'client',
      quartier: 'Cadjehoun',
    });
    expect(localStorage.getItem('tokpa_pending_email')).toBe('awa@example.test');
  });
});
