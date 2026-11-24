// Helpers de chargement et de formatage des livraisons et de l’historique livreur.
import { authApi, catalogApi, livreurApi } from '../../services/api';
import { uiLang } from '../../i18n/tx';
import { listOf, unwrap } from '../../services/api/unwrap';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LivreurOrderItem {
  id: number;
  product_id?: number | null;
  nom?: string | null;
  quantite: number;
  prix_unitaire: number;
}

export interface LivreurOrder {
  id: number;
  montant_total: number;
  frais_livraison: number;
  statut: string;
  description_lieu?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: LivreurOrderItem[];
  landmark?: { id?: number; nom?: string | null; zone_id?: number | null } | null;
}

// Helper unwrapOrder : réalise le traitement métier associé.
export const unwrapOrder = (r: any): LivreurOrder => {
  const order = (r?.data && typeof r.data === 'object' && 'id' in r.data ? r.data : r) as LivreurOrder;
  return { ...order, id: Number(order?.id) };
};

// Helper tokRef : réalise le traitement métier associé.
export const tokRef = (id: number | string) => `#TOK-${id}`;

export const STATUT_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livre: 'Livré',
  annule: 'Annulé',
};

const STATUT_LABEL_EN: Record<string, string> = {
  en_attente: 'Pending',
  en_preparation: 'Preparing',
  en_livraison: 'Out for delivery',
  livre: 'Delivered',
  annule: 'Cancelled',
};

// Helper statutLabel : réalise le traitement métier associé.
export const statutLabel = (s: string) =>
  (uiLang() !== 'fr' ? STATUT_LABEL_EN[s] : STATUT_LABEL[s]) ?? STATUT_LABEL[s] ?? s;

// Helper destination : réalise le traitement métier associé.
export const destination = (o: LivreurOrder) =>
  [o.landmark?.nom, o.description_lieu].filter(Boolean).join(' — ') ||
  (uiLang() !== 'fr' ? 'Destination not provided' : 'Destination non renseignée');

// Helper articlesCount : réalise le traitement métier associé.
export const articlesCount = (o: LivreurOrder) => (o.items ?? []).reduce((s, it) => s + Number(it.quantite ?? 0), 0);

// Helper dateHeure : réalise le traitement métier associé.
export function dateHeure(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

// Récupère et normalise les données pour fetchDeliveries.
export async function fetchDeliveries(): Promise<LivreurOrder[]> {
  return listOf(await livreurApi.getDeliveries()).map(unwrapOrder);
}

// Récupère et normalise les données pour fetchAllHistory.
export async function fetchAllHistory(maxPages = 25): Promise<{ orders: LivreurOrder[]; total: number; capped: boolean }> {
  const orders: LivreurOrder[] = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    const res: any = await livreurApi.getHistory(page);
    orders.push(...listOf(res).map(unwrapOrder));
    total = Number(res?.meta?.total ?? orders.length);
    if (page >= Number(res?.meta?.last_page ?? 1)) return { orders, total, capped: false };
  }
  return { orders, total, capped: true };
}

// Récupère et normalise les données pour fetchZoneNames.
export async function fetchZoneNames(): Promise<Map<number, string>> {
  const list = listOf(unwrap(await catalogApi.getZones()));
  return new Map(list.map((z: any) => [Number(z.id), String(z.nom ?? '—')]));
}

export interface LivreurProfile {
  id?: number;
  nom?: string;
  prenom?: string;
  nom_complet?: string;
  email?: string;
  telephone?: string | null;
  image_profil?: string | null;
  disponible: boolean | null;
  zone: string | null;
}

let profileCache: { at: number; value: LivreurProfile } | null = null;

// Récupère et normalise les données pour fetchLivreurProfile.
export async function fetchLivreurProfile(force = false): Promise<LivreurProfile> {
  if (!force && profileCache && Date.now() - profileCache.at < 60_000) return profileCache.value;
  const u: any = unwrap(await authApi.getProfile());
  const profil = u?.profil ?? {};
  const value: LivreurProfile = {
    id: u?.id,
    nom: u?.nom,
    prenom: u?.prenom,
    nom_complet: u?.nom_complet,
    email: u?.email,
    telephone: u?.telephone ?? null,
    image_profil: u?.image_profil ?? null,
    disponible: profil?.disponibilite == null ? null : Boolean(profil.disponibilite),
    zone: profil?.zone?.nom ?? null,
  };
  profileCache = { at: Date.now(), value };
  return value;
}

// Helper forgetLivreurProfile : réalise le traitement métier associé.
export function forgetLivreurProfile() {
  profileCache = null;
}
