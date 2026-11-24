// Appels API CRUD des points de repère enregistrés par le client.
import { apiClient } from './client';

export interface PointRepereZone {
  id?: number;
  nom?: string;
  km_prix?: number | string;
}

export interface PointRepereItem {
  id?: number;
  user_id?: number;
  nom: string;
  description?: string;
  latitude?: number | string;
  longitude?: number | string;
  zone_id?: number;
  zone?: PointRepereZone | null;
}

// Regroupe les appels API du module landmarks.
export const landmarksApi = {
  // Appelle GET /landmarks via le client API.
  getLandmarks: async () => {
    const response = await apiClient.get('/landmarks');
    return response.data;
  },

  // Appelle POST /landmarks via le client API.
  createLandmark: async (data: PointRepereItem) => {
    const response = await apiClient.post('/landmarks', data);
    return response.data;
  },

  // Appelle DELETE /landmarks/${id} via le client API.
  deleteLandmark: async (id: number | string) => {
    const response = await apiClient.delete(`/landmarks/${id}`);
    return response.data;
  },
};
