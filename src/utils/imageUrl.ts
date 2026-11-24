// Résout les URLs d’images relatives (/storage/...) vers l’origine API.
import { apiOriginFromBase } from './apiBaseUrl';
import { sanitizeImageUrl } from './safeUrl';

// Transforme ou formate les données via resolveImageUrl.
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

// Helper absImageUrl : réalise le traitement métier associé.
export function absImageUrl(u?: string | null): string | null {
  return resolveImageUrl(u, import.meta.env.VITE_API_BASE_URL);
}
