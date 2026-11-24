// Configure l’instance Axios (URL API, token Bearer, intercepteur 401 et contexte de rafraîchissement).
import axios from 'axios';
import { backgroundRefreshActive } from '../refresh/refreshBus';
import { markBackgroundRefreshRequest } from '../refresh/refreshRequestContext';
import { normalizeApiBaseUrl } from '../../utils/apiBaseUrl';
import { captureFrontendError } from '../errors/frontendErrorReporter';

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    if (backgroundRefreshActive()) markBackgroundRefreshRequest(config);
    const token = localStorage.getItem('tokpa_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper messageOf : réalise le traitement métier associé.
function messageOf(error: { response?: { data?: { message?: string } } }): string {
  return String(error.response?.data?.message ?? '');
}

// Vérifie la condition métier isRequestCancellation.
function isRequestCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { name?: unknown; code?: unknown };
  return value.name === 'AbortError' || value.name === 'CanceledError' || value.code === 'ERR_CANCELED';
}

// Helper sessionRejected : réalise le traitement métier associé.
function sessionRejected(error: { response?: { status?: number; data?: { message?: string } } }): boolean {
  const status = error.response?.status;
  if (status === 401) return true;
  return /unauthenticated/i.test(messageOf(error));
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    if (!isRequestCancellation(error) && (status == null || status >= 500)) {
      captureFrontendError(error, { source: 'api', status });
    }

    if (sessionRejected(error)) {
      const hadSession = !!localStorage.getItem('tokpa_token');
      localStorage.removeItem('tokpa_token');
      localStorage.removeItem('tokpa_user');
      if (hadSession) {
        window.dispatchEvent(new Event('tokpa:auth-changed'));
        window.dispatchEvent(new Event('tokpa:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);
