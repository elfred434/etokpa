import { apiClient } from './client';

export interface CreateOrderPayload {
  items: Array<{
    product_id: number;
    quantite: number;
  }>;
  landmark_id: number;
  description_lieu?: string;
  payment_method: 'cash' | 'card' | 'fedapay';
}

/** Corps renvoyé par POST /orders, ancien ou nouveau. */
export interface CreatedOrderRead {
  id: number;
  montantTotal: number | null;
  /** Présent depuis le commit backend qui lance FedaPay dans la création. */
  payment: {
    payment?: { id?: number; fedapay_ref?: string | null };
    redirect_url?: string | null;
    currency?: string;
    token?: string | null;
  } | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Le backend renvoie soit l'ancienne ressource `{ data: { id } }`,
 * soit `{ order: { data: { id } }, payment }` depuis la création avec FedaPay.
 * Sans cette lecture, le panier envoie order_id = 0 à /payments/init (422).
 */
export function readCreatedOrder(body: unknown): CreatedOrderRead {
  const root = asRecord(body) ?? {};
  const orderNode = asRecord(root.order) ?? root;
  const nested = asRecord(orderNode.data);
  const data = nested && ('id' in nested || 'montant_total' in nested) ? nested : orderNode;
  const id = Number(data.id ?? 0);
  const rawTotal = data.montant_total;
  const payment = asRecord(root.payment);

  return {
    id: Number.isFinite(id) && id > 0 ? id : 0,
    montantTotal: rawTotal == null || rawTotal === '' ? null : Number(rawTotal),
    payment,
  };
}

export const ordersApi = {
  // GET /api/orders -> liste des commandes du client
  getOrders: async (page = 1, statut?: string) => {
    const response = await apiClient.get('/orders', { params: { page, ...(statut ? { statut } : {}) } });
    return response.data;
  },

  // GET /api/orders/{id} -> détails d'une commande
  getOrder: async (id: number | string) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  // POST /api/orders -> passer une commande
  createOrder: async (payload: CreateOrderPayload) => {
    const response = await apiClient.post('/orders', payload);
    return response.data;
  },

  // DELETE /api/orders/{id} -> annuler une commande
  cancelOrder: async (id: number | string) => {
    const response = await apiClient.delete(`/orders/${id}`);
    return response.data;
  },

  // GET /api/orders/{id}/tracking -> suivi d'une commande
  getTracking: async (id: number | string) => {
    const response = await apiClient.get(`/orders/${id}/tracking`);
    return response.data;
  },
};
