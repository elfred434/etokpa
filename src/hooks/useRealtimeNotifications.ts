import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { catalogApi } from '../services/api/catalog';
import { windowEcho } from '../services/realtime/echo';
import { assignedOrderId, deliveryAssignmentToastMessage } from '../utils/notificationText';

export interface RealtimeRefreshEvent {
  scope: 'orders' | 'proposals' | 'notifications' | 'all';
  payload?: Record<string, unknown>;
}

/** Déclenche un rafraîchissement pour les pages abonnées (via `subscribeRealtimeRefresh`). */
export function emitRealtimeRefresh(event: RealtimeRefreshEvent): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<RealtimeRefreshEvent>('tokpa:realtime-refresh', { detail: event }));
  }
}

/** Abonnement typé à `tokpa:realtime-refresh` (scopes multiples). */
export function subscribeRealtimeRefresh(scopes: RealtimeRefreshEvent['scope'][], callback: (e: RealtimeRefreshEvent) => void): () => void {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<RealtimeRefreshEvent>).detail;
    // Le scope 'all' émis par Actualiser doit réveiller chaque abonnement ciblé.
    if (detail && (detail.scope === 'all' || scopes.includes('all') || scopes.includes(detail.scope))) {
      callback(detail);
    }
  };
  window.addEventListener('tokpa:realtime-refresh', handler as EventListener);
  return () => window.removeEventListener('tokpa:realtime-refresh', handler as EventListener);
}

const STATUT_LABELS: Record<string, { fr: string; en: string }> = {
  en_attente: { fr: 'en attente', en: 'pending' },
  en_preparation: { fr: 'en préparation', en: 'preparing' },
  en_livraison: { fr: 'en livraison', en: 'out for delivery' },
  livre: { fr: 'livrée', en: 'delivered' },
  annule: { fr: 'annulée', en: 'cancelled' },
};

type StoredRealtimeUser = {
  id?: number | string;
  role?: string | { nom?: string } | null;
  profil?: {
    zone_id?: number | string | null;
    zone?: { id?: number | string | null } | null;
  } | null;
};

function readRealtimeUser(): StoredRealtimeUser | null {
  try {
    const raw = localStorage.getItem('tokpa_user');
    return raw ? JSON.parse(raw) as StoredRealtimeUser : null;
  } catch {
    return null;
  }
}

