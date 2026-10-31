/**
 * Résout une image produit renvoyée par l'API :
 * - URL absolue (Cloudinary) → telle quelle ;
 * - chemin relatif `/storage/uploads/…` → origine API si elle est absolue,
 *   ou même origine si `/api` est proxyfié par Vite (voir vite.config.js).
 * `null`/vide → null (l'appelant gère le placeholder).
 */
import { apiOriginFromBase } from './apiBaseUrl';

export function resolveImageUrl(
  u?: string | null,
  apiBaseUrl?: string | null,
): string | null {
  const imageUrl = u?.trim();
  if (!imageUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(imageUrl)) return imageUrl;
  const apiOrigin = apiOriginFromBase(apiBaseUrl);
  return `${apiOrigin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

export function absImageUrl(u?: string | null): string | null {
  return resolveImageUrl(u, import.meta.env.VITE_API_BASE_URL);
}
