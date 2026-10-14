// @vitest-environment jsdom
/**
 * Modale de détail d'un paiement (page Paiements, client et administration).
 *
 * Vérifie la disposition reprise des autres modales du projet :
 *   en-tête (icône + titre + sous-titre + fermeture), corps en cartes
 *   (bandeau montant/statut, informations de paiement, commande associée),
 *   pied d'actions (reçu à gauche, Fermer + Voir la commande à droite).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';

const listAll = vi.fn();
const getUsers = vi.fn();
const listMine = vi.fn();
const navigate = vi.fn();
const getOrder = vi.fn();

vi.mock('../src/services/api', () => ({
  adminApi: { getUsers: (...a: unknown[]) => getUsers(...a) },
  paymentsApi: {
    listAll: () => listAll(),
    listMine: () => listMine(),
    listOwnAsAdmin: () => listAll(),
  },
  ordersApi: { getOrder: (...a: unknown[]) => getOrder(...a) },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

import PaymentsPanel from '../src/components/payments/PaymentsPanel';

const paiement = {
  id: 16,
  order_id: 31,
  client_id: 20,
  montant: '950.00',
  methode: 'fedapay',
  statut: 'en_attente',
  fedapay_ref: 'DEV-16',
  paid_at: null,
  created_at: '2026-10-14T15:01:46.000000Z',
  order: { id: 31, statut: 'en_preparation' },
};

function monter(source: 'mine' | 'all') {
  return render(
    <LanguageProvider>
      <PaymentsPanel source={source} title="Paiements" />
    </LanguageProvider>,
  );
}

/** Session simulée : la vue administration n'appelle l'annuaire que pour un admin. */
function connecter(role: string, nom: string, id: number) {
  localStorage.setItem('tokpa_token', 'jeton-de-test');
  localStorage.setItem('tokpa_user', JSON.stringify({ id, nom_complet: nom, role }));
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  connecter('admin', 'Alain Admin', 1);
  vi.clearAllMocks();
  listAll.mockResolvedValue({ success: true, data: [paiement] });
  listMine.mockResolvedValue({ success: true, data: [paiement] });
  getUsers.mockResolvedValue({
    data: [
      { id: 20, nom_complet: 'Awa Client', prenom: 'Awa', nom: 'Client', role: 'client' },
      { id: 19, nom_complet: 'Benoît Client', prenom: 'Benoît', nom: 'Client', role: 'client' },
    ],
  });
  getOrder.mockResolvedValue({
    data: {
      id: 31,
      statut: 'en_preparation',
      montant_total: 950,
      frais_livraison: 250,
      description_lieu: 'Près de la pharmacie',
      items: [{ nom: 'Feuilles de gboma (botte)', quantite: 1, prix_unitaire: 700 }],
      landmark: { nom: 'Dantokpa — Marché central' },
      // pas de « client » : le backend ne l'expose pas (vérifié sur l'API réelle).
      livreur: { nom_complet: 'Koffi Livreur', telephone: '+229 97 00 00 02' },
    },
  });
});

async function ouvrirModal(source: 'mine' | 'all' = 'all') {
  monter(source);
  const ligne = await screen.findByText('#16');
  await act(async () => {
    fireEvent.click(ligne);
  });
  const dialog = await screen.findByRole('dialog');
  return dialog;
}

