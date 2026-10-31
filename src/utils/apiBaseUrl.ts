const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

/** Normalise une URL d’API Vite (supprime espaces de bord et slashs finaux). */
export function normalizeApiBaseUrl(value?: string | null): string {
  const trimmed = value?.trim();
  return (trimmed || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

/** Origine Laravel sans le suffixe `/api` ; vide lorsque l’API est proxyfiée en same-origin. */
export function apiOriginFromBase(value?: string | null): string {
  return normalizeApiBaseUrl(value).replace(/\/api$/i, '');
}
