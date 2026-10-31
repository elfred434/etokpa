// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));

import { AdminActionDialogHost, adminDialogs } from '../src/components/shared/AdminActionDialogs';

describe('AdminActionDialogHost', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows confirmations in an explicitly sized, scrollable modal', async () => {
    render(<AdminActionDialogHost />);
    let confirmation!: Promise<boolean>;
    act(() => {
      confirmation = adminDialogs.confirm('Supprimer le produit ?', {
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
        danger: true,
      });
    });

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.style.width).toBe('100%');
    expect(dialog.style.maxWidth).toBe('36rem');
    expect(dialog.querySelector('.overflow-y-auto')).not.toBeNull();
    expect(window.tokpaAdminDialogs).toBe(adminDialogs);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await expect(confirmation).resolves.toBe(true);
  });

  it('returns the entered value from a modal prompt', async () => {
    render(<AdminActionDialogHost />);
    let response!: Promise<string | null>;
    act(() => {
      response = adminDialogs.prompt('Indiquez le motif du refus.', '', {
        title: 'Motif du refus',
        confirmLabel: 'Envoyer',
        placeholder: 'Votre motif',
        multiline: true,
      });
    });

    await screen.findByRole('dialog');
    fireEvent.change(screen.getByRole('textbox', { name: 'Votre motif' }), {
      target: { value: 'Document incomplet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await expect(response).resolves.toBe('Document incomplet');
  });
});
