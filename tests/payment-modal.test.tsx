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
const listMine = vi.fn();
const navigate = vi.fn();
const getOrder = vi.fn();

vi.mock('../src/services/api', () => ({
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

beforeEach(() => {
  localStorage.setItem('tokpa_lang', 'fr');
  vi.clearAllMocks();
  listAll.mockResolvedValue({ success: true, data: [paiement] });
  listMine.mockResolvedValue({ success: true, data: [paiement] });
  getOrder.mockResolvedValue({
    data: {
      id: 31,
      statut: 'en_preparation',
      montant_total: 950,
      frais_livraison: 250,
      description_lieu: 'Près de la pharmacie',
      items: [{ nom: 'Feuilles de gboma (botte)', quantite: 1, prix_unitaire: 700 }],
      landmark: { nom: 'Dantokpa — Marché central' },
      client: { nom_complet: 'Awa Client', telephone: '+229 97 00 00 01' },
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

  it('affiche le client uniquement dans la vue administration', async () => {
    const admin = await ouvrirModal('all');
    expect(admin.textContent).toContain('Client');
    document.body.innerHTML = '';
    const client = await ouvrirModal('mine');
    expect(client.textContent).not.toContain('Client :');
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
    expect(await screen.findByText('Awa Client')).toBeTruthy();
    expect(await screen.findByText('Koffi Livreur')).toBeTruthy();
    expect(await screen.findByText('Dantokpa — Marché central — Près de la pharmacie')).toBeTruthy();
    // Téléphones affichés en complément
    expect(dialog.textContent).toContain('+229 97 00 00 01');
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

  it('reste utilisable si le détail de la commande est refusé (repli sur #id)', async () => {
    getOrder.mockRejectedValueOnce(new Error('403'));
    const dialog = await ouvrirModal('all');
    await waitFor(() => expect(dialog.textContent).not.toContain('Chargement…'));
    expect(dialog.textContent).toContain('#20');   // identifiant du client
    expect(dialog.textContent).toContain('Livreur');
    expect(dialog.textContent).toContain('Adresse de livraison');
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
