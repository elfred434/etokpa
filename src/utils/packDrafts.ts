/**
 * Packs créés par le CLIENT, enregistrés sur l'appareil (localStorage).
 *
 * Pourquoi du stockage local ? Côté backend (lecture seule pour nous), la seule
 * route de création de packs est POST /api/admin/bundles derrière `role:admin` :
 * un client y reçoit 403 et le modèle `Pack` n'a pas de colonne propriétaire
 * (pas de user_id). En attendant l'ouverture d'une route client
 * (voir extrait/A_FAIRE_BACKEND.txt, note 19), la page « Mes packs »
 * (pages/client/mes-packs/MesPacksPage.tsx) :
 *  1. tente l'enregistrement serveur avec le contrat EXACT de
 *     AdminBundleController@store — prêt pour le jour où la route s'ouvre ;
 *  2. en cas de 403/404/405, conserve le pack ici (brouillon) sans rien perdre :
 *     il reste modifiable, supprimable et surtout AJOUTABLE AU PANIER
 *     (le panier ne connaît que des produits : on y met les lignes du pack).
 *
 * Chaque brouillon garde un instantané complet de ses produits (nom, prix,
 * stock, disponibilité, image) pour que la galerie et le panier fonctionnent
 * même hors ligne ou si le catalogue change.
 */

export type PackDraftProduit = {
  id: number;
  qte: number;
  nom: string;
  prix: number;
  description: string | null;
  image_url: string | null;
  stock: number;
  disponible: boolean;
};

export type PackDraft = {
  /** Identifiant local (préfixe `d` + horodatage) — clé d'upsert. */
  localId: string;
  /** Id serveur (`packs.id`) si l'API a accepté le pack ; null = brouillon local. */
  serverId: number | null;
  nom: string;
  description: string | null;
  prix_total: number;
  prix_minimum: number | null;
  img_url: string | null;
  disponible: boolean;
  produits: PackDraftProduit[];
  createdAt: string;
  /** Date du dernier enregistrement ACCEPTÉ par le serveur (null = jamais). */
  syncedAt: string | null;
};

const KEY = 'tokpa_mes_packs_v1';

function lire(): PackDraft[] {
  try {
    const brut = window.localStorage.getItem(KEY);
    if (!brut) return [];
    const parsed = JSON.parse(brut);
    if (!Array.isArray(parsed)) return [];
    // Tolérance : ne garder que les entrées exploitables (nom + produits).
    return parsed.filter(
      (d): d is PackDraft =>
        Boolean(d) &&
        typeof d === 'object' &&
        typeof (d as PackDraft).localId === 'string' &&
        typeof (d as PackDraft).nom === 'string' &&
        Array.isArray((d as PackDraft).produits),
    );
  } catch {
    return [];
  }
}

function ecrire(liste: PackDraft[]): PackDraft[] {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(liste));
  } catch {
    // Stockage plein/indisponible : la liste en mémoire reste utilisable.
  }
  return liste;
}

/** Liste des packs de l'appareil, du plus récent au plus ancien. */
export function listPackDrafts(): PackDraft[] {
  return lire().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Crée ou remplace un pack (même `localId`) ; renvoie la liste à jour. */
export function savePackDraft(draft: PackDraft): PackDraft[] {
  const liste = lire();
  const i = liste.findIndex((d) => d.localId === draft.localId);
  if (i >= 0) liste[i] = draft;
  else liste.push(draft);
  return ecrire(liste);
}

/** Supprime un pack local ; renvoie la liste à jour. */
export function deletePackDraft(localId: string): PackDraft[] {
  return ecrire(lire().filter((d) => d.localId !== localId));
}
