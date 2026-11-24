// Extrait, formate en français et affiche les erreurs HTTP/validation renvoyées par Axios.
import toast from 'react-hot-toast';
import { tr, tx } from '../i18n/tx';
import { backgroundRefreshActive } from '../services/refresh/refreshBus';
import { isBackgroundRefreshApiError } from '../services/refresh/refreshRequestContext';
import { captureFrontendError } from '../services/errors/frontendErrorReporter';
import { getDevelopmentErrorMessage } from './developmentErrorMessage';

export interface ApiErrorInfo {
  status: number | null;
  message: string;
  fieldErrors: Record<string, string[]>;
  reference?: string;
  timeout?: boolean;
}

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: { message?: unknown; errors?: unknown };
  };
  message?: unknown;
  code?: unknown;
};

// Helper safeText : réalise le traitement métier associé.
function safeText(value: unknown, maxLength = 240): string {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/\bBearer\s*:?\s*[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{16,}\b/gi, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi, '[redacted]')
    .replace(/\b(password|token|secret|authorization|api[_ -]?key|client[_ -]?secret|access[_ -]?token|refresh[_ -]?token|app[_ -]?key|private[_ -]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, '[redacted]')
    .replace(/https?:\/\/[^\s]+/gi, '[URL]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
  const technicalPatterns = [
    /\b(?:SQLSTATE|PDOException|QueryException|Stack trace|Traceback|Fatal error|Parse error|Uncaught|Call to undefined|Undefined (?:variable|index|array key|property)|vendor\/|node_modules\/|Illuminate|Symfony|SQL query)\b/i,
    /\b[A-Z][A-Za-z0-9_]*(?:Exception|Error)\b/,
    /\bSELECT\b.+\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\b.+\bSET\b|\bDELETE\s+FROM\b/i,
    /\bat\s+(?:\/|[A-Za-z_$][\w$.]*\s*\()/i,
    /\/(?:app|etc|home|opt|root|srv|tmp|usr|var|workspace)\//i,
    /\b(?:[A-Za-z0-9-]+\.)+(?:internal|local|lan|test)\b/i,
    /\b(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/i,
    /\b(?:[A-Za-z]:\\\\|\\\\\\\\[A-Za-z0-9_.-]+\\\\)/,
  ];
  return technicalPatterns.some((pattern) => pattern.test(text)) ? '' : text;
}

// Helper validationErrors : réalise le traitement métier associé.
function validationErrors(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [field, rawMessages] of Object.entries(value).slice(0, 20)) {
    const safeField = field.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64);
    if (!safeField) continue;
    const values = Array.isArray(rawMessages) ? rawMessages : [rawMessages];
    const messages = values
      .filter((message): message is string => typeof message === 'string')
      .map((message) => getDevelopmentErrorMessage(message) ?? safeText(message))
      .filter(Boolean)
      .slice(0, 3);
    if (messages.length) result[safeField] = messages;
  }
  return result;
}

// Vérifie la condition métier isTimeout.
function isTimeout(error: ApiErrorLike): boolean {
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message : '';
  return code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(message);
}

// Vérifie la condition métier isExpectedCancellation.
function isExpectedCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as ApiErrorLike & { name?: unknown };
  const name = typeof value.name === 'string' ? value.name : '';
  const code = typeof value.code === 'string' ? value.code : '';
  return name === 'AbortError' || name === 'CanceledError' || code === 'ERR_CANCELED';
}

// Transforme ou formate les données via extractApiError.
export function extractApiError(err: unknown): ApiErrorInfo {
  const error = (err && typeof err === 'object' ? err : {}) as ApiErrorLike;
  const response = error.response;
  const rawStatus = response?.status;
  const status = typeof rawStatus === 'number' && Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
    ? rawStatus
    : null;
  const developmentMessage = getDevelopmentErrorMessage(response?.data?.message);
  const rawMessage = developmentMessage ?? safeText(response?.data?.message);
  const timeout = status === null && isTimeout(error);
  const cancelled = status === null && isExpectedCancellation(error);

  if (status !== null && status >= 500) {
    const reference = captureFrontendError(err, { source: 'api', status }).reference;
    return {
      status,
      message: tr('Une erreur interne est survenue. Réessayez plus tard.', 'An internal error occurred. Please try again later.'),
      fieldErrors: {},
      reference,
    };
  }

  if (status === null) {
    const reference = cancelled ? undefined : captureFrontendError(err, { source: 'api' }).reference;
    const developmentNetworkMessage = cancelled ? undefined : getDevelopmentErrorMessage(err);
    return {
      status: null,
      message: developmentNetworkMessage ?? (timeout
        ? tr('Le service met trop de temps à répondre.', 'The service is taking too long to respond.')
        : tr('Le service est momentanément indisponible.', 'The service is temporarily unavailable.')),
      fieldErrors: {},
      reference,
      timeout,
    };
  }

  const fieldErrors = status === 422 ? validationErrors(response?.data?.errors) : {};
  let message = rawMessage || tr(`Erreur HTTP ${status}`, `HTTP error ${status}`);
  if (status === 419) {
    message += tr(
      ' — Session expirée (CSRF). Rechargez la page et réessayez.',
      ' — Session expired (CSRF). Reload the page and try again.',
    );
  }
  return { status, message, fieldErrors };
}

// Transforme ou formate les données via formatApiError.
export function formatApiError(info: ApiErrorInfo): string {
  const prefix = info.status != null ? `[HTTP ${info.status}]` : tr('[Réseau]', '[Network]');
  let text = `${prefix} ${info.message}`;
  if (info.timeout) {
    text += tr(' Réessayez dans quelques instants.', ' Please try again in a moment.');
  }
  if (info.reference) {
    text += ` — ${tr('Réf.', 'Ref.')} ${info.reference}`;
  }
  if (info.status === 422) {
    const fields = Object.entries(info.fieldErrors ?? {}).map(([field, messages]) =>
      `${field} : ${messages.join(' ')}`,
    );
    if (fields.length) text += ` — ${fields.join(' • ')}`;
  }
  return text;
}

// Helper messageApi : réalise le traitement métier associé.
export function messageApi(err: unknown): string {
  const info = extractApiError(err);
  return formatApiError({ ...info, message: tx(info.message) });
}

// Helper apiErrorStatus : réalise le traitement métier associé.
export function apiErrorStatus(err: unknown): number | null {
  return extractApiError(err).status;
}

// Helper alertApiError : réalise le traitement métier associé.
export function alertApiError(err: unknown, toastId?: string): string {
  const info = extractApiError(err);
  const text = formatApiError(info);
  if (!isExpectedCancellation(err) && info.status !== 401 && !backgroundRefreshActive() && !isBackgroundRefreshApiError(err)) {
    toast.error(text, toastId ? { id: toastId } : undefined);
  }
  return text;
}
