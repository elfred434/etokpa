export type FrontendErrorSource =
  | 'api'
  | 'react-boundary'
  | 'router'
  | 'window'
  | 'unhandled-rejection'
  | 'bootstrap'
  | 'realtime'
  | 'auth-storage'
  | 'design-runtime'
  | 'security-guard';

export interface FrontendErrorReport {
  reference: string;
  firstSeenAt: string;
  lastSeenAt: string;
  source: FrontendErrorSource;
  errorType: string;
  route: string;
  status?: number;
  occurrences: number;
}

interface FrontendErrorContext {
  source: FrontendErrorSource;
  status?: number | null;
}

const STORAGE_KEY = 'tokpa_frontend_errors_v1';
const MAX_REPORTS = 25;
const DEDUPE_WINDOW_MS = 30_000;

let reports = readStoredReports();
let removeGlobalHandlers: (() => void) | null = null;

function safeErrorType(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UnknownError';
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,39}$/.test(name)
    ? name
    : 'UnknownError';
}

function safeStatus(error: unknown, explicit?: number | null): number | undefined {
  const responseStatus = error && typeof error === 'object'
    ? (error as { response?: { status?: unknown } }).response?.status
    : undefined;
  const value = explicit ?? responseStatus;
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
}

/** A route may contain IDs or email-like segments; omit query and fragment entirely. */
function safeRoute(): string {
  try {
    if (typeof window === 'undefined') return '/';
    const pathname = window.location?.pathname || '/';
    const segments = pathname.split('/').map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Keep the original path segment, then apply the conservative rules below.
      }
      if (
        /^\d+$/.test(decoded) ||
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(decoded) ||
        decoded.includes('@') ||
        decoded.length > 48 ||
        (decoded.length >= 24 && /^[A-Za-z0-9_-]+$/.test(decoded))
      ) {
        return ':id';
      }
      return decoded.replace(/[?#].*$/, '').replace(/[^A-Za-z0-9._~-]/g, '_').slice(0, 48);
    });
    return segments.join('/') || '/';
  } catch {
    return '/';
  }
}

function makeReference(now: number): string {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0');
  return `TKP-${now.toString(36).toUpperCase()}-${suffix}`;
}

function reportKey(report: FrontendErrorReport): string {
  return [report.source, report.errorType, report.route, report.status ?? ''].join('|');
}

function readStoredReports(): FrontendErrorReport[] {
  try {
    if (typeof sessionStorage === 'undefined') return [];
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is FrontendErrorReport => {
      if (!item || typeof item !== 'object') return false;
      const report = item as Partial<FrontendErrorReport>;
      return typeof report.reference === 'string' &&
        typeof report.firstSeenAt === 'string' &&
        typeof report.lastSeenAt === 'string' &&
        typeof report.source === 'string' &&
        typeof report.errorType === 'string' &&
        typeof report.route === 'string' &&
        typeof report.occurrences === 'number';
    }).slice(-MAX_REPORTS);
  } catch {
    return [];
  }
}

function persistReports(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(-MAX_REPORTS)));
    }
  } catch {
    // Private browsing or disabled storage: the in-memory queue still works.
  }
}

function emitReport(report: FrontendErrorReport): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('tokpa:frontend-error', { detail: { ...report } }));
    }
  } catch {
    // Error reporting must never create a second application error.
  }
}

/**
 * Capture a safe, local diagnostic reference. Raw messages, stacks, URLs, request
 * bodies, user identity and credentials are deliberately never stored or emitted.
 */
export function captureFrontendError(
  error: unknown,
  context: FrontendErrorContext,
): FrontendErrorReport {
  const now = Date.now();
  const candidate: FrontendErrorReport = {
    reference: makeReference(now),
    firstSeenAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    source: context.source,
    errorType: safeErrorType(error),
    route: safeRoute(),
    status: safeStatus(error, context.status),
    occurrences: 1,
  };
  const key = reportKey(candidate);
  let existingIndex = -1;
  for (let index = reports.length - 1; index >= 0; index -= 1) {
    const report = reports[index];
    if (reportKey(report) === key && now - Date.parse(report.lastSeenAt) <= DEDUPE_WINDOW_MS) {
      existingIndex = index;
      break;
    }
  }

  if (existingIndex >= 0) {
    const existing = reports[existingIndex];
    const updated: FrontendErrorReport = {
      ...existing,
      lastSeenAt: candidate.lastSeenAt,
      occurrences: existing.occurrences + 1,
    };
    reports = reports.map((report, index) => index === existingIndex ? updated : report);
    persistReports();
    emitReport(updated);
    return { ...updated };
  }

  reports = [...reports, candidate].slice(-MAX_REPORTS);
  persistReports();
  emitReport(candidate);
  return { ...candidate };
}

/** Safe summaries held only in memory/sessionStorage for this browser tab. */
export function getFrontendErrorReports(): FrontendErrorReport[] {
  return reports.map((report) => ({ ...report }));
}

export function clearFrontendErrorReports(): void {
  reports = [];
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function isExpectedCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { name?: unknown; code?: unknown };
  return value.name === 'AbortError' || value.name === 'CanceledError' || value.code === 'ERR_CANCELED';
}

/** Capture uncaught runtime errors without suppressing the browser's dev diagnostics. */
export function installGlobalErrorHandlers(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (removeGlobalHandlers) return removeGlobalHandlers;

  const onError = (event: Event) => {
    const errorEvent = event as ErrorEvent;
    // Ignore failed images/fonts/etc.; capture uncaught script errors only.
    if (errorEvent.target !== window && !errorEvent.error) return;
    captureFrontendError(errorEvent.error, { source: 'window' });
    if (!import.meta.env.DEV) event.preventDefault();
  };

  const onUnhandledRejection = (event: Event) => {
    const rejectionEvent = event as PromiseRejectionEvent;
    if (isExpectedCancellation(rejectionEvent.reason)) return;
    captureFrontendError(rejectionEvent.reason, { source: 'unhandled-rejection' });
    if (!import.meta.env.DEV) event.preventDefault();
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  const cleanup = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    if (removeGlobalHandlers === cleanup) removeGlobalHandlers = null;
  };
  removeGlobalHandlers = cleanup;
  return cleanup;
}
