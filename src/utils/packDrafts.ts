
// Sauvegarde et gère localement les brouillons de packs personnalisés.
export type PackDraftProduit = {
  id: number;
  qte: number;
  nom: string;
  prix: number;
  description: string | null;
  image_url: string | null;
  stock?: number | null;
  disponible: boolean;
};

export type PackDraft = {
  localId: string;
  serverId: number | null;
  nom: string;
  description: string | null;
  prix_total: number;
  prix_minimum: number | null;
  img_url: string | null;
  disponible: boolean;
  produits: PackDraftProduit[];
  createdAt: string;
  syncedAt: string | null;
};

const KEY = 'tokpa_mes_packs_v1';

// Récupère et normalise les données pour lire.
function lire(): PackDraft[] {
  try {
    const brut = window.localStorage.getItem(KEY);
    if (!brut) return [];
    const parsed = JSON.parse(brut);
    if (!Array.isArray(parsed)) return [];
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

// Helper ecrire : réalise le traitement métier associé.
function ecrire(liste: PackDraft[]): PackDraft[] {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(liste));
  } catch {
  }
  return liste;
}

// Helper listPackDrafts : réalise le traitement métier associé.
export function listPackDrafts(): PackDraft[] {
  return lire().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Enregistre ou crée les données via savePackDraft.
export function savePackDraft(draft: PackDraft): PackDraft[] {
  const liste = lire();
  const i = liste.findIndex((d) => d.localId === draft.localId);
  if (i >= 0) liste[i] = draft;
  else liste.push(draft);
  return ecrire(liste);
}

// Supprime ou nettoie les éléments via deletePackDraft.
export function deletePackDraft(localId: string): PackDraft[] {
  return ecrire(lire().filter((d) => d.localId !== localId));
}
