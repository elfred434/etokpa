import { apiClient } from './client';

export interface InitPaymentPayload {
  order_id: number;
}

export const paymentsApi = {
  // POST /api/payments/init -> initialise le paiement FedaPay
  initPayment: async (payload: InitPaymentPayload) => {
    const response = await apiClient.post('/payments/init', payload);
    return response.data;
  },

  // GET /api/payments/{id} -> détails du paiement
  getPayment: async (id: number | string) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },
};
