import { apiClient } from './client';

export interface PointRepereItem {
  id?: number;
  user_id?: number;
  nom: string;
  quartier?: string;
  zone?: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export const landmarksApi = {
  // GET /api/landmarks -> points de repère de l'utilisateur
  getLandmarks: async () => {
    const response = await apiClient.get('/landmarks');
    return response.data;
  },

  // POST /api/landmarks -> ajouter un point de repère
  createLandmark: async (data: PointRepereItem) => {
    const response = await apiClient.post('/landmarks', data);
    return response.data;
  },

  // DELETE /api/landmarks/{id} -> supprimer un point de repère
  deleteLandmark: async (id: number | string) => {
    const response = await apiClient.delete(`/landmarks/${id}`);
    return response.data;
  },
};
