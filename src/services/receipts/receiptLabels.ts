/**
 * Libellés du reçu, dans la langue active de l'application.
 * Centralisé ici pour que le PDF et l'interface restent cohérents.
 */
import { tx, uiLang } from '../../i18n/tx';
import type { ReceiptLabels } from './receiptPdf';

/** Locale d'affichage des nombres et des dates, alignée sur la langue. */
export function localeRecu(): string {
  switch (uiLang()) {
    case 'en':
      return 'en-GB';
    case 'es':
      return 'es-ES';
    case 'de':
      return 'de-DE';
    case 'pt':
      return 'pt-PT';
    default:
      return 'fr-FR';
  }
}

export function receiptLabels(): ReceiptLabels {
  return {
    title: tx('Reçu de paiement'),
    receiptNo: tx('N° de reçu'),
    generatedAt: tx('Généré le'),
    paidAt: tx('Payé le'),
    notPaid: tx('Non payé'),
    status: tx('Statut du paiement'),
    method: tx('Moyen de paiement'),
    reference: tx('Référence de transaction'),
    paymentSection: tx('Paiement'),
    client: tx('Client'),
    livreur: tx('Livreur'),
    order: tx('Commande'),
    delivery: tx('Livraison'),
    phone: tx('Téléphone'),
    items: tx('Détail des articles'),
    colName: tx('Désignation'),
    colQty: tx('Quantité'),
    colUnit: tx('Prix unitaire'),
    colTotal: tx('Montant'),
    noDetail: tx('Détail des articles indisponible'),
    subtotal: tx('Sous-total'),
    deliveryFee: tx('Frais de livraison'),
    total: tx('Total'),
    footer: tx('Document généré par TokPa — justificatif de paiement.'),
    statusLabels: {
      reussi: tx('Paiement réussi'),
      en_attente: tx('Paiement en attente'),
      echoue: tx('Paiement échoué'),
      rembourse: tx('Paiement remboursé'),
    },
  };
}
