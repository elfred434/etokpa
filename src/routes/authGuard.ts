// Garde de navigation côté client : vérifie la session, le rôle utilisateur et les redirections autorisées.
import { useEffect, useState } from 'react';
import { redirect, type AnyRouter } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { tr, tx } from '../i18n/tx';

export const PUBLIC_PATHS: readonly string[] = [
  '/',
  '/connexion',
  '/login',
  '/inscription',
  '/verification-2fa',
  '/reset-password',
  '/profil',
  '/catalogue',
];

const AUTH_TOAST_ID = 'auth-required';
const ROLE_TOAST_ID = 'role-denied';
const REDIRECT_KEY = 'tokpa_redirect';

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'livreur' | 'client';

// Normalise un chemin URL en retirant les slashs finaux.
const normPath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
// Vérifie si un chemin correspond à une route de base ou à un sous-chemin.
const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

// Vérifie la condition métier isPublicPath.
export function isPublicPath(pathname: string): boolean {
  const path = normPath(pathname);
  if (path === '/produit' || path.startsWith('/produit/')) return true;
  return PUBLIC_PATHS.includes(path);
}

// Vérifie la condition métier hasSession.
export function hasSession(): boolean {
  return !!localStorage.getItem('tokpa_token');
}

// Hook React useAuthRevision : encapsule l’état et les effets associés.
export function useAuthRevision(): number {
  const [rev, setRev] = useState(0);
  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    if (!hasSession() && localStorage.getItem('tokpa_user')) {
      localStorage.removeItem('tokpa_user');
    }
    const bump = () => setRev((n) => n + 1);
    window.addEventListener('tokpa:auth-changed', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('tokpa:auth-changed', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);
  return rev;
}

type StoredUser = {
  id?: number;
  nom_complet?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  image_profil?: string | null;
  role?: string | { nom?: string } | null;
  profil?: { zone_id?: number; zone?: { id?: number; nom?: string } | null } | null;
};
// Lit et décode l’utilisateur connecté depuis localStorage.
function storedUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('tokpa_user');
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

// Helper currentRole : réalise le traitement métier associé.
export function currentRole(): string | null {
  if (!hasSession()) return null;
  const u = storedUser();
  const role = typeof u?.role === 'string' ? u.role : u?.role?.nom;
  return role || null;
}

// Vérifie la condition métier isAdminRole.
export function isAdminRole(role: string | null = currentRole()): boolean {
  return role === 'admin' || role === 'super_admin';
}

// Helper currentUserName : réalise le traitement métier associé.
export function currentUserName(): string | null {
  const u = storedUser();
  const fromParts = [u?.prenom, u?.nom]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');
  const nom = fromParts || (typeof u?.nom_complet === 'string' ? u.nom_complet.trim() : '');
  return nom || null;
}

// Helper currentUserId : réalise le traitement métier associé.
export function currentUserId(): number | null {
  const id = Number(storedUser()?.id);
  return id > 0 ? id : null;
}

// Helper currentUserPhone : réalise le traitement métier associé.
export function currentUserPhone(): string | null {
  const tel = storedUser()?.telephone;
  return typeof tel === 'string' && tel.trim() ? tel.trim() : null;
}

// Helper currentUserZone : réalise le traitement métier associé.
export function currentUserZone(): string | null {
  return storedUser()?.profil?.zone?.nom || null;
}

// Helper managerZoneLabel : réalise le traitement métier associé.
export function managerZoneLabel(): string {
  const zone = currentUserZone();
  if (zone) return `Zone ${zone}`;
  return isAdminRole() ? tx('Toutes les zones') : tx('Zone non attribuée');
}

// Helper rememberUserZone : réalise le traitement métier associé.
export function rememberUserZone(zoneId: number, nom?: string) {
  try {
    const raw = localStorage.getItem('tokpa_user');
    const u = raw ? JSON.parse(raw) as StoredUser : {};
    const profil = u.profil && typeof u.profil === 'object' ? u.profil : {};
    u.profil = {
      ...profil,
      zone_id: zoneId,
      zone: { ...(profil.zone ?? {}), id: zoneId, nom: nom || profil.zone?.nom },
    };
    localStorage.setItem('tokpa_user', JSON.stringify(u));
  } catch {
  }
}

// Helper rememberSessionUser : réalise le traitement métier associé.
export function rememberSessionUser(patch: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem('tokpa_user');
    const current = raw ? (JSON.parse(raw) as StoredUser & Record<string, unknown>) : {};
    const next: StoredUser & Record<string, unknown> = { ...current, ...patch };
    const fromParts = [next.prenom, next.nom]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ');
    if (('prenom' in patch || 'nom' in patch) && fromParts && !('nom_complet' in patch)) {
      next.nom_complet = fromParts;
    }
    const serialized = JSON.stringify(next);
    if (serialized === raw) return;
    localStorage.setItem('tokpa_user', serialized);
    window.dispatchEvent(new Event('tokpa:auth-changed'));
  } catch {
  }
}