function zoneIdOf(user: StoredRealtimeUser): number | undefined {
  const id = Number(user.profil?.zone_id ?? user.profil?.zone?.id ?? 0);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function zoneIdsFromResponse(value: unknown): number[] {
  const body = value && typeof value === 'object' && 'data' in value
    ? (value as { data?: unknown }).data
    : value;
  if (!Array.isArray(body)) return [];
  return [...new Set(body.map((row) => {
    if (!row || typeof row !== 'object' || !('id' in row)) return 0;
    const id = Number((row as { id?: unknown }).id);
    return Number.isInteger(id) && id > 0 ? id : 0;
  }).filter((id) => id > 0))];
}

/**
 * Hook global temps réel — canal privé `notifications.{userId}` du backend.
 * Événements écoutés (voir app/Events/*.php du backend) :
 *   - order.status.changed   {order_id, statut, previous}
 *   - budget.responded       (modèle BudgetPropose : id, statut, admin_response, commande?)
 *   - payment.confirmed      (modèle Payment : id, order_id, montant)
 *   - delivery.assigned      (commande; envoyé au livreur, au client et aux managers de la zone)
 *
 * Toasts bilingues + émission d'événements de rafraîchissement pour les pages
 * (orders, négociations, notifications) via `subscribeRealtimeRefresh`.
 */
export function useRealtimeNotifications(sessionKey: number): void {
  const { isFr } = useLanguage();
  const isFrRef = useRef(isFr);
  isFrRef.current = isFr;

  useEffect(() => {
    if (!localStorage.getItem('tokpa_token')) return;

    const echo = windowEcho();
    if (!echo) return;

    const user = readRealtimeUser();
    const userId = Number(user?.id ?? 0);
    if (!user || !Number.isInteger(userId) || userId <= 0) return;

    const role = typeof user.role === 'string' ? user.role : user.role?.nom ?? null;
    const notificationsChannel = echo.private(`notifications.${userId}`);
    let active = true;
    const managerChannelStops: Array<() => void> = [];
    const managerZoneIds = new Set<number>();

    const onStatusChanged = (data: { order_id: number; statut: string; previous: string }) => {
      const label = STATUT_LABELS[data.statut];
      toast(
        isFrRef.current
          ? `Commande #${data.order_id} : ${label?.fr ?? data.statut}`
          : `Order #${data.order_id}: ${label?.en ?? data.statut}`,
      );
      emitRealtimeRefresh({ scope: 'orders', payload: data });
      emitRealtimeRefresh({ scope: 'notifications' });
    };

    const onBudgetResponded = (data: { id?: number; statut?: string; admin_response?: string }) => {
      const accepted = data.statut === 'accepte';
      toast(
        (isFrRef.current
          ? accepted
            ? 'Votre proposition de prix a été acceptée !'
            : `Votre proposition a été refusée${data.admin_response ? ` : ${data.admin_response}` : ''}`
          : accepted
            ? 'Your price proposal was accepted!'
            : `Your proposal was rejected${data.admin_response ? `: ${data.admin_response}` : ''}`),
        { icon: accepted ? '🤝' : '📩' },
      );
      emitRealtimeRefresh({ scope: 'proposals', payload: data });
      emitRealtimeRefresh({ scope: 'notifications' });
      if (accepted) emitRealtimeRefresh({ scope: 'orders' });
    };

    const onPaymentConfirmed = (data: { order_id?: number }) => {
      toast(
        isFrRef.current
          ? `Paiement confirmé${data.order_id ? ` — commande #${data.order_id}` : ''}`
          : `Payment confirmed${data.order_id ? ` — order #${data.order_id}` : ''}`,
        { icon: '💳' },
      );
      emitRealtimeRefresh({ scope: 'orders', payload: data });
      emitRealtimeRefresh({ scope: 'notifications' });
    };

    const onDeliveryAssigned = (data: { id?: unknown; order_id?: unknown; order?: { id?: unknown } | null }) => {
      const orderId = assignedOrderId(data);
      toast(deliveryAssignmentToastMessage(role, orderId, isFrRef.current), { icon: '🛵' });
      emitRealtimeRefresh({ scope: 'orders', payload: data as Record<string, unknown> });
      emitRealtimeRefresh({ scope: 'notifications' });
    };

    notificationsChannel.listen('order.status.changed', onStatusChanged);
    notificationsChannel.listen('budget.responded', onBudgetResponded);
    notificationsChannel.listen('payment.confirmed', onPaymentConfirmed);
    notificationsChannel.listen('delivery.assigned', onDeliveryAssigned);

    const listenManagerZone = (zoneId: number | undefined) => {
      if (!active || !zoneId || managerZoneIds.has(zoneId)) return;
      managerZoneIds.add(zoneId);
      const channel = echo.private(`manager.${zoneId}`);
      channel.listen('delivery.assigned', onDeliveryAssigned);
      managerChannelStops.push(() => channel.stopListening('delivery.assigned', onDeliveryAssigned));
    };

    if (role === 'manager') {
      listenManagerZone(zoneIdOf(user));
    } else if (role === 'admin' || role === 'super_admin') {
      // Les admins peuvent recevoir les assignations de toutes les zones.
      listenManagerZone(zoneIdOf(user));
      void catalogApi.getZones()
        .then((response) => {
          if (!active) return;
          zoneIdsFromResponse(response).forEach(listenManagerZone);
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
      notificationsChannel.stopListening('order.status.changed', onStatusChanged);
      notificationsChannel.stopListening('budget.responded', onBudgetResponded);
      notificationsChannel.stopListening('payment.confirmed', onPaymentConfirmed);
      notificationsChannel.stopListening('delivery.assigned', onDeliveryAssigned);
      managerChannelStops.forEach((stop) => stop());
    };
  }, [sessionKey]);
}
