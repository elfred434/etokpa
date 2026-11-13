// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getLandmarks: vi.fn(),
  getZones: vi.fn(),
  createLandmark: vi.fn(),
  deleteLandmark: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  catalogApi: { getZones: (...args: unknown[]) => mocks.getZones(...args) },
  landmarksApi: {
    getLandmarks: (...args: unknown[]) => mocks.getLandmarks(...args),
    createLandmark: (...args: unknown[]) => mocks.createLandmark(...args),
    deleteLandmark: (...args: unknown[]) => mocks.deleteLandmark(...args),
  },
}));
vi.mock('../src/hooks/useRefresh', () => ({ useGlobalRefreshTick: () => 0 }));
vi.mock('../src/components/shared/AdminActionDialogs', () => ({
  adminDialogs: { confirm: (...args: unknown[]) => mocks.confirm(...args) },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import ProfileLandmarks from '../src/components/client/profil/ProfileLandmarks';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLandmarks.mockResolvedValue([
    { id: 3, nom: 'Maison', description: 'Portail bleu', zone_id: 7 },
  ]);
  mocks.getZones.mockResolvedValue({ data: [{ id: 7, nom: 'Cadjehoun' }] });
  mocks.createLandmark.mockResolvedValue({ success: true });
  mocks.deleteLandmark.mockResolvedValue({ success: true });
  mocks.confirm.mockResolvedValue(true);
});

afterEach(() => cleanup());

describe('ProfileLandmarks', () => {
  it('loads saved landmarks from the API and creates one with the selected zone', async () => {
    render(<ProfileLandmarks />);

    expect(await screen.findByText('Maison')).toBeTruthy();
    expect(screen.getByText('Cadjehoun')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un point de repère' }));
    fireEvent.change(screen.getByLabelText('Nom du lieu'), { target: { value: 'Bureau' } });
    fireEvent.change(screen.getByLabelText('Description / précisions'), { target: { value: 'Deuxième étage' } });
    fireEvent.change(screen.getByLabelText('Zone de livraison'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter', exact: true }));

    await waitFor(() => expect(mocks.createLandmark).toHaveBeenCalledWith({
      nom: 'Bureau',
      description: 'Deuxième étage',
      zone_id: 7,
    }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Point de repère ajouté.');
  });

  it('confirms and sends deletion to the API', async () => {
    render(<ProfileLandmarks />);
    await screen.findByText('Maison');
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le repère Maison' }));

    await waitFor(() => expect(mocks.deleteLandmark).toHaveBeenCalledWith('3'));
    expect(mocks.confirm).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Point de repère supprimé.');
  });

  it('does not show fixture landmarks when the server read fails', async () => {
    mocks.getLandmarks.mockRejectedValue(new Error('landmarks route unavailable'));
    render(<ProfileLandmarks />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Carrefour Cadjehoun')).toBeNull();
    expect(screen.queryByText('Bureau TOKPa Hub')).toBeNull();
  });
});
