// Traduit et formate les libellés des notifications temps réel.
import type { ApiNotification } from '../services/api';
import type { NotificationType } from '../types/models';

const STATUT_TEXT: Record<string, { fr: string; en: string }> = {
  en_attente: { fr: 'en attente de confirmation', en: 'pending confirmation' },
  en_preparation: { fr: 'en cours de préparation', en: 'being prepared' },
  en_livraison: { fr: 'en cours de livraison', en: 'out for delivery' },
  livre: { fr: 'a été livrée', en: 'has been delivered' },
  annule: { fr: 'a été annulée', en: 'was cancelled' },
  accepte: { fr: 'acceptée', en: 'accepted' },
  refuse: { fr: 'refusée', en: 'rejected' },
  expire: { fr: 'expirée', en: 'expired' },
};

// Helper describeNotification : réalise le traitement métier associé.
export function describeNotification(n: ApiNotification, isFr: boolean): { type: NotificationType; title: string; message: string; orderId?: number } {
  const d = n.data ?? {};
  const orderId = d.order_id !== undefined ? Number(d.order_id) : undefined;

  switch (n.type) {
    case 'order.status': {
      const statut = String(d.statut ?? '');
      const t = STATUT_TEXT[statut] ?? { fr: statut, en: statut };
      return {
        type: 'order',
        title: isFr ? `Commande #${orderId ?? ''} — statut` : `Order #${orderId ?? ''} — status`,
        message: isFr ? `Votre commande est ${t.fr}.` : `Your order is ${t.en}.`,
        orderId,
      };
    }
    case 'order.confirmed':
      return {
        type: 'order',
        title: isFr ? `Commande #${orderId ?? ''} confirmée` : `Order #${orderId ?? ''} confirmed`,
        message: isFr
          ? 'Votre commande a bien été enregistrée. Suivez son avancement en direct.'
          : 'Your order has been registered. Track its progress live.',
        orderId,
      };
    case 'budget.response': {
      const statut = String(d.statut ?? '');
      const t = STATUT_TEXT[statut] ?? { fr: statut, en: statut };
      return {
        type: 'promo',
        title: isFr
          ? `Négociation ${t.fr}`
          : `Negotiation ${t.en}`,
        message: isFr
          ? `Votre offre sur le budget a été ${t.fr}${statut === 'accepte' ? ' — valable 12 h sur vos commandes de ce produit.' : '.'}`
          : `Your budget offer was ${t.en}${statut === 'accepte' ? ' — valid for 12h on your orders for this product.' : '.'}`,
        orderId: statut === 'accepte' ? orderId : undefined,
      };
    }
    case 'delivery.assigned':
      return {
        type: 'order',
        title: isFr ? 'Livreur assigné' : 'Rider assigned',
        message: isFr
          ? `Un livreur a été assigné à votre commande #${orderId ?? ''}.`
          : `A rider was assigned to your order #${orderId ?? ''}.`,
        orderId,
      };
    case 'payment.confirmed':
      return {
        type: 'order',
        title: isFr ? 'Paiement confirmé' : 'Payment confirmed',
        message: isFr
          ? `Le paiement de votre commande #${orderId ?? ''} a été confirmé par FedaPay.`
          : `The payment for your order #${orderId ?? ''} was confirmed by FedaPay.`,
        orderId,
      };
    case 'role.changed': {
      const role = String(d.role ?? '');
      const isAdmin = role === 'admin' || role === 'super_admin';
      const rawMsg = typeof d.message === 'string' && d.message.trim() ? d.message.trim() : '';
      return {
        type: 'security',
        title: isFr ? 'Rôle mis à jour' : 'Role updated',
        message: isFr
          ? rawMsg || (isAdmin ? 'Vous êtes maintenant administrateur.' : 'Vous êtes maintenant manager.')
          : isAdmin
            ? 'You are now an administrator.'
            : 'You are now a manager.',
      };
    }
    default:
      return {
        type: 'order',
        title: isFr ? 'Notification TOKPa' : 'TOKPa notification',
        message: isFr ? 'Mise à jour concernant votre compte' : 'An update about your account',
        orderId,
      };
  }
}

export type DeliveryAssignmentRecipient = 'livreur' | 'client' | 'manager' | 'admin' | 'super_admin' | null;

// Helper assignedOrderId : réalise le traitement métier associé.
export function assignedOrderId(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const row = payload as { id?: unknown; order_id?: unknown; order?: { id?: unknown } | null };
  const id = Number(row.order_id ?? row.order?.id ?? row.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

// Helper deliveryAssignmentToastMessage : réalise le traitement métier associé.
export function deliveryAssignmentToastMessage(
  recipient: string | null,
  orderId: number | undefined,
  isFr: boolean,
): string {
  const suffix = orderId ? ` #${orderId}` : '';
  if (recipient === 'livreur') {
    return isFr
      ? `Nouvelle course assignée${orderId ? ` — commande${suffix}` : ''}.`
      : `New delivery assigned${orderId ? ` — order${suffix}` : ''}.`;
  }
  if (recipient === 'manager' || recipient === 'admin' || recipient === 'super_admin') {
    return isFr
      ? `Un livreur a été assigné${orderId ? ` à la commande${suffix}` : ' à une commande'}.`
      : `A rider was assigned${orderId ? ` to order${suffix}` : ' to an order'}.`;
  }
  return isFr
    ? `Un livreur a été assigné${orderId ? ` à votre commande${suffix}` : ' à votre commande'}.`
    : `A rider was assigned${orderId ? ` to your order${suffix}` : ' to your order'}.`;
}

// Transforme ou formate les données via formatTime.
export function formatTime(iso: string, isFr: boolean): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return time;
  return `${date.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })} ${time}`;
}

