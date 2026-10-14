/**
 * Bouton « Reçu » — télécharge le reçu PDF d'un paiement.
 *
 * Utilisé côté client (page Paiements, suivi de commande) et côté
 * administration (page Paiements). Le reçu est généré dans le navigateur
 * à partir des données de l'API : il fonctionne pour tous les statuts de
 * paiement, les non-payés portant la mention « NON PAYÉ » bien visible.
 *
 * Le détail des articles vient de `GET /orders/{id}` ; s'il n'est pas
 * accessible, le reçu est tout de même produit (montant, référence, date).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import MIcon from '../shared/MIcon';
import { ordersApi } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';
import {
  buildReceiptData,
  type ReceiptOrder,
  type ReceiptPayment,
} from '../../services/receipts/receiptData';
import { downloadReceiptPdf } from '../../services/receipts/receiptPdf';
import { localeRecu, receiptLabels } from '../../services/receipts/receiptLabels';

type Props = {
  payment: ReceiptPayment;
  /** Commande déjà chargée (évite un appel réseau supplémentaire). */
  order?: ReceiptOrder | null;
  /** `inline` = lien discret (listes) · `button` = bouton bordé (détails). */
  variant?: 'inline' | 'button';
  /** Nom accessible / identifiant de test. */
  testId?: string;
  /** Empêche l'ouverture de la modale parente lors du clic. */
  stopPropagation?: boolean;
  className?: string;
};

export default function ReceiptButton({
  payment,
  order = null,
  variant = 'inline',
  testId = 'receipt-button',
  stopPropagation = false,
  className = '',
}: Props) {
  useLanguage(); // le libellé suit la langue choisie
  const [busy, setBusy] = useState(false);

  const telecharger = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let commande: ReceiptOrder | null = order;
      if (!commande && payment.order_id) {
        try {
          const res = await ordersApi.getOrder(payment.order_id);
          commande = ((res as { data?: ReceiptOrder })?.data ?? res) as ReceiptOrder;
        } catch {
          commande = null; // reçu produit sans le détail des articles
        }
      }
      const donnees = buildReceiptData(payment, commande);
      downloadReceiptPdf(donnees, receiptLabels(), localeRecu());
      toast.success(tx('Reçu téléchargé.'), { id: 'tokpa-receipt-done' });
    } catch {
      toast.error(tx('Impossible de générer le reçu.'), { id: 'tokpa-receipt-error' });
    } finally {
      setBusy(false);
    }
  };

  const libelle = busy ? tx('Préparation du reçu…') : tx('Télécharger le reçu');

  const base =
    variant === 'button'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default text-label font-semibold text-primary hover:bg-primary-tint transition-colors cursor-pointer'
      : 'inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer';

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        void telecharger();
      }}
      disabled={busy}
      aria-busy={busy}
      title={libelle}
      className={`${base} disabled:opacity-60 disabled:cursor-wait ${className}`}
    >
      <MIcon name={busy ? 'progress_activity' : 'download'} className={`text-[16px] ${busy ? 'animate-spin' : ''}`} />
      {variant === 'button' ? <span>{libelle}</span> : <span>{busy ? libelle : tx('Reçu')}</span>}
    </button>
  );
}
