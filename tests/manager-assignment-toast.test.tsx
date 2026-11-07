// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import ManagerOrdersPage from '../src/pages/manager/ManagerOrdersPage';

const mocks = vi.hoisted(() => ({
  getLivreurs: vi.fn(),
  assignLivreur: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  managerApi: {
    getLivreurs: mocks.getLivreurs,
    assignLivreur: mocks.assignLivreur,
  },
}));

vi.mock('../src/hooks/useRefresh', () => ({ useGlobalRefreshTick: () => 0 }));

vi.mock('../src/components/layout/manager/ManagerLayout', async () => {
  const ReactModule = await import('react');
  return {
    default: ({ children }: { children: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children),
  };
});

vi.mock('../src/components/orders/PlatformOrdersPanel', async () => {
  const ReactModule = await import('react');
  return {
    default: ({ renderActions }: { renderActions?: (order: any) => React.ReactNode }) => ReactModule.createElement(
      'div',
      { 'data-testid': 'platform-orders' },
      renderActions?.({ id: 2, landmark: { zone_id: 7 }, statut: 'en_attente', livreur: null }),
    ),
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  mocks.getLivreurs.mockReset();
  mocks.assignLivreur.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  mocks.getLivreurs.mockResolvedValue({ data: [{ id: 11, nom_complet: 'Livreur Test', profil: { zone_id: 7, disponibilite: true } }] });
  mocks.assignLivreur.mockResolvedValue({ data: { id: 2, livreur_id: 11 } });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('ManagerOrdersPage assignment feedback', () => {
  it('shows assignment success as a toast instead of an inline banner', async () => {
    render(<LanguageProvider><ManagerOrdersPage /></LanguageProvider>);

    fireEvent.click(await screen.findByRole('button', { name: 'Assigner' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Livreur Test/ }));
    const assignButtons = screen.getAllByRole('button', { name: 'Assigner' });
    fireEvent.click(assignButtons[assignButtons.length - 1]);

    await waitFor(() => {
      expect(mocks.assignLivreur).toHaveBeenCalledWith(2, 11);
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Commande #2 assignée avec succès.');
    });
    expect(screen.queryByText('Commande #2 assignée avec succès.')).toBeNull();
    expect(document.querySelector('.bg-success-container')).toBeNull();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
