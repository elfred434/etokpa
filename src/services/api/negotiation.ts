// Appels API des propositions de budget client et acceptation de contre-propositions.
import { apiClient } from './client';

export interface CreateProposalPayload {
  product_id: number;
  prix_propose: number;
  quantite?: number;
  landmark_id?: number;
}

// Regroupe les appels API du module negotiation.
export const negotiationApi = {
  // Appelle GET /budget-proposals via le client API.
  getProposals: async (page = 1) => {
    const response = await apiClient.get('/budget-proposals', { params: { page } });
    return response.data;
  },

  // Appelle POST /budget-proposals via le client API.
  createProposal: async (payload: CreateProposalPayload) => {
    const response = await apiClient.post('/budget-proposals', payload);
    return response.data;
  },

  // Appelle PUT /budget-proposals/${id} via le client API.
  updateProposal: async (id: number | string, payload: CreateProposalPayload) => {
    const response = await apiClient.put(`/budget-proposals/${id}`, payload);
    return response.data;
  },

  // Appelle POST /budget-proposals/accept_contre-propose/${id} via le client API.
  acceptCounterProposal: async (id: number | string, payload: CreateProposalPayload) => {
    const response = await apiClient.post(`/budget-proposals/accept_contre-propose/${id}`, payload);
    return response.data;
  },
};
