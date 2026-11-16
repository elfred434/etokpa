// @vitest-environment jsdom
/**
 * Vérifie que les modales des espaces manager, livreur et clientèle utilisent
 * le gabarit unifié `DialogFrame` (identique à `AdminActionDialogHost`) :
 * en-tête `bg-surface-container-low` avec icône, corps défilant, pied `bg-bg-secondary`,
 * fermeture via Escape / voile / bouton Fermer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { LanguageProvider } from '../src/context/LanguageContext';
import { DialogFrame, DIALOG_CANCEL_BTN_CLASS, DIALOG_PRIMARY_BTN_CLASS } from '../src/components/shared/DialogFrame';
import NegotiationModal from '../src/components/client/negotiation/NegotiationModal';
import { store } from '../src/store';

afterEach(() => cleanup());

describe('DialogFrame — gabarit unifié des modales (client, livreur, manager)', () => {
  it('rend en-tête (icône, titre, sous-titre, fermer), corps et pied comme AdminActionDialogHost', () => {
    const onClose = vi.fn();
    render(
      <LanguageProvider>
        <DialogFrame
          icon="two_wheeler"
          title="Assigner un livreur"
          subtitle="Zone : Cadjèhoun"
          onClose={onClose}
          footer={
            <>
              <button type="button" className={DIALOG_CANCEL_BTN_CLASS} onClick={onClose}>
                Annuler
              </button>
              <button type="button" className={DIALOG_PRIMARY_BTN_CLASS}>
                Assigner
              </button>
            </>
          }
        >
          <p>Contenu de test</p>
        </DialogFrame>
      </LanguageProvider>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('header')?.className).toContain('bg-surface-container-low');
    expect(dialog.querySelector('footer')?.className).toContain('bg-bg-secondary');
    expect(screen.getByText('Assigner un livreur')).toBeTruthy();
    expect(screen.getByText('Zone : Cadjèhoun')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Fermer'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('NegotiationModal (client) utilise le gabarit unifié DialogFrame', () => {
    const onClose = vi.fn();
    render(
      <Provider store={store}>
        <LanguageProvider>
          <NegotiationModal isOpen onClose={onClose} />
        </LanguageProvider>
      </Provider>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('header')?.className).toContain('bg-surface-container-low');
    expect(dialog.querySelector('footer')?.className).toContain('bg-bg-secondary');
    fireEvent.click(screen.getAllByRole('button', { name: 'Fermer' })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toutes les modales d’action des espaces client, livreur et manager importent DialogFrame', () => {
    const files = [
      'src/components/shared/AdminActionDialogs.tsx',
      'src/components/shared/MobileTableBridge.tsx',
      'src/components/layout/manager/ManagerLayout.tsx',
      'src/pages/manager/ManagerOrdersPage.tsx',
      'src/pages/manager/ManagerEquipePage.tsx',
      'src/pages/livreur/LivreurDecisionButtons.tsx',
      'src/pages/livreur/historique-livraisons/LivreurHistoryPage.tsx',
      'src/pages/client/profil/ProfilePage.tsx',
      'src/components/client/profil/ProfileLandmarks.tsx',
      'src/components/client/profil/ProfileHeader.tsx',
      'src/components/client/profil/ProfileSettings.tsx',
      'src/pages/client/negociations/NegotiationsPage.tsx',
      'src/components/client/negotiation/NegotiationModal.tsx',
      'src/pages/client/mes-packs/MesPacksPage.tsx',
    ];
    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      expect(content, `${rel} doit utiliser DialogFrame`).toContain('DialogFrame');
    }
  });
});
