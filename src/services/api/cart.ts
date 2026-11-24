// Appels API de gestion du panier côté serveur.
import { apiClient } from './client';

export interface CartApiItem {
  product_id: number;
  nom: string;
  prix: number;
  quantite: number;
}

// Regroupe les appels API du module cart.
export const cartApi = {
  // Appelle GET /cart via le client API.
  getCart: async () => {
    const response = await apiClient.get<{ data: CartApiItem[] }>('/cart');
    return response.data;
  },

  // Appelle POST /cart/add via le client API.
  addToCart: async (productId: number, quantite = 1) => {
    const response = await apiClient.post<{ data: CartApiItem[] }>('/cart/add', {
      product_id: productId,
      quantite,
    });
    return response.data;
  },

  // Appelle PUT /cart/update via le client API.
  updateCart: async (productId: number, quantite: number) => {
    const response = await apiClient.put<{ data: CartApiItem[] }>('/cart/update', {
      product_id: productId,
      quantite,
    });
    return response.data;
  },

  // Appelle DELETE /cart/remove/${productId} via le client API.
  removeFromCart: async (productId: number) => {
    const response = await apiClient.delete<{ data: CartApiItem[] }>(`/cart/remove/${productId}`);
    return response.data;
  },
};
