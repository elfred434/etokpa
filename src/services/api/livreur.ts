import { apiClient } from './client';

export const livreurApi = {
  // GET /api/livreur/deliveries -> courses assignees au livreur
  getDeliveries: async () => {
    const response = await apiClient.get('/livreur/deliveries');
    return response.data;
  },

  // PATCH /api/livreur/deliveries/{order}/accept
  // Corps vide. Réponse { message: "Course acceptée.", data: commande }.
  // Le statut ne change pas : la course reste assignée à ce livreur.
  acceptDelivery: async (orderId: number) => {
    const response = await apiClient.patch(`/livreur/deliveries/${orderId}/accept`);
    return response.data as { message?: string; data?: { id?: number; statut?: string; livreur_id?: number | null } };
  },

  // PATCH /api/livreur/deliveries/{order}/refuse
  // Corps vide. Le backend met livreur_id à null.
  // Réponse { message: "Course refusée, remise en file." }.
  refuseDelivery: async (orderId: number) => {
    const response = await apiClient.patch(`/livreur/deliveries/${orderId}/refuse`);
    return response.data as { message?: string };
  },

  // POST /api/livreur/position -> transmission GPS
  updatePosition: async (data: { latitude: number; longitude: number; order_id?: number }) => {
    const response = await apiClient.post('/livreur/position', data);
    return response.data;
  },

  // PATCH /api/livreur/deliveries/{order}/status -> statut de livraison (en_livraison | livre)
  updateStatus: async (orderId: number, statut: 'en_livraison' | 'livre') => {
    const response = await apiClient.patch(`/livreur/deliveries/${orderId}/status`, { statut });
    return response.data;
  },

  // GET /api/livreur/history -> historique
  getHistory: async (page = 1) => {
    const response = await apiClient.get('/livreur/history', { params: { page } });
    return response.data;
  },
};
