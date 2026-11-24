
// Valide les URLs d’images et de redirections (protection contre URLs dangereuses).
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const RASTER_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const APPROVED_PAYMENT_HOSTS = ['fedapay.com'];

// Vérifie la condition métier isLocalHost.
function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

// Vérifie la condition métier isHostAllowed.
function isHostAllowed(hostname: string, allowedSuffixes: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowedSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

// Transforme ou formate les données via sanitizeImageUrl.
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

// Helper safeExternalRedirectUrl : réalise le traitement métier associé.
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

// Helper safePaymentRedirectUrl : réalise le traitement métier associé.
export function safePaymentRedirectUrl(raw: unknown): string | null {
  return safeExternalRedirectUrl(raw, APPROVED_PAYMENT_HOSTS);
}
