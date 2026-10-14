/**
 * Reçu de paiement — préparation des données.
 *
 * Ce module est volontairement PUR (aucune dépendance React ni PDF) :
 * il transforme un paiement (`GET /payments` ou `/admin/payments`) et,
 * si disponible, la commande associée (`GET /orders/{id}`) en un objet
 * `ReceiptData` prêt à être rendu par `receiptPdf.ts`.
 *
 * Contexte : le backend pose aujourd'hui `recu_url = /receipts/payment-N.pdf`
 * (voir NOTE_21_RECUS_BACKEND.md) mais ne sert aucun fichier. Le reçu est donc
 * généré côté front à partir des données réellement renvoyées par l'API.
 */

export type ReceiptPayment = {
  id: number;
  order_id?: number | null;
  montant?: number | string | null;
  methode?: string | null;
  statut?: string | null;
  fedapay_ref?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type ReceiptOrderItem = {
  nom?: string | null;
  quantite?: number | string | null;
  prix_unitaire?: number | string | null;
};

export type ReceiptOrder = {
  id?: number | null;
  montant_total?: number | string | null;
  frais_livraison?: number | string | null;
  description_lieu?: string | null;
  statut?: string | null;
  created_at?: string | null;
  items?: ReceiptOrderItem[] | null;
  landmark?: { nom?: string | null } | null;
  client?: { nom_complet?: string | null; telephone?: string | null } | null;
  livreur?: { nom_complet?: string | null; telephone?: string | null } | null;
};

export type ReceiptLine = {
  nom: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
};

export type ReceiptData = {
  paymentId: number;
  receiptNumber: string;
  orderId: number | null;
  statut: string;
  paye: boolean;
  montant: number;
  methode: string | null;
  reference: string | null;
  paidAt: string | null;
  emisLe: string;
  client: { nom: string | null; telephone: string | null };
  livreur: { nom: string | null; telephone: string | null };
  zoneLivraison: string | null;
  lignes: ReceiptLine[];
  detailDisponible: boolean;
  sousTotal: number | null;
  fraisLivraison: number | null;
  total: number;
};

export function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Un paiement n'est « payé » que s'il est réussi (le backend utilise `reussi`). */
export function estPaye(statut?: string | null): boolean {
  return (statut ?? '').toLowerCase() === 'reussi';
}

/**
 * Numéro de reçu lisible et stable : TOKPA-RECU-000005-20261014.
 * Il ne dépend que du paiement et de sa date — deux téléchargements
 * du même reçu portent donc le même numéro.
 */
export function numeroRecu(paymentId: number, reference?: string | null): string {
  const brut = (reference ?? '').replace(/[^0-9]/g, '').slice(-6);
  const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TOKPA-RECU-${String(paymentId).padStart(6, '0')}${brut ? `-${brut}` : ''}-${jour}`;
}

export function nomFichierRecu(data: ReceiptData): string {
  const commande = data.orderId ? `-commande-${data.orderId}` : '';
  return `recu-tokpa-paiement-${data.paymentId}${commande}.pdf`;
}

/**
 * Assemble le reçu. `order` est facultatif : quand il manque (détail non
 * autorisé ou commande supprimée), le reçu reste valable — il porte alors
 * la mention « détail des articles indisponible ».
 */
export function buildReceiptData(
  payment: ReceiptPayment,
  order?: ReceiptOrder | null,
): ReceiptData {
  const montant = toNumber(payment.montant);
  const lignes: ReceiptLine[] = (order?.items ?? [])
    .map((item) => {
      const quantite = toNumber(item.quantite);
      const prixUnitaire = toNumber(item.prix_unitaire);
      return {
        nom: (item.nom ?? '—').toString(),
        quantite,
        prixUnitaire,
        total: quantite * prixUnitaire,
      };
    })
    .filter((l) => l.nom !== '—' || l.total > 0);

  const detailDisponible = lignes.length > 0;
  const fraisLivraison = order?.frais_livraison != null ? toNumber(order.frais_livraison) : null;
  const sommeLignes = detailDisponible ? lignes.reduce((acc, l) => acc + l.total, 0) : null;
  const total = montant > 0 ? montant : toNumber(order?.montant_total);

  // Sous-total : somme des articles si on les a, sinon total − frais de livraison.
  let sousTotal: number | null = sommeLignes;
  if (sousTotal == null && fraisLivraison != null && total > 0) {
    sousTotal = Math.max(total - fraisLivraison, 0);
  }

  const lieu =
    [order?.landmark?.nom ?? null, order?.description_lieu ?? null].filter(Boolean).join(' — ') ||
    null;

  return {
    paymentId: payment.id,
    receiptNumber: numeroRecu(payment.id, payment.fedapay_ref),
    orderId: payment.order_id ?? order?.id ?? null,
    statut: payment.statut ?? order?.statut ?? 'inconnu',
    paye: estPaye(payment.statut),
    montant: total,
    methode: payment.methode ?? null,
    reference: payment.fedapay_ref ?? null,
    paidAt: payment.paid_at ?? null,
    emisLe: new Date().toISOString(),
    client: {
      nom: order?.client?.nom_complet ?? null,
      telephone: order?.client?.telephone ?? null,
    },
    livreur: {
      nom: order?.livreur?.nom_complet ?? null,
      telephone: order?.livreur?.telephone ?? null,
    },
    zoneLivraison: lieu,
    lignes,
    detailDisponible,
    sousTotal,
    fraisLivraison,
    total,
  };
}
