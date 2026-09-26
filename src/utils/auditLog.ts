const NOMS: Record<string, string> = {
  products: 'produit',
  categories: 'catégorie',
  bundles: 'pack',
  zones: 'zone',
  landmarks: 'point de repère',
  users: 'utilisateur',
  orders: 'commande',
  'budget-proposals': 'proposition de budget',
  cart: 'panier',
  profile: 'profil',
  notifications: 'notification',
  conversations: 'conversation',
  payments: 'paiement',
  deliveries: 'livraison',
};

const EVENEMENTS: Record<string, string> = {
  OrderStatusChanged: 'Statut de commande modifié',
  DeliveryAssigned: 'Livraison assignée',
};

/** Catégorie d'une entrée d'audit (« VERBE api/chemin » ou nom d'événement). */
export function categorie(log: { action?: string } | null | undefined): string {
  const a = String(log?.action ?? '');
  if (!a.includes(' ')) return a === 'OrderStatusChanged' || a === 'DeliveryAssigned' ? 'COMMANDE' : 'SYSTEM';
  if (/admin\/(products|categories|bundles)/.test(a)) return 'CATALOGUE';
  if (/admin\/users/.test(a)) return 'UTILISATEUR';
  if (/budget-proposals/.test(a)) return 'VALIDATION';
  if (/payments|webhooks/.test(a)) return 'PAYMENT';
  if (/admin\/(zones|landmarks)/.test(a)) return 'CONFIG';
  if (/auth\/|logout|profile/.test(a)) return 'AUTH';
  if (/orders|deliveries|cart|livreur/.test(a)) return 'COMMANDE';
  return 'SYSTEM';
}

/** Titre lisible d'une entrée d'audit. */
export function titre(log: { action?: string } | null | undefined): string {
  const a = String(log?.action ?? '');
  if (!a.includes(' ')) return EVENEMENTS[a] ?? a;
  const [verbe, chemin] = a.split(' ');
  const seg = chemin.replace(/^api\//, '').split('/');
  const ids = seg.filter((x) => /^\d+$/.test(x));
  const dernier = seg[seg.length - 1];
  if (/auth\/login/.test(chemin)) return 'Connexion (étape mot de passe)';
  if (/verify-2fa/.test(chemin)) return 'Vérification 2FA';
  if (/logout/.test(chemin)) return 'Déconnexion';
  if (dernier === 'accept') return `Course acceptée · commande #${ids[0]}`;
  if (dernier === 'refuse') return `Course refusée · commande #${ids[0]}`;
  if (dernier === 'status') return `Statut modifié · commande #${ids[0]}`;
  if (dernier === 'position') return 'Position GPS du livreur';
  if (dernier === 'read') return 'Notification lue';
  if (/budget-proposals\/\d+/.test(chemin) && verbe === 'PATCH') return `Réponse à la proposition #${ids[0]}`;
  const ressource = [...seg].reverse().find((x) => NOMS[x]);
  const nom = ressource ? NOMS[ressource] : chemin;
  const action = verbe === 'POST' ? 'Création' : verbe === 'DELETE' ? 'Suppression' : 'Modification';
  return `${action} · ${nom}${ids.length ? ` #${ids[ids.length - 1]}` : ''}`;
}

/** Détail : statut HTTP + champs envoyés (sans objets imbriqués). */
export function detail(log: { details?: { event?: string; status?: number; payload?: Record<string, unknown> } } | null | undefined): string {
  const d = log?.details ?? {};
  if (d.event) return `Événement : ${String(d.event).split('\\').pop()}`;
  const payload = d.payload && typeof d.payload === 'object' ? Object.entries(d.payload) : [];
  const champs = payload
    .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
    .slice(0, 4)
    .map(([k, v]) => `${k} : ${String(v).slice(0, 40)}`);
  return [d.status ? `HTTP ${d.status}` : null, ...champs].filter(Boolean).join(' · ') || '—';
}

/** Horodatage relatif d'un journal d'audit. */
export function quand(iso?: string | null, now = new Date()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  const hier = new Date(now);
  hier.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Aujourd'hui à ${hm}`;
  if (d.toDateString() === hier.toDateString()) return `Hier à ${hm}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function acteur(log: {
  user_id?: number;
  user?: { nom_complet?: string; prenom?: string; nom?: string; email?: string; role?: string | { nom?: string } | null } | null;
} | null | undefined): { nom: string; sous: string } {
  const u = log?.user;
  if (!u && !log?.user_id) return { nom: 'Système TOKPa', sous: 'Automatique' };
  const nom = u?.nom_complet || [u?.prenom, u?.nom].filter(Boolean).join(' ') || `Utilisateur #${log?.user_id}`;
  return { nom, sous: (typeof u?.role === 'object' ? u.role?.nom : u?.role) || u?.email || '—' };
}
