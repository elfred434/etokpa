// Appels API réservés au manager de zone (commandes, assignation, livreurs, statistiques).
import { apiClient } from './client';

// Regroupe les appels API du module manager.
export const managerApi = {
  // Appelle GET /manager/orders via le client API.
  getOrders: async (params?: { statut?: string; page?: number }) => {
    const response = await apiClient.get('/manager/orders', { params });
    return response.data;
  },

  // Appelle POST /manager/assign via le client API.
  assignLivreur: async (orderId: number, livreurId: number) => {
    const response = await apiClient.post('/manager/assign', {
      order_id: orderId,
      livreur_id: livreurId,
    });
    return response.data;
  },

  // Appelle GET /manager/livreurs via le client API.
  getLivreurs: async () => {
    const response = await apiClient.get('/manager/livreurs');
    return response.data;
  },

  // Appelle GET /manager/stats via le client API.
  getStats: async (period: 'jour' | 'semaine' | 'mois' = 'jour') => {
    const response = await apiClient.get('/manager/stats', { params: { period } });
    return response.data;
  },
};
