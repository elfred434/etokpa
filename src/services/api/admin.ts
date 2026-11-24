// Appels API réservés à l’administration (catalogue, zones, utilisateurs, commandes, négociations, paiements, logs).
import { apiClient } from './client';
import { unwrap } from './unwrap';

export type AdminOrderStatus = 'en_attente' | 'en_preparation' | 'en_livraison' | 'livre' | 'annule';

// Regroupe les appels API du module admin.
export const adminApi = {
  // Appelle GET /admin/products via le client API.
  getProducts: async (params?: Record<string, unknown> | number) => {
    const response = await apiClient.get('/admin/products', {
      params: typeof params === 'number' ? { page: params } : (params ?? {}),
    });
    return response.data;
  },
  // Appelle GET /admin/products/${id} via le client API.
  getProduct: async (id: number | string) => {
    const response = await apiClient.get(`/admin/products/${id}`);
    return response.data;
  },
  // Appelle POST /admin/products via le client API.
  createProduct: async (formData: FormData | Record<string, unknown>) => {
    if (formData instanceof FormData) {
      const response = await apiClient.post('/admin/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        adapter: 'fetch',
        timeout: 60000,
      });
      return response.data;
    }
    const response = await apiClient.post('/admin/products', formData);
    return response.data;
  },
  // Appelle POST /admin/products/${id} via le client API.
  updateProduct: async (id: number | string, formData: FormData | Record<string, unknown>) => {
    if (formData instanceof FormData) {
      if (!formData.has('_method')) formData.append('_method', 'PUT');
      const response = await apiClient.post(`/admin/products/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-HTTP-Method-Override': 'PUT',
        },
        adapter: 'fetch',
        timeout: 60000,
      });
      return response.data;
    }
    const response = await apiClient.put(`/admin/products/${id}`, formData);
    return response.data;
  },
  // Appelle DELETE /admin/products/${id} via le client API.
  deleteProduct: async (id: number | string) => {
    const response = await apiClient.delete(`/admin/products/${id}`);
    return response.data;
  },

  // Appelle GET /admin/categories via le client API.
  getCategories: async () => {
    const response = await apiClient.get('/admin/categories');
    return response.data;
  },
  // Appelle POST /admin/categories via le client API.
  createCategory: async (data: { nom: string; description?: string; parent_id?: number; icone?: string; couleur?: string; en_accueil?: boolean }) => {
    const response = await apiClient.post('/admin/categories', data);
    return response.data;
  },
  // Appelle PUT /admin/categories/${id} via le client API.
  updateCategory: async (id: number, data: { nom?: string; description?: string; parent_id?: number; icone?: string; couleur?: string; en_accueil?: boolean }) => {
    const response = await apiClient.put(`/admin/categories/${id}`, data);
    return response.data;
  },
  // Appelle DELETE /admin/categories/${id} via le client API.
  deleteCategory: async (id: number) => {
    const response = await apiClient.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // Appelle GET /admin/bundles via le client API.
  getBundles: async () => {
    const response = await apiClient.get('/admin/bundles');
    return response.data;
  },
  // Appelle POST /admin/bundles via le client API.
  createBundle: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/admin/bundles', data);
    return response.data;
  },
  // Appelle PUT /admin/bundles/${id} via le client API.
  updateBundle: async (id: number, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/admin/bundles/${id}`, data);
    return response.data;
  },
  // Appelle DELETE /admin/bundles/${id} via le client API.
  deleteBundle: async (id: number) => {
    const response = await apiClient.delete(`/admin/bundles/${id}`);
    return response.data;
  },

  // Appelle GET /admin/zones via le client API.
  getZones: async () => {
    const response = await apiClient.get('/admin/zones');
    return response.data;
  },
  // Appelle POST /admin/zones via le client API.
  createZone: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/admin/zones', data);
    return response.data;
  },
  // Appelle PUT /admin/zones/${id} via le client API.
  updateZone: async (id: number, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/admin/zones/${id}`, data);
    return response.data;
  },
  // Appelle DELETE /admin/zones/${id} via le client API.
  deleteZone: async (id: number) => {
    const response = await apiClient.delete(`/admin/zones/${id}`);
    return response.data;
  },

  // Appelle GET /admin/landmarks via le client API.
  getLandmarks: async () => {
    const response = await apiClient.get('/admin/landmarks');
    return response.data;
  },
  // Appelle POST /admin/landmarks via le client API.
  createLandmark: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/admin/landmarks', data);
    return response.data;
  },
  // Appelle PUT /admin/landmarks/${id} via le client API.
  updateLandmark: async (id: number, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/admin/landmarks/${id}`, data);
    return response.data;
  },
  // Appelle DELETE /admin/landmarks/${id} via le client API.
  deleteLandmark: async (id: number) => {
    const response = await apiClient.delete(`/admin/landmarks/${id}`);
    return response.data;
  },

  // Appelle GET /admin/users via le client API.
  getUsers: async (params?: { role?: string; page?: number; per_page?: number }) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },
  // Appelle POST /admin/users via le client API.
  createUser: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/admin/users', data);
    return response.data;
  },
  // Appelle PUT /admin/users/${id} via le client API.
  updateUser: async (id: number, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/admin/users/${id}`, data);
    return response.data;
  },
  // Appelle DELETE /admin/users/${id} via le client API.
  deleteUser: async (id: number) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },
  // Appelle POST /admin/users/${id}/managers via le client API.
  promoteAsManager: async (id: number, data: { zone_id: number; heure_debut?: string; heure_fin?: string }) => {
    const response = await apiClient.post(`/admin/users/${id}/managers`, data);
    return response.data;
  },
  // Appelle POST /admin/users/${id}/admins via le client API.
  promoteAsAdmin: async (id: number) => {
    const response = await apiClient.post(`/admin/users/${id}/admins`);
    return response.data;
  },
  // Appelle PUT /admin/users/${id} via le client API.
  setManagerZone: async (id: number, zoneId: number) => {
    const updated = (await apiClient.put(`/admin/users/${id}`, { zone_id: zoneId })).data;
    const user = unwrap(updated) as { profil?: { zone_id?: number; zone?: { id?: number } } };
    const saved = Number(user?.profil?.zone_id ?? user?.profil?.zone?.id ?? 0);
    if (saved === zoneId) return updated;
    const created = (await apiClient.post(`/admin/users/${id}/managers`, { zone_id: zoneId })).data;
    return created;
  },

  // Appelle GET /admin/budget-proposals via le client API.
  getProposals: async (params?: { statut?: string; page?: number }) => {
    const response = await apiClient.get('/admin/budget-proposals', { params });
    return response.data;
  },
  // Appelle PATCH /admin/budget-proposals/${id} via le client API.
  respondProposal: async (
    id: number,
    data: { decision: 'accepte' | 'refuse'; admin_response?: string; landmark_id?: number }
  ) => {
    const response = await apiClient.patch(`/admin/budget-proposals/${id}`, data);
    return response.data;
  },

  // Appelle GET /admin/orders via le client API.
  getOrders: async (params?: { statut?: string; zone_id?: number; page?: number }) => {
    const response = await apiClient.get('/admin/orders', { params });
    return response.data;
  },
  // Appelle PATCH /admin/orders/${orderId}/status via le client API.
  updateOrderStatus: async (orderId: number, statut: AdminOrderStatus) => {
    const response = await apiClient.patch(`/admin/orders/${orderId}/status`, { statut });
    return response.data;
  },
  // Appelle POST /admin/assign via le client API.
  assignLivreur: async (orderId: number, livreurId: number) => {
    const response = await apiClient.post('/admin/assign', {
      order_id: orderId,
      livreur_id: livreurId,
    });
    return response.data;
  },

  // Appelle GET /admin/dashboard via le client API.
  getDashboard: async () => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },
  // Appelle GET /admin/audit-logs via le client API.
  getAuditLogs: async (params?: { action?: string; user_id?: number; from?: string; page?: number }) => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },
};
