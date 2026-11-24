// Normalise l’URL de base de l’API et déduit l’origine serveur.
const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

// Transforme ou formate les données via normalizeApiBaseUrl.
export function normalizeApiBaseUrl(value?: string | null): string {
  const trimmed = value?.trim();
  return (trimmed || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

// Helper apiOriginFromBase : réalise le traitement métier associé.
export function apiOriginFromBase(value?: string | null): string {
  return normalizeApiBaseUrl(value).replace(/\/api$/i, '');
}
