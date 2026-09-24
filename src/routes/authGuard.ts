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

/** Chemin public ? (tolère un « / » final : /connexion/ = /connexion). */
export function isPublicPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_PATHS.includes(path);
}

/** Une session est-elle ouverte côté front ? */
export function hasSession(): boolean {
  return !!localStorage.getItem('tokpa_token');
}

/**
 * beforeLoad de la route racine : exécuté avant tout rendu, donc la page protégée n'est jamais
 * affichée et ses appels API ne partent pas. Toute nouvelle route est protégée par défaut.
 */
export function requireSession({ location, preload }: { location: { pathname: string }; preload: boolean }): void {
  if (isPublicPath(location.pathname) || hasSession()) return;
  if (!preload) toast.error('Veuillez vous connecter pour accéder à cette page.', { id: AUTH_TOAST_ID });
  throw redirect({ to: '/connexion', replace: true });
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
