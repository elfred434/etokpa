
// Prépare et calcule les données structurées d’un reçu de commande.
export type ReceiptClientInput = {
  nom_complet?: string | null;
  prenom?: string | null;
  nom?: string | null;
  telephone?: string | null;
};

export type ReceiptPayment = {
  id: number;
  order_id?: number | null;
  client_id?: number | null;
  montant?: number | string | null;
  methode?: string | null;
  statut?: string | null;
  fedapay_ref?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  client?: ReceiptClientInput | null;
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
  client?: ReceiptClientInput | null;
  livreur_id?: number | string | null;
  livreur?: { id?: number | string | null; nom_complet?: string | null; telephone?: string | null } | null;
};

const STATUTS_AVEC_RECU = new Set(['en_livraison', 'livre', 'livree']);

// Vérifie la condition métier canDownloadReceipt.
export function canDownloadReceipt(
  order?: {
    statut?: string | null;
    livreur_id?: number | string | null;
    livreur?: { id?: number | string | null; nom_complet?: string | null } | null;
  } | null,
): boolean {
  if (!order) return false;
  const statut = (order.statut ?? '').toString().trim().toLowerCase();
  if (!STATUTS_AVEC_RECU.has(statut)) return false;

  const hasLivreurField = order.livreur !== undefined || order.livreur_id !== undefined;
  if (hasLivreurField) {
    const hasNom = Boolean(order.livreur?.nom_complet && String(order.livreur.nom_complet).trim());
    const hasId =
      (order.livreur_id != null && Number(order.livreur_id) > 0) ||
      (order.livreur?.id != null && Number(order.livreur.id) > 0);
    if (!hasNom && !hasId) return false;
  }
  return true;
}

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

// Helper toNumber : réalise le traitement métier associé.
export function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Vérifie la condition métier estPaye.
export function estPaye(statut?: string | null): boolean {
  return (statut ?? '').toLowerCase() === 'reussi';
}

// Helper numeroRecu : réalise le traitement métier associé.
export function numeroRecu(paymentId: number, reference?: string | null): string {
  const brut = (reference ?? '').replace(/[^0-9]/g, '').slice(-6);
  const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TOKPA-RECU-${String(paymentId).padStart(6, '0')}${brut ? `-${brut}` : ''}-${jour}`;
}

// Helper nomFichierRecu : réalise le traitement métier associé.
export function nomFichierRecu(data: ReceiptData): string {
  const commande = data.orderId ? `-commande-${data.orderId}` : '';
  return `recu-tokpa-paiement-${data.paymentId}${commande}.pdf`;
}

// Helper cleanField : réalise le traitement métier associé.
function cleanField(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// Transforme ou formate les données via resolveClientNom.
function resolveClientNom(source?: ReceiptClientInput | null): string | null {
  if (!source) return null;
  const full = cleanField(source.nom_complet);
  if (full) return full;
  const parts = [cleanField(source.prenom), cleanField(source.nom)].filter(Boolean).join(' ');
  return parts || null;
}

// Transforme ou formate les données via buildReceiptData.
export function buildReceiptData(
  payment: ReceiptPayment,
  order?: ReceiptOrder | null,
  clientFallback?: ReceiptClientInput | null,
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
      nom:
        resolveClientNom(order?.client) ??
        resolveClientNom(payment.client) ??
        resolveClientNom(clientFallback),
      telephone:
        cleanField(order?.client?.telephone) ??
        cleanField(payment.client?.telephone) ??
        cleanField(clientFallback?.telephone),
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
