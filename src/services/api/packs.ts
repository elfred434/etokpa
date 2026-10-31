import { apiClient } from './client';

/**
 * API des packs côté client.
 *
 * Contrat observé sur le backend `6a00098` : `POST`/`PUT /api/bundles`
 * valident `products[].qte`; la couche UI mappe donc sa quantité locale vers
 * `qte` ici. `prix_totale` reste le nom du champ reçu par le contrôleur.
 *
 * L’API conserve le brouillon local à la moindre erreur réseau/serveur, afin
 * qu’un pack non synchronisé ne soit pas perdu. Ce repli frontend ne remplace
 * pas les contrôles de propriété qui doivent être faits côté backend : les
 * problèmes `user_id`/IDOR de la note 20 restent à corriger côté serveur.
 */
export const ENDPOINT_PACKS = '/bundles';

/** Ligne produit du payload — `qte`, validé par `BundleController@store`. */
export type PackProduitPayload = { id: number; qte: number };

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

  /** POST /api/bundles — création avec les quantités `products[].qte`. */
  createBundle: async (payload: PackPayload) => {
    const response = await apiClient.post(ENDPOINT_PACKS, payload);
    return response.data;
  },

  /**
   * PUT /api/bundles/{id} — mise à jour d'un pack déjà enregistré côté serveur.
   * Transmet le même contrat `products[].qte`; l’autorisation de propriété doit
   * être garantie par le backend (dette connue, non corrigée ici).
   */
  updateBundle: async (id: number, payload: PackPayload) => {
    const response = await apiClient.put(`${ENDPOINT_PACKS}/${id}`, payload);
    return response.data;
  },
};
