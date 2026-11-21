/**
 * Résout une image produit renvoyée par l'API :
 * - URL absolue (Cloudinary) → telle quelle ;
 * - chemin relatif `/storage/uploads/…` → origine API si elle est absolue,
 *   ou même origine si `/api` est proxyfié par Vite (voir vite.config.js).
 * `null`/vide ou schéma dangereux (`javascript:`, `data:image/svg+xml`, etc.) → null.
 */
import { apiOriginFromBase } from './apiBaseUrl';
import { sanitizeImageUrl } from './safeUrl';

export function resolveImageUrl(
  u?: string | null,
  apiBaseUrl?: string | null,
): string | null {
  const safe = sanitizeImageUrl(u);
  if (!safe) return null;
  if (/^(https?:|data:|blob:)/i.test(safe)) return safe;
  const apiOrigin = apiOriginFromBase(apiBaseUrl);
  return `${apiOrigin}${safe.startsWith('/') ? '' : '/'}${safe}`;
}

export function absImageUrl(u?: string | null): string | null {
  return resolveImageUrl(u, import.meta.env.VITE_API_BASE_URL);
}
