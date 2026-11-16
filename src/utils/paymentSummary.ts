import type { PaymentJson } from '../services/api/payments';
import { listOf, unwrap } from '../services/api/unwrap';

export interface OrderPaymentSummary {
  id: number;
  montant: number;
  statut: string;
  methode: string;
}

function rankPayment(p: { id?: number; statut?: string }): number {
  const s = String(p.statut ?? '');
  if (s === 'reussi' || s === 'rembourse') return 3;
  if (s === 'en_attente') return 2;
  if (s === 'echoue') return 1;
  return 0;
}

/**
 * Indexe le paiement effectif par `order_id` depuis `GET /payments`.
 * Utile car `Commande::payment()` côté backend est un `hasOne` sans `latestOfMany()`,
 * et `GET /orders` ne charge pas la relation `payment`.
 */
export function indexEffectivePayments(rawResponse: unknown): Map<number, OrderPaymentSummary> {
  const map = new Map<number, OrderPaymentSummary>();
  if (!rawResponse) return map;
  const rows = listOf(unwrap(rawResponse)) as Array<PaymentJson & { order?: { id?: number } | null }>;
  for (const row of rows) {
    const orderId = Number(row?.order?.id ?? row?.order_id ?? 0);
    if (!orderId || !row?.id) continue;
    const candidate: OrderPaymentSummary = {
      id: Number(row.id),
      montant: Number(row.montant ?? 0),
      statut: String(row.statut ?? ''),
      methode: String(row.methode ?? 'fedapay'),
    };
    const prev = map.get(orderId);
    if (!prev) {
      map.set(orderId, candidate);
      continue;
    }
    const rNew = rankPayment(candidate);
    const rPrev = rankPayment(prev);
    if (rNew > rPrev || (rNew === rPrev && candidate.id > prev.id)) {
      map.set(orderId, candidate);
    }
  }
  return map;
}

export function resolveOrderPayment(
  orderId: number,
  apiOrderPayment: OrderPaymentSummary | null | undefined,
  indexed?: Map<number, OrderPaymentSummary>,
): OrderPaymentSummary | null {
  const fromList = indexed?.get(orderId) ?? null;
  if (!apiOrderPayment) return fromList;
  if (!fromList) return apiOrderPayment;
  const rList = rankPayment(fromList);
  const rOrder = rankPayment(apiOrderPayment);
  if (rList > rOrder || (rList === rOrder && fromList.id > apiOrderPayment.id)) {
    return fromList;
  }
  return apiOrderPayment;
}
