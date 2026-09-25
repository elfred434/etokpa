import { redirect, type AnyRouter } from '@tanstack/react-router';
import toast from 'react-hot-toast';

/**
 * Garde de connexion (décision du 24/09) : sans session, toute page redirige vers /connexion,
 * SAUF l'accueil et les écrans d'authentification (sinon boucle de redirection).
 * Session = token Sanctum dans le localStorage ; sa validité réelle est vérifiée par l'API
 * (401 → services/api/client.ts émet `tokpa:session-expired`).
 */
export const PUBLIC_PATHS: readonly string[] = [
  '/',
  '/connexion',
  '/inscription',
  '/verification-2fa',
  '/reset-password',
];

const AUTH_TOAST_ID = 'auth-required';
const ROLE_TOAST_ID = 'role-denied';

/** Rôles du backend (App\Models\Role). super_admin passe toutes les gardes (Utilisateur::hasRole). */
export type AppRole = 'super_admin' | 'admin' | 'manager' | 'livreur' | 'client';

/** Pages de l'espace client (routes/router.tsx) — données servies par le groupe `role:client` du backend. */
const CLIENT_PAGES = [
  '/catalogue',
  '/produit',
  '/panier',
  '/confirmation',
  '/profil',
  '/negociations',
  '/commandes',
  '/messagerie',
  '/notifications',
];

const normPath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/** Chemin public ? (tolère un « / » final : /connexion/ = /connexion). */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(normPath(pathname));
}

/** Une session est-elle ouverte côté front ? */
export function hasSession(): boolean {
  return !!localStorage.getItem('tokpa_token');
}

/** Rôle de l'utilisateur connecté (tokpa_user.role = chaîne ou objet { nom } selon la réponse 2FA). */
export function currentRole(): string | null {
  try {
    const raw = localStorage.getItem('tokpa_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { role?: string | { nom?: string } | null };
    const role = typeof u.role === 'string' ? u.role : u.role?.nom;
    return role || null;
  } catch {
    return null;
  }
}

/** Espace de chaque rôle : arrivée après connexion (sans page demandée) et renvoi si accès refusé. */
export function homeForRole(role: string | null): '/admin' | '/manager' | '/' {
  if (role === 'admin' || role === 'super_admin') return '/admin';
  if (role === 'manager') return '/manager';
  return '/'; // client, livreur (pas encore d'interface livreur), rôle inconnu
}

/**
 * Rôles autorisés pour une page, calqués sur les droits du backend (routes/api.php + RoleGuard :
 * super_admin passe partout). null = toute personne connectée (ex. /preview, adresse inconnue → 404).
 */
export function pageRoles(pathname: string): { roles: AppRole[]; label: string } | null {
  const p = normPath(pathname);
  if (under(p, '/admin')) return { roles: ['admin', 'super_admin'], label: 'aux administrateurs' };
  if (under(p, '/manager')) return { roles: ['manager', 'super_admin'], label: 'aux managers' };
  if (under(p, '/livreur')) return { roles: ['livreur', 'super_admin'], label: 'aux livreurs' };
  if (CLIENT_PAGES.some((b) => under(p, b))) return { roles: ['client', 'super_admin'], label: 'aux clients' };
  return null;
}

/** Ce rôle peut-il ouvrir cette page ? (pages publiques : toujours) */
export function canAccess(pathname: string, role: string | null): boolean {
  if (isPublicPath(pathname)) return true;
  const rule = pageRoles(pathname);
  return !rule || (role !== null && (rule.roles as string[]).includes(role));
}

/**
 * beforeLoad de la route racine : exécuté avant tout rendu, donc la page refusée n'est jamais
 * affichée et ses appels API ne partent pas. Toute nouvelle route est protégée par défaut.
 *  1. pas de session → /connexion ;
 *  2. mauvais rôle → espace de son rôle (« Accès refusé »).
 */
export function guardRoute({ location, preload }: { location: { pathname: string }; preload: boolean }): void {
  if (isPublicPath(location.pathname)) return;
  if (!hasSession()) {
    if (!preload) toast.error('Veuillez vous connecter pour accéder à cette page.', { id: AUTH_TOAST_ID });
    throw redirect({ to: '/connexion', replace: true });
  }
  const role = currentRole();
  const rule = pageRoles(location.pathname);
  if (rule && !(role !== null && (rule.roles as string[]).includes(role))) {
    if (!preload) toast.error(`Accès refusé : cette page est réservée ${rule.label}.`, { id: ROLE_TOAST_ID });
    throw redirect({ to: homeForRole(role), replace: true });
  }
}

/**
 * Session perdue en cours de navigation (401 : token expiré au bout de 24 h, révoqué, ou base
 * réinitialisée) → retour à la connexion, sauf si l'on est sur une page publique.
 */
export function redirectOnSessionExpired(router: AnyRouter): () => void {
  const onExpired = () => {
    if (isPublicPath(router.state.location.pathname)) return;
    toast.error('Session expirée : veuillez vous reconnecter.', { id: AUTH_TOAST_ID });
    void router.navigate({ to: '/connexion', replace: true });
  };
  window.addEventListener('tokpa:session-expired', onExpired);
  return () => window.removeEventListener('tokpa:session-expired', onExpired);
}
