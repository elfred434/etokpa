import { apiClient } from './client';

/**
 * Création de packs côté CLIENT.
 *
 * Backend `3531cc8` (commit amont `d8996cf` « Ajout de la possibilité de créé
 * des packs privé ») : la route client existe —
 * `Route::apiResource('bundles')->except(['show'])` dans routes/api.php :
 *   - GET  /api/bundles       : packs PUBLICS (disponible=true + user_id null) ;
 *   - POST /api/bundles       : création « privée » (user_id passé par le client) ;
 *   - PUT/DELETE              : routes déclarées mais MÉTHODES ABSENTES du
 *                               contrôleur (BundleController n'a que index/store).
 *
 * État vérifié EN DIRECT le 12/10/2026 (copie /opt/etokpa_back, PostgreSQL 17) :
 *   POST /api/bundles avec le contrat exact de BundleController@store →
 *   500 « SQLSTATE[42P01]: Undefined table: relation "produits" does not exist »
 *   (la validation dit `exists:produits,id` alors que la table s'appelle
 *   `products`) ; PUT /api/bundles/{id} → 500 « Method …::update does not
 *   exist ». Aucun orphelin en base (la validation plante avant l'INSERT).
 *   Bugs détaillés + correctifs proposés : A_FAIRE_BACKEND.txt note 20.
 *
 * Le front envoie donc le contrat amont EXACT (nom, description, prix_totale,
 * disponible, user_id, products[{id, quantite}]) — prêt pour le jour où le
 * backend est corrigé — et MesPacksPage retombe sur le brouillon local
 * (utils/packDrafts.ts) à la PREMIÈRE erreur serveur, quelle qu'elle soit :
 * le client ne perd jamais son pack et peut l'ajouter au panier.
 */
export const ENDPOINT_PACKS = '/bundles';

/** Ligne produit du payload — `quantite` comme dans BundleController@store (d8996cf). */
export type PackProduitPayload = { id: number; quantite: number };

/** Payload de création — calqué sur la validation de BundleController@store. */
export type PackPayload = {
  nom: string;
  description: string | null;
  /** Faute de frappe figée dans la validation amont (`prix_totale`) — voir note 20. */
  prix_totale: number;
  disponible: boolean;
  /** Propriétaire du pack privé (compte connecté) — lu côté front, voir note 20 (sécurité). */
  user_id: number | null;
  products: PackProduitPayload[];
};

export const packsApi = {
  /** GET /api/bundles — packs publics (disponibles, user_id null, + produits). */
  getBundles: async () => {
    const response = await apiClient.get('/bundles');
    return response.data;
  },

  /** POST /api/bundles — création (aujourd'hui 500 : bugs amont, note 20). */
  createBundle: async (payload: PackPayload) => {
    const response = await apiClient.post(ENDPOINT_PACKS, payload);
    return response.data;
  },

  /**
   * PUT /api/bundles/{id} — mise à jour d'un pack déjà enregistré côté serveur.
   * La route existe mais BundleController@update est absent (500 « Method does
   * not exist ») — la page retombe sur le brouillon local en attendant.
   */
  updateBundle: async (id: number, payload: PackPayload) => {
    const response = await apiClient.put(`${ENDPOINT_PACKS}/${id}`, payload);
    return response.data;
  },
};
