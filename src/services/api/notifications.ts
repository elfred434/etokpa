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
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  // GET /api/notifications -> liste paginee des notifications
  getNotifications: async (page = 1) => {
    const response = await apiClient.get('/notifications', { params: { page } });
    return response.data;
  },

  // PATCH /api/notifications/{id}/read -> marquer comme lue
  markRead: async (notificationId: string | number) => {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },
};
