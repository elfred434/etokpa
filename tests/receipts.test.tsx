// @vitest-environment jsdom
/**
 * Reçus de paiement — tests.
 *
 *  1. préparation des données (`receiptData`) : montants, sous-total, statuts ;
 *  2. rendu PDF (`receiptPdf`) : vrai fichier PDF, pagination au-delà d'une page ;
 *  3. bouton `ReceiptButton` : libellé, appel réseau du détail, téléchargement,
 *     comportement quand la commande n'est pas accessible.
 *
 * Un reçu témoin est aussi écrit pour inspection, dans le dossier `exemples/`
 * du dépôt — ou dans celui indiqué par `RECU_TEMOIN_DIR` (la sandbox de travail
 * s'en sert pour déposer les témoins de passation dans /home/user/exemples).
 * Le dossier est créé au besoin ; s'il n'est pas accessible en écriture, le test
 * est ignoré plutôt que mis en échec (un runner d'intégration continue n'a pas
 * toujours accès à l'extérieur du dépôt).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildReceiptData, estPaye, numeroRecu } from '../src/services/receipts/receiptData';
import { buildReceiptPdf, fmtMontant } from '../src/services/receipts/receiptPdf';
import { receiptLabels } from '../src/services/receipts/receiptLabels';
import { LanguageProvider } from '../src/context/LanguageContext';
import ReceiptButton from '../src/components/payments/ReceiptButton';

const getOrder = vi.fn();
vi.mock('../src/services/api', () => ({
  ordersApi: {
    getOrder: (...args: unknown[]) => getOrder(...args),
  },
}));

const telecharger = vi.fn();
vi.mock('../src/services/receipts/receiptPdf', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../src/services/receipts/receiptPdf')>();
  return { ...reel, downloadReceiptPdf: (...args: unknown[]) => telecharger(...args) };
});

const paiementReussi = {
  id: 5,
  order_id: 20,
  montant: '1850.00',
  methode: 'fedapay',
  statut: 'reussi',
  fedapay_ref: '523426',
  paid_at: '2026-10-14T14:56:30.000000Z',
};

const commande = {
  id: 20,
  montant_total: 1850,
  frais_livraison: 300,
  description_lieu: 'Près de la pharmacie',
  statut: 'livre',
  created_at: '2026-10-14T14:40:00.000000Z',
  items: [
    { nom: 'Riz parfumé 5 kg', quantite: 2, prix_unitaire: 600 },
    { nom: 'Huile de palme 1 L', quantite: 1, prix_unitaire: 650 },
  ],
  landmark: { nom: 'Dantokpa — Marché central' },
  client: { nom_complet: 'Awa Client', telephone: '+229 97 00 00 01' },
  livreur: { nom_complet: 'Koffi Livreur', telephone: '+229 97 00 00 02' },
};

beforeEach(() => {
  localStorage.setItem('tokpa_lang', 'fr');
  getOrder.mockReset();
  telecharger.mockReset();
});

/** Un jeu de données « pire cas » : 40 articles (pagination du PDF). */
function donneesLongues() {
  return buildReceiptData(
    { ...paiementReussi, montant: 12000 },
    {
      ...commande,
      items: Array.from({ length: 40 }, (_, i) => ({
        nom: `Article numéro ${i + 1} avec un libellé assez long pour tester le retour à la ligne`,
        quantite: 1,
        prix_unitaire: 300,
      })),
    },
  );
}

describe('préparation des données du reçu', () => {
  it('assemble un reçu complet (articles, sous-total, livraison, contacts)', () => {
    const data = buildReceiptData(paiementReussi, commande);
    expect(data.paymentId).toBe(5);
    expect(data.orderId).toBe(20);
    expect(data.paye).toBe(true);
    expect(data.lignes).toHaveLength(2);
    expect(data.lignes[0]).toEqual({ nom: 'Riz parfumé 5 kg', quantite: 2, prixUnitaire: 600, total: 1200 });
    expect(data.sousTotal).toBe(1850); // 1200 + 650
    expect(data.fraisLivraison).toBe(300);
    expect(data.total).toBe(1850); // montant réellement payé
    expect(data.client.nom).toBe('Awa Client');
    expect(data.livreur.telephone).toBe('+229 97 00 00 02');
    expect(data.zoneLivraison).toBe('Dantokpa — Marché central — Près de la pharmacie');
    expect(data.receiptNumber.startsWith('TOKPA-RECU-000005')).toBe(true);
    expect(data.receiptNumber.endsWith('523426') || /523426/.test(data.receiptNumber)).toBe(true);
  });

  it('reste valable sans le détail de la commande (mention « indisponible »)', () => {
    const data = buildReceiptData(paiementReussi, null);
    expect(data.detailDisponible).toBe(false);
    expect(data.lignes).toEqual([]);
    expect(data.total).toBe(1850);
    expect(data.sousTotal).toBeNull();
  });

  it('distingue un paiement non abouti d’un paiement réussi', () => {
    expect(estPaye('reussi')).toBe(true);
    expect(estPaye('en_attente')).toBe(false);
    expect(estPaye('echoue')).toBe(false);
    expect(estPaye(null)).toBe(false);
    const data = buildReceiptData({ ...paiementReussi, statut: 'en_attente', paid_at: null }, commande);
    expect(data.paye).toBe(false);
    expect(data.statut).toBe('en_attente');
  });

  it('déduit le sous-total du total moins les frais quand les articles manquent', () => {
    const data = buildReceiptData({ ...paiementReussi, montant: 2150 }, { ...commande, items: [] });
    expect(data.detailDisponible).toBe(false);
    expect(data.sousTotal).toBe(1850); // 2150 − 300 de frais
  });

  it('numérote les reçus de façon stable et lisible', () => {
    const a = numeroRecu(5, '523426');
    const b = numeroRecu(5, '523426');
    expect(a).toBe(b);
    expect(a).toMatch(/^TOKPA-RECU-000005-523426-\d{8}$/);
    expect(numeroRecu(9, null)).toMatch(/^TOKPA-RECU-000009-\d{8}$/);
  });
});

