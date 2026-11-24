// Appels API des commandes client (liste, détail, création, annulation et suivi GPS).
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

export interface CreatedOrderRead {
  id: number;
  montantTotal: number | null;
  payment: {
    payment?: { id?: number; fedapay_ref?: string | null };
    redirect_url?: string | null;
    currency?: string;
    token?: string | null;
  } | null;
}

// Vérifie qu’une valeur est un objet dictionnaire exploitable (hors tableaux).
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// Récupère et normalise les données pour readCreatedOrder.
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

// Regroupe les appels API du module orders.
export const ordersApi = {
  // Appelle GET /orders via le client API.
  getOrders: async (page = 1, statut?: string) => {
    const response = await apiClient.get('/orders', { params: { page, ...(statut ? { statut } : {}) } });
    return response.data;
  },

  // Appelle GET /orders/${id} via le client API.
  getOrder: async (id: number | string) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  // Appelle POST /orders via le client API.
  createOrder: async (payload: CreateOrderPayload, idempotencyKey?: string) => {
    const response = await apiClient.post('/orders', payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data;
  },

  // Appelle DELETE /orders/${id} via le client API.
  cancelOrder: async (id: number | string) => {
    const response = await apiClient.delete(`/orders/${id}`);
    return response.data;
  },

  // Appelle GET /orders/${id}/tracking via le client API.
  getTracking: async (id: number | string) => {
    const response = await apiClient.get(`/orders/${id}/tracking`);
    return response.data;
  },
};
