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
import { authApi, ordersApi } from '../../services/api';
import {
  currentUserId,
  currentUserName,
  currentUserPhone,
  hasSession,
  rememberSessionUser,
} from '../../routes/authGuard';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';
import {
  buildReceiptData,
  canDownloadReceipt,
  type ReceiptClientInput,
  type ReceiptOrder,
  type ReceiptPayment,
} from '../../services/receipts/receiptData';
import { downloadReceiptPdf } from '../../services/receipts/receiptPdf';
import { localeRecu, receiptLabels } from '../../services/receipts/receiptLabels';

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

type Props = {
  payment: ReceiptPayment;
  /** Commande déjà chargée (évite un appel réseau supplémentaire). */
  order?: ReceiptOrder | null;
  /** Informations client déjà connues (ex. annuaire admin) quand l'API commande ne renvoie pas `client`. */
  client?: ReceiptClientInput | null;
  /** Autorise le repli sur le profil de la session active quand il s'agit du paiement du client connecté. */
  allowSessionFallback?: boolean;
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
  client = null,
  allowSessionFallback = true,
  variant = 'inline',
  testId = 'receipt-button',
  stopPropagation = false,
  className = '',
}: Props) {
  useLanguage(); // le libellé suit la langue choisie
  const [busy, setBusy] = useState(false);

  if (order && !canDownloadReceipt(order)) {
    return null;
  }

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
      if (commande && !canDownloadReceipt(commande)) {
        toast.error(
          tr(
            'Le reçu est disponible uniquement lorsque le livreur est assigné et la livraison lancée.',
            'The receipt is only available once a courier is assigned and delivery has started.',
          ),
          { id: 'tokpa-receipt-unavailable' },
        );
        return;
      }

      let clientNom =
        cleanText(commande?.client?.nom_complet) ??
        cleanText([commande?.client?.prenom, commande?.client?.nom].filter(Boolean).join(' ')) ??
        cleanText(payment.client?.nom_complet) ??
        cleanText([payment.client?.prenom, payment.client?.nom].filter(Boolean).join(' ')) ??
        cleanText(client?.nom_complet) ??
        cleanText([client?.prenom, client?.nom].filter(Boolean).join(' '));
      let clientTel =
        cleanText(commande?.client?.telephone) ??
        cleanText(payment.client?.telephone) ??
        cleanText(client?.telephone);

      const sessionUserId = currentUserId();
      const isOwnPayment = payment.client_id == null || (sessionUserId != null && payment.client_id === sessionUserId);
      if (allowSessionFallback && isOwnPayment) {
        if (!clientNom) clientNom = currentUserName();
        if (!clientTel) clientTel = currentUserPhone();
        if ((!clientNom || !clientTel) && hasSession()) {
          try {
            const profileRes = await authApi?.getProfile?.();
            const profile = ((profileRes as { data?: Record<string, unknown> })?.data ?? profileRes) as
              | { nom_complet?: string; prenom?: string; nom?: string; telephone?: string }
              | undefined;
            if (profile && typeof profile === 'object') {
              rememberSessionUser(profile as Record<string, unknown>);
              if (!clientNom) {
                clientNom =
                  cleanText(profile.nom_complet) ??
                  cleanText([profile.prenom, profile.nom].filter(Boolean).join(' '));
              }
              if (!clientTel) clientTel = cleanText(profile.telephone);
            }
          } catch {
            // Repli silencieux sur les informations déjà disponibles.
          }
        }
      }

      const clientFallback: ReceiptClientInput | null =
        clientNom || clientTel ? { nom_complet: clientNom, telephone: clientTel } : null;

      const donnees = buildReceiptData(payment, commande, clientFallback);
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
