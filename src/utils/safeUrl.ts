/**
 * Utilitaires de validation stricte d'URL côté client :
 * - bloque `javascript:`, `data:text/html`, `data:image/svg+xml`, `vbscript:`, `file:`
 * - prévient les redirections ouvertes (`//evil.com`, `/\evil.com`, caractères de contrôle)
 * - limite les redirections de paiement aux chemins internes ou aux domaines FedaPay HTTPS.
 */

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const RASTER_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const APPROVED_PAYMENT_HOSTS = ['fedapay.com'];

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function isHostAllowed(hostname: string, allowedSuffixes: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowedSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/** Valide une URL d'image (rejette `javascript:`, `data:image/svg+xml`, `data:text/html`, etc.). */
export function sanitizeImageUrl(raw?: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  if (/^data:/i.test(trimmed)) {
    return RASTER_DATA_URL_RE.test(trimmed) ? trimmed : null;
  }
  if (/^blob:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(javascript|vbscript|file):/i.test(trimmed)) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null;
  }
  return trimmed;
}

/** Valide une URL de redirection externe sûre (HTTPS, ou HTTP local en dev, ou chemin interne). */
export function safeExternalRedirectUrl(
  raw: unknown,
  allowedHostSuffixes?: string[],
): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const isHttpLocal = parsed.protocol === 'http:' && isLocalHost(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isHttpLocal) {
    return null;
  }

  if (allowedHostSuffixes && allowedHostSuffixes.length > 0 && !isLocalHost(parsed.hostname)) {
    const currentHost = typeof window !== 'undefined' ? window.location?.hostname : '';
    const matchesCurrent = Boolean(currentHost && parsed.hostname.toLowerCase() === currentHost.toLowerCase());
    if (!matchesCurrent && !isHostAllowed(parsed.hostname, allowedHostSuffixes)) {
      return null;
    }
  }

  return parsed.toString();
}

/** Valide une URL de paiement (chemin interne, hôte courant ou FedaPay HTTPS). */
export function safePaymentRedirectUrl(raw: unknown): string | null {
  return safeExternalRedirectUrl(raw, APPROVED_PAYMENT_HOSTS);
}
