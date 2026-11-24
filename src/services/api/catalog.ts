// Appels API publics du catalogue : produits, catégories, packs et zones.
import { apiClient } from './client';

export interface CatalogParams {
  q?: string;
  categorie_id?: number;
  sort?: 'nom' | 'prix' | 'created_at';
  dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface ApiProduct {
  id: number;
  nom: string;
  description?: string;
  prix: number;
  prix_minimum: number;
  devise: string;
  img_url?: string;
  image_url?: string | null;
  stock?: number | null;
  disponible: boolean;
  categorie?: {
    id: number;
    nom: string;
    slug: string;
  };
}

export interface ApiCategory {
  id: number;
  nom: string;
  slug: string;
  description?: string | null;
  parent_id?: number | null;
  children?: ApiCategory[];
  icone?: string | null;
  couleur?: string | null;
  en_accueil?: boolean | null;
}

export interface ApiBundleItem {
  id: number;
  nom: string;
  prix?: number | string;
  description?: string | null;
  prix_minimum?: number | string | null;
  image_url?: string | null;
  img_url?: string | null;
  stock?: number | null;
  disponible?: boolean | null;
  categorie_id?: number | null;
  pivot?: { qte?: number | string };
}

export interface ApiBundle {
  id: number;
  nom: string;
  description?: string | null;
  prix_total: number | string;
  prix_minimum?: number | string | null;
  img_url?: string | null;
  disponible?: boolean;
  products?: ApiBundleItem[];
  produits?: ApiBundleItem[];
}

export interface ApiZone {
  id: number;
  nom: string;
  open_zone?: boolean;
  min_prix: number;
  km_prix: number;
  tarif_km: number;
  maj_heure?: string | null;
  description?: string | null;
  polygone_geo?: unknown;
  points_repere?: Array<{
    id: number;
    nom: string;
    description?: string | null;
    latitude?: number | string;
    longitude?: number | string;
  }>;
}

// Regroupe les appels API du module catalog.
export const catalogApi = {
  // Appelle GET /products via le client API.
  getProducts: async (params?: CatalogParams) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  // Appelle GET /products/${id} via le client API.
  getProduct: async (id: number | string) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  // Appelle GET /categories via le client API.
  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  // Appelle GET /bundles via le client API.
  getBundles: async () => {
    const response = await apiClient.get('/bundles');
    return response.data;
  },

  // Appelle GET /zones via le client API.
  getZones: async () => {
    const response = await apiClient.get('/zones');
    return response.data;
  },
};
