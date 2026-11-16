// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import TableRowActions from '../src/components/shared/TableRowActions';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
});

describe('TableRowActions — colonne Actions des tableaux', () => {
  it('affiche directement les boutons côte à côte quand il y en a 2 ou moins', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <LanguageProvider>
        <table>
          <tbody>
            <tr>
              <td>
                <TableRowActions>
                  <button type="button" onClick={onEdit}>Modifier</button>
                  <button type="button" onClick={onDelete}>Supprimer</button>
                </TableRowActions>
              </td>
            </tr>
          </tbody>
        </table>
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'Modifier' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: "Plus d'actions" })).toBeNull();
  });

  it("regroupe les actions excédentaires dans un menu « Plus d'actions » au-delà de 2 boutons", () => {
    const onRow = vi.fn();
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    const onThird = vi.fn();

    render(
      <LanguageProvider>
        <table>
          <tbody>
            <tr onClick={onRow}>
              <td>
                <TableRowActions>
                  <button type="button" onClick={onFirst}>Détail</button>
                  <button type="button" onClick={onSecond}>Démarrer la préparation</button>
                  <button type="button" className="text-error" onClick={onThird}>Annuler la commande</button>
                </TableRowActions>
              </td>
            </tr>
          </tbody>
        </table>
      </LanguageProvider>,
    );

    // Dans la cellule, au plus 2 boutons visibles : l'action principale + « Plus d'actions »
    const row = screen.getByRole('row');
    expect(within(row).getAllByRole('button')).toHaveLength(2);
    expect(within(row).getByRole('button', { name: 'Détail' })).toBeTruthy();
    const moreBtn = within(row).getByRole('button', { name: "Plus d'actions" });
    expect(within(row).queryByRole('button', { name: 'Démarrer la préparation' })).toBeNull();

    // Ouverture du menu sans déclencher le clic sur la ligne <tr>
    act(() => {
      fireEvent.click(moreBtn);
    });
    expect(onRow).not.toHaveBeenCalled();

    const menu = screen.getByRole('menu');
    const prepareItem = within(menu).getByRole('menuitem', { name: 'Démarrer la préparation' });
    const cancelItem = within(menu).getByRole('menuitem', { name: 'Annuler la commande' });
    expect(prepareItem).toBeTruthy();
    expect(cancelItem.className).toContain('text-error');

    act(() => {
      fireEvent.click(prepareItem);
    });
    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('extrait le libellé depuis title pour les boutons icône-seule', () => {
    const onPromote = vi.fn();
    render(
      <LanguageProvider>
        <TableRowActions>
          <button type="button" title="Modifier"><i className="ti ti-edit" /></button>
          <button type="button" title="Suspendre"><i className="ti ti-lock" /></button>
          <button type="button" title="Promouvoir en manager" onClick={onPromote}>
            <i className="ti ti-shield-check" />
          </button>
        </TableRowActions>
      </LanguageProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
    });
    const menu = screen.getByRole('menu');
    const promoteItem = within(menu).getByRole('menuitem', { name: 'Promouvoir en manager' });
    act(() => {
      fireEvent.click(promoteItem);
    });
    expect(onPromote).toHaveBeenCalledTimes(1);
  });
});