describe('rendu PDF', () => {
  it('produit un vrai fichier PDF (en-tête %PDF et taille plausible)', () => {
    const doc = buildReceiptPdf(buildReceiptData(paiementReussi, commande), receiptLabels());
    const buf = Buffer.from(doc.output('arraybuffer'));
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(2000);
  });

  it('pagine un reçu de 40 articles sur plusieurs pages', () => {
    const doc = buildReceiptPdf(donneesLongues(), receiptLabels());
    const pages = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
    expect(pages).toBeGreaterThan(1);
  });

  it('formate les montants en francs CFA', () => {
    // `toLocaleString` peut utiliser une espace fine insécable : on normalise.
    const sansEspaceFine = (v: string) => v.replace(/[\u202f\u00a0]/g, ' ');
    expect(sansEspaceFine(fmtMontant(1850))).toBe('1 850 FCFA');
    expect(sansEspaceFine(fmtMontant(null))).toBe('0 FCFA');
  });

  it('écrit un reçu témoin pour inspection', () => {
    const doc = buildReceiptPdf(buildReceiptData(paiementReussi, commande), receiptLabels());
    const buf = Buffer.from(doc.output('arraybuffer'));
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');

    // Dossier des témoins : variable d'environnement, sinon `exemples/` du dépôt.
    // Jamais de chemin absolu en dur : en intégration continue le dépôt est le
    // seul endroit inscriptible (/home/user n'existe pas).
    const dossier = process.env.RECU_TEMOIN_DIR ?? path.join(process.cwd(), 'exemples');
    try {
      mkdirSync(dossier, { recursive: true });
      writeFileSync(path.join(dossier, 'recu_exemple.pdf'), buf);
    } catch (erreur) {
      console.warn(`Reçu témoin non écrit dans ${dossier} : ${(erreur as Error).message}`);
    }
  });
});

describe('bouton de téléchargement du reçu', () => {
  function monter(props: Parameters<typeof ReceiptButton>[0]) {
    return render(
      <LanguageProvider>
        <ReceiptButton {...props} />
      </LanguageProvider>,
    );
  }

  it('affiche « Reçu » et télécharge au clic (détail chargé depuis l’API)', async () => {
    getOrder.mockResolvedValue({ data: commande });
    monter({ payment: paiementReussi, testId: 'recu' });

    const bouton = screen.getByTestId('recu');
    expect(bouton.textContent).toContain('Reçu');

    await act(async () => {
      fireEvent.click(bouton);
    });

    await waitFor(() => expect(telecharger).toHaveBeenCalledTimes(1));
    expect(getOrder).toHaveBeenCalledWith(20);
    const [data, labels] = telecharger.mock.calls[0] as [{ paymentId: number; total: number }, { title: string }];
    expect(data.paymentId).toBe(5);
    expect(data.total).toBe(1850);
    expect(labels.title).toBe('Reçu de paiement');
  });

  it('n’appelle pas l’API quand la commande est déjà fournie', async () => {
    monter({ payment: paiementReussi, order: commande, testId: 'recu-fourni' });
    await act(async () => {
      fireEvent.click(screen.getByTestId('recu-fourni'));
    });
    await waitFor(() => expect(telecharger).toHaveBeenCalledTimes(1));
    expect(getOrder).not.toHaveBeenCalled();
  });

  it('télécharge quand même le reçu si le détail de la commande est refusé', async () => {
    getOrder.mockRejectedValue(new Error('403'));
    monter({ payment: paiementReussi, testId: 'recu-refus' });
    await act(async () => {
      fireEvent.click(screen.getByTestId('recu-refus'));
    });
    await waitFor(() => expect(telecharger).toHaveBeenCalledTimes(1));
    const [data] = telecharger.mock.calls[0] as [{ detailDisponible: boolean; total: number }];
    expect(data.detailDisponible).toBe(false);
    expect(data.total).toBe(1850);
  });

  it('reste disponible pour un paiement non payé (mention « non payé » dans le PDF)', async () => {
    monter({ payment: { ...paiementReussi, id: 6, statut: 'en_attente', paid_at: null }, order: commande, testId: 'recu-impaye' });
    await act(async () => {
      fireEvent.click(screen.getByTestId('recu-impaye'));
    });
    await waitFor(() => expect(telecharger).toHaveBeenCalledTimes(1));
    const [data] = telecharger.mock.calls[0] as [{ paye: boolean; statut: string }];
    expect(data.paye).toBe(false);
    expect(data.statut).toBe('en_attente');
  });
});
