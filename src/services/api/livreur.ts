// Appels API réservés au livreur (courses, acceptation/refus, statuts, GPS, historique, chat).
import { apiClient } from './client';
import type { ConversationItem, MessageItem } from './chat';

// Regroupe les appels API du module livreur.
export const livreurApi = {
  // Appelle GET /livreur/deliveries via le client API.
  getDeliveries: async () => {
    const response = await apiClient.get('/livreur/deliveries');
    return response.data;
  },

  // Appelle PATCH /livreur/deliveries/${orderId}/accept via le client API.
  acceptDelivery: async (orderId: number) => {
    const response = await apiClient.patch(`/livreur/deliveries/${orderId}/accept`);
    return response.data as { message?: string; data?: { id?: number; statut?: string; livreur_id?: number | null } };
  },

  // Appelle PATCH /livreur/deliveries/${orderId}/refuse via le client API.
  refuseDelivery: async (orderId: number) => {
    const response = await apiClient.patch(`/livreur/deliveries/${orderId}/refuse`);
    return response.data as { message?: string };
  },

  // Appelle POST /livreur/position via le client API.
  updatePosition: async (data: { latitude: number; longitude: number; order_id?: number }) => {
    const response = await apiClient.post('/livreur/position', data);
    return response.data;
  },

  // Appelle PATCH /livreur/deliveries/${orderId}/status via le client API.
  updateStatus: async (orderId: number, statut: 'en_livraison' | 'livre') => {
    const response = await apiClient.patch(`/livreur/deliveries/${orderId}/status`, { statut });
    return response.data;
  },

  // Appelle GET /livreur/history via le client API.
  getHistory: async (page = 1) => {
    const response = await apiClient.get('/livreur/history', { params: { page } });
    return response.data;
  },

  // Appelle GET /livreur/conversations via le client API.
  getConversations: async () => {
    const response = await apiClient.get<{ data: ConversationItem[] }>('/livreur/conversations');
    return response.data;
  },

  // Appelle GET /livreur/conversations/${conversationId}/messages via le client API.
  getMessages: async (conversationId: number | string, page = 1) => {
    const response = await apiClient.get(`/livreur/conversations/${conversationId}/messages`, {
      params: { page },
    });
    return response.data;
  },

  // Appelle POST /livreur/conversations/${conversationId}/messages via le client API.
  sendMessage: async (conversationId: number | string, contenu: string) => {
    const response = await apiClient.post<{ data: MessageItem }>(
      `/livreur/conversations/${conversationId}/messages`,
      { contenu },
    );
    return response.data;
  },
};
