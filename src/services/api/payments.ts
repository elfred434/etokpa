import { apiClient } from './client';

/**
 * Délai spécifique aux lectures de paiements.
 *
 * Ces routes interrogent FedaPay une fois par paiement en attente côté serveur
 * (voir NOTE_22) : leur durée augmente avec le nombre de paiements. Le délai
 * global de 10 s est trop court dès que la connexion à FedaPay est lente, ce
 * qui produisait « timeout of 10000ms exceeded » sur la page Paiements.
 * Le vrai correctif est côté serveur (patch fourni) ; ce délai évite l'échec
 * immédiat en attendant.
 */
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

export const paymentsApi = {
  // POST /api/payments/init -> initialise le paiement FedaPay
  initPayment: async (payload: InitPaymentPayload, idempotencyKey?: string) => {
    const response = await apiClient.post('/payments/init', payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data;
  },

  // GET /api/payments/{id} -> détails du paiement
  getPayment: async (id: number | string) => {
    const response = await apiClient.get(`/payments/${id}`, { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },

  // GET /api/payments -> paiements du compte connecté
  listMine: async () => {
    const response = await apiClient.get('/payments', { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },

  // GET /api/admin/payments -> tous les paiements
  listAll: async () => {
    const response = await apiClient.get('/admin/payments', { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },

  // GET /api/admin/clients/payments -> paiements du compte connecté, côté admin
  listOwnAsAdmin: async () => {
    const response = await apiClient.get('/admin/clients/payments', { timeout: TIMEOUT_PAIEMENTS });
    return response.data;
  },
};