// Helper initialsOf : réalise le traitement métier associé.
export function initialsOf(nom: string | null, fallback = '?'): string {
  const parts = (nom ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') : fallback;
}

// Helper staffSpace : réalise le traitement métier associé.
export function staffSpace(role: string | null): { to: '/admin' | '/manager' | '/livreur'; icon: string; label: string } | null {
  if (role === 'admin' || role === 'super_admin') return { to: '/admin', icon: 'admin_panel_settings', label: 'Mon espace admin' };
  if (role === 'manager') return { to: '/manager', icon: 'supervisor_account', label: 'Mon espace manager' };
  if (role === 'livreur') return { to: '/livreur', icon: 'two_wheeler', label: 'Mon espace livreur' };
  return null;
}

// Helper homeForRole : réalise le traitement métier associé.
export function homeForRole(role: string | null): '/admin' | '/manager' | '/livreur' | '/' {
  if (role === 'admin' || role === 'super_admin') return '/admin';
  if (role === 'manager') return '/manager';
  if (role === 'livreur') return '/livreur';
  return '/';
}

// Helper pageRoles : réalise le traitement métier associé.
export function pageRoles(pathname: string): { roles: AppRole[]; label: string } | null {
  const p = normPath(pathname);
  if (under(p, '/admin')) return { roles: ['admin', 'super_admin'], label: 'aux administrateurs' };
  if (under(p, '/manager')) return { roles: ['manager', 'admin', 'super_admin'], label: 'aux managers et aux administrateurs' };
  if (under(p, '/livreur')) return { roles: ['livreur'], label: 'aux livreurs' };
  return null;
}

// Vérifie la condition métier canAccess.
export function canAccess(pathname: string, role: string | null): boolean {
  if (isPublicPath(pathname)) return true;
  const rule = pageRoles(pathname);
  return !rule || (role !== null && (rule.roles as string[]).includes(role));
}

// Helper safeRedirect : réalise le traitement métier associé.
export function safeRedirect(target: unknown): string | null {
  if (typeof target !== 'string') return null;
  if (/[\u0000-\u001F\u007F]/.test(target)) return null;
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(target);
    if (decoded.startsWith('//') || decoded.startsWith('/\\') || /^\/+[a-z][a-z0-9+.-]*:/i.test(decoded)) {
      return null;
    }
  } catch {
    return null;
  }
  const pathname = target.split(/[?#]/)[0];
  if (isPublicPath(pathname) && normPath(pathname) !== '/') return null;
  return target;
}

// Helper rememberRedirect : réalise le traitement métier associé.
export function rememberRedirect(target: unknown): void {
  const safe = safeRedirect(target);
  if (safe) sessionStorage.setItem(REDIRECT_KEY, safe);
  else sessionStorage.removeItem(REDIRECT_KEY);
}

// Helper postLoginTarget : réalise le traitement métier associé.
export function postLoginTarget(role: string | null): string {
  const saved = safeRedirect(sessionStorage.getItem(REDIRECT_KEY));
  sessionStorage.removeItem(REDIRECT_KEY);
  if (saved && normPath(saved.split(/[?#]/)[0]) !== '/connexion' && canAccess(saved.split(/[?#]/)[0], role)) return saved;
  return homeForRole(role);
}

// Helper guardRoute : réalise le traitement métier associé.
export function guardRoute({
  location,
  preload,
}: {
  location: { pathname: string; href: string };
  preload: boolean;
}): void {
  if (isPublicPath(location.pathname)) return;
  if (!hasSession()) {
    if (!preload) toast.error(tx('Veuillez vous connecter pour accéder à cette page.'), { id: AUTH_TOAST_ID });
    const requestedLocation = new URL(location.href, window.location.origin);
    const requestedUrl = `${requestedLocation.pathname}${requestedLocation.search}${requestedLocation.hash}`;
    throw redirect({ to: '/connexion', search: { redirect: requestedUrl }, replace: true });
  }
  const role = currentRole();
  const rule = pageRoles(location.pathname);
  if (rule && !(role !== null && (rule.roles as string[]).includes(role))) {
    if (!preload) toast.error(tr(`Accès refusé : cette page est réservée ${rule.label}.`, `Access denied: this page is reserved ${tx(rule.label)}.`), { id: ROLE_TOAST_ID });
    throw redirect({ to: homeForRole(role), replace: true });
  }
}

// Helper redirectOnSessionExpired : réalise le traitement métier associé.
export function redirectOnSessionExpired(router: AnyRouter): () => void {
  // Gère l’action utilisateur Expired.
  const onExpired = () => {
    if (isPublicPath(router.state.location.pathname)) return;
    toast.error(tx('Session expirée : veuillez vous reconnecter.'), { id: AUTH_TOAST_ID });
    const current = router.state.location;
    const requestedUrl = `${current.pathname}${current.searchStr ?? ''}${current.hash ?? ''}`;
    void router.navigate({ to: '/connexion', search: { redirect: requestedUrl }, replace: true });
  };
  window.addEventListener('tokpa:session-expired', onExpired);
  return () => window.removeEventListener('tokpa:session-expired', onExpired);
}
