// Appels API de paiement FedaPay (initialisation, consultation et historique client).
import { apiClient } from './client';

const TIMEOUT_PAIEMENTS = 30000;

export interface InitPaymentPayload {
  order_id: number;
}

export interface PaymentJson {
  id: number;
  order_id?: number;
  montant?: number;
  methode?: string;
  statut?: 'en_attente' | 'reussi' | 'echoue' | 'rembourse' | string;
  fedapay_ref?: string | null;
  recu_url?: string | null;
  paid_at?: string | null;
}

export interface InitPaymentResponse {
  payment?: PaymentJson;
  token?: string | null;
  redirect_url?: string | null;
  currency?: string;
}

// Regroupe les appels API du module payments.
export const paymentsApi = {
  // Appelle POST /payments/init via le client API.
  initPayment: async (payload: InitPaymentPayload, idempotencyKey?: string) => {
    const response = await apiClient.post('/payments/init', payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data;
  },

  // Appelle GET /payments/${id} via le client API.
  getPayment: async (id: number | string) => {
    const response = await apiClient.get(`/payments/${id}`, { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },

  // Appelle GET /payments via le client API.
  listMine: async () => {
    const response = await apiClient.get('/payments', { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },

  // Appelle GET /admin/payments via le client API.
  listAll: async () => {
    const response = await apiClient.get('/admin/payments', { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },

  // Appelle GET /admin/clients/payments via le client API.
  listOwnAsAdmin: async () => {
    const response = await apiClient.get('/admin/clients/payments', { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },
};
