// Appels API de gestion des packs personnalisés du client.
import { apiClient } from './client';

export const ENDPOINT_PACKS = '/bundles';

export type PackProduitPayload = { id: number; qte: number };

export type PackPayload = {
  nom: string;
  description: string | null;
  prix_totale: number;
  disponible: boolean;
  user_id: number | null;
  products: PackProduitPayload[];
};

// Regroupe les appels API du module packs.
export const packsApi = {
  // Appelle GET /bundles via le client API.
  getBundles: async () => {
    const response = await apiClient.get('/bundles');
    return response.data;
  },

  // Enregistre ou crée les données via createBundle.
  createBundle: async (payload: PackPayload) => {
    const response = await apiClient.post(ENDPOINT_PACKS, payload);
    return response.data;
  },

  // Met à jour les données ou l’état via updateBundle.
  updateBundle: async (id: number, payload: PackPayload) => {
    const response = await apiClient.put(`${ENDPOINT_PACKS}/${id}`, payload);
    return response.data;
  },
};