describe('modale de paiement — disposition', () => {
  it('affiche un en-tête avec titre, sous-titre et bouton de fermeture', async () => {
    const dialog = await ouvrirModal('all');
    expect(dialog.textContent).toContain('Paiement');
    expect(dialog.textContent).toContain('#16');
    expect(dialog.textContent).toContain('Détail du paiement et de la commande associée');
    expect(screen.getByLabelText('Fermer le modal')).toBeTruthy();
  });

  it('présente le montant, le statut puis les deux cartes de détail', async () => {
    const dialog = await ouvrirModal('all');
    const texte = dialog.textContent ?? '';
    expect(texte).toContain('950 FCFA');            // montant mis en avant
    expect(texte).toContain('Paiement en attente'); // pastille de statut
    expect(texte).toContain('Informations de paiement');
    expect(texte).toContain('Commande associée');
    expect(texte).toContain('DEV-16');              // référence
    expect(texte).toContain('#31');                 // commande liée
  });

  it('regroupe les actions dans un pied : reçu, Fermer, Voir la commande', async () => {
    const dialog = await ouvrirModal('all');
    const pied = dialog.lastElementChild as HTMLElement;
    expect(pied.textContent).toContain('Télécharger le reçu');
    expect(pied.textContent).toContain('Fermer');
    expect(pied.textContent).toContain('Voir la commande');
    expect(screen.getByTestId('receipt-payment-16-detail')).toBeTruthy();
  });

  it('affiche la ligne « Client » dans les deux vues (disposition identique)', async () => {
    const admin = await ouvrirModal('all');
    expect(admin.textContent).toContain('Client :');
    await waitFor(() => expect(admin.textContent).toContain('Awa Client'));
    document.body.innerHTML = '';

    connecter('client', 'Awa Client', 20);
    const client = await ouvrirModal('mine');
    expect(client.textContent).toContain('Client :');
    expect(client.textContent).toContain('Awa Client');
  });

  it('ouvre la commande liée (liste admin) puis se ferme', async () => {
    await ouvrirModal('all');
    await act(async () => {
      fireEvent.click(screen.getByText('Voir la commande'));
    });
    expect(navigate).toHaveBeenCalledWith({ to: '/admin/commandes' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('ouvre le suivi de la commande côté client', async () => {
    await ouvrirModal('mine');
    await act(async () => {
      fireEvent.click(screen.getByText('Voir la commande'));
    });
    expect(navigate).toHaveBeenCalledWith({
      to: '/commandes/suivi',
      search: { order: '31' },
    });
  });

  it('affiche le nom du client, le livreur et l’adresse de livraison', async () => {
    const dialog = await ouvrirModal('all');

    // Chargés à l'ouverture via GET /orders/{id}
    await waitFor(() => expect(getOrder).toHaveBeenCalledWith(31));
    // Le nom du client vient de /admin/users : GET /orders/{id} ne l'expose pas.
    await waitFor(() => expect(dialog.textContent).toContain('Awa Client'));
    expect(getUsers).toHaveBeenCalled();
    expect(await screen.findByText('Koffi Livreur')).toBeTruthy();
    expect(await screen.findByText('Dantokpa — Marché central — Près de la pharmacie')).toBeTruthy();
    // Téléphone du livreur (fourni par le détail de la commande)
    expect(dialog.textContent).toContain('+229 97 00 00 02');
  });

  it('indique « Chargement… » puis complète les informations', async () => {
    let resoudre: (v: unknown) => void = () => {};
    getOrder.mockImplementationOnce(
      () => new Promise((resolve) => { resoudre = resolve; }),
    );
    const dialog = await ouvrirModal('all');
    expect(dialog.textContent).toContain('Chargement…');
    await act(async () => {
      resoudre({
        data: {
          id: 31,
          statut: 'en_preparation',
          landmark: { nom: 'Calavi — Carrefour' },
          client: { nom_complet: 'Awa Client' },
          livreur: { nom_complet: 'Koffi Livreur' },
        },
      });
    });
    await waitFor(() => expect(dialog.textContent).not.toContain('Chargement…'));
    expect(dialog.textContent).toContain('Calavi — Carrefour');
  });

  it('replie sur l’identifiant quand l’annuaire ne connaît pas le client', async () => {
    getUsers.mockResolvedValueOnce({ data: [] });
    const dialog = await ouvrirModal('all');
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    await waitFor(() => expect(dialog.textContent).not.toContain('Chargement…'));
    expect(dialog.textContent).toContain('#20');
  });

  it('côté clientèle : même disposition, nom de la session, annuaire jamais appelé', async () => {
    connecter('client', 'Awa Client', 20);
    const dialog = await ouvrirModal('mine');
    await waitFor(() => expect(getOrder).toHaveBeenCalledWith(31));
    // Mêmes blocs que la vue administration
    expect(dialog.textContent).toContain('Détail du paiement et de la commande associée');
    expect(dialog.textContent).toContain('Informations de paiement');
    expect(dialog.textContent).toContain('Commande associée');
    expect(dialog.textContent).toContain('Livreur');
    expect(dialog.textContent).toContain('Adresse de livraison');
    expect(dialog.textContent).toContain('Voir la commande');
    // Son propre nom, lu dans la session — et aucun appel à /admin/users
    expect(dialog.textContent).toContain('Awa Client');
    expect(getUsers).not.toHaveBeenCalled();
  });

  it('côté clientèle : n’affiche jamais le nom d’un autre compte', async () => {
    connecter('client', 'Awa Client', 20);
    listMine.mockResolvedValue({ success: true, data: [{ ...paiement, client_id: 19 }] });
    const dialog = await ouvrirModal('mine');
    await waitFor(() => expect(dialog.textContent).not.toContain('Chargement…'));
    expect(dialog.textContent).not.toContain('Awa Client'); // pas son paiement
    expect(dialog.textContent).toContain('#19');            // identifiant neutre
    expect(getUsers).not.toHaveBeenCalled();
  });

  it('n’appelle pas la route admin si l’utilisateur n’est pas administrateur', async () => {
    connecter('client', 'Awa Client', 20);
    monter('all'); // cas limite : vue « tous les paiements » avec un rôle client
    await screen.findByText('#16');
    expect(getUsers).not.toHaveBeenCalled();
  });

  it('affiche le nom du client dans le tableau (vue administration)', async () => {
    monter('all');
    await screen.findByText('#16');
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    expect(await screen.findByText('Awa Client')).toBeTruthy();
  });

  it('reste utilisable si le détail de la commande est refusé', async () => {
    getOrder.mockRejectedValueOnce(new Error('403'));
    const dialog = await ouvrirModal('all');
    await waitFor(() => expect(dialog.textContent).not.toContain('Chargement…'));
    // Le nom du client reste affiché (il vient de l'annuaire, pas de la commande)…
    expect(dialog.textContent).toContain('Awa Client');
    // …et les champs dépendant de la commande affichent un tiret.
    expect(dialog.textContent).toContain('Livreur :—');
    expect(dialog.textContent).toContain('Adresse de livraison :—');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('se ferme au clic sur Fermer', async () => {
    await ouvrirModal('all');
    await act(async () => {
      fireEvent.click(screen.getByText('Fermer'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
