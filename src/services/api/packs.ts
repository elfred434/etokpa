import { apiClient } from './client';

/**
 * Création de packs côté CLIENT.
 *
 * État du backend (LECTURE SEULE pour nous — interdiction de le modifier) :
 * - GET  /api/bundles            : liste PUBLIQUE des packs disponibles (+ produits) ;
 * - POST /api/admin/bundles      : seule route de création, derrière `role:admin`
 *                                  → un token client y reçoit 403 ;
 * - aucune route client (POST /packs, /bundles) et pas de colonne propriétaire
 *   (user_id) sur le modèle Pack.
 *
 * Ce service vise quand même POST /admin/bundles avec le payload EXACT validé
 * par AdminBundleController@store (nom, description, prix_total, prix_minimum,
 * img_url, disponible, products[{id,qte}]) : le jour où le backend ouvre une
 * route client, il suffira de changer ENDPOINT_PACKS ci-dessous — la page
 * « Mes packs » fonctionne déjà en repli local (utils/packDrafts.ts) et affiche
 * un message clair au lieu de casser. Demande backend documentée :
 * extrait/A_FAIRE_BACKEND.txt, note 19.
 */
export const ENDPOINT_PACKS = '/admin/bundles';

/** Ligne produit du payload — `qte` comme dans AdminBundleController@store. */
export type PackProduitPayload = { id: number; qte: number };

/** Payload de création/mise à jour — calqué sur la validation backend. */
export type PackPayload = {
  nom: string;
  description: string | null;
  prix_total: number;
  prix_minimum: number | null;
  img_url: string | null;
  disponible: boolean;
  products: PackProduitPayload[];
};

export const packsApi = {
  /** GET /api/bundles — packs publics (disponibles + produits). */
  getBundles: async () => {
    const response = await apiClient.get('/bundles');
    return response.data;
  },

  /** POST — création (aujourd'hui `role:admin` ; voir commentaire en tête). */
  createBundle: async (payload: PackPayload) => {
    const response = await apiClient.post(ENDPOINT_PACKS, payload);
    return response.data;
  },

  /** PUT /{id} — mise à jour d'un pack déjà enregistré côté serveur. */
  updateBundle: async (id: number, payload: PackPayload) => {
    const response = await apiClient.put(`${ENDPOINT_PACKS}/${id}`, payload);
    return response.data;
  },
};
