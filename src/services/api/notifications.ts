// Appels API de consultation et marquage comme lues des notifications utilisateur.
import { apiClient } from './client';

export interface ApiNotification {
  id: string | number;
  user_id: number;
  type: string;
  data: {
    title?: string;
    message?: string;
    [key: string]: unknown;
  };
  lu?: boolean;
  read_at: string | null;
  created_at: string;
}

// Regroupe les appels API du module notifications.
export const notificationsApi = {
  // Appelle GET /notifications via le client API.
  getNotifications: async (page = 1) => {
    const response = await apiClient.get('/notifications', { params: { page } });
    return response.data;
  },

  // Appelle PATCH /notifications/${notificationId}/read via le client API.
  markRead: async (notificationId: string | number) => {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },
};
