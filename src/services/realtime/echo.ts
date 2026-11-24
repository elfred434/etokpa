// Initialise et gère la connexion Laravel Echo / Reverb pour les canaux privés temps réel.
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { apiOriginFromBase } from '../../utils/apiBaseUrl';
import { captureFrontendError } from '../errors/frontendErrorReporter';

declare global {
  interface Window {
    Echo?: Echo<'pusher'>;
    Pusher?: typeof Pusher;
  }
}

const env = import.meta.env as Record<string, string | undefined>;

// Récupère et normalise les données pour getApiOrigin.
export function getApiOrigin(): string {
  return apiOriginFromBase(env.VITE_API_BASE_URL);
}

// Vérifie la condition métier isReverbEnabled.
export function isReverbEnabled(value = env.VITE_REVERB_ENABLED): boolean {
  return value?.trim().toLowerCase() !== 'false';
}

export interface ReverbConfig {
  host: string;
  port: number;
  wssPort: number;
  scheme: 'ws' | 'wss';
  key: string;
  appId: string;
}

// Récupère et normalise les données pour getReverbConfig.
export function getReverbConfig(): ReverbConfig {
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const defaultScheme: 'ws' | 'wss' = isHttps ? 'wss' : 'ws';
  const scheme: 'ws' | 'wss' = env.VITE_REVERB_SCHEME === 'wss'
    ? 'wss'
    : env.VITE_REVERB_SCHEME === 'ws' && !isHttps
      ? 'ws'
      : defaultScheme;
  return {
    host: env.VITE_REVERB_HOST || 'localhost',
    port: Number(env.VITE_REVERB_PORT || 8080),
    wssPort: Number(env.VITE_REVERB_WSS_PORT || 443),
    scheme,
    key: env.VITE_REVERB_KEY || 'tokpa-key',
    appId: env.VITE_REVERB_APP_ID || 'tokpa',
  };
}

let boundToken: string | null = null;

// Helper initEcho : réalise le traitement métier associé.
export function initEcho(): Echo<'pusher'> | null {
  if (!isReverbEnabled()) {
    shutdownEcho();
    return null;
  }

  let token = localStorage.getItem('tokpa_token');
  if (token === 'demo_token_sanctum_123') {
    localStorage.removeItem('tokpa_token');
    localStorage.removeItem('tokpa_user');
    token = null;
  }
  if (!token) {
    shutdownEcho();
    return null;
  }
  if (window.Echo && boundToken === token) {
    return window.Echo;
  }

  shutdownEcho();

  try {
    const { host, port, wssPort, scheme, key } = getReverbConfig();
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    window.Echo = new Echo({
      broadcaster: 'pusher',
      key,
      cluster: '',
      namespace: '',
      host,
      port,
      wsHost: host,
      wsPort: port,
      wssPort,
      forceTLS: scheme === 'wss',
      enabledTransports: scheme === 'wss' ? ['wss'] : ['ws'],
      authEndpoint: `${getApiOrigin()}/broadcasting/auth`,
      auth: {
        headers: { Authorization: `Bearer ${token}` },
      },
    } as ConstructorParameters<typeof Echo<'pusher'>>[0]);
    boundToken = token;
    return window.Echo;
  } catch (error) {
    captureFrontendError(error, { source: 'realtime' });
    shutdownEcho();
    return null;
  }
}

// Helper shutdownEcho : réalise le traitement métier associé.
export function shutdownEcho(): void {
  if (window.Echo) {
    try {
      window.Echo.disconnect();
    } catch {
    }
    window.Echo = undefined;
  }
  boundToken = null;
}

// Helper windowEcho : réalise le traitement métier associé.
export function windowEcho(): Echo<'pusher'> | null {
  return window.Echo ?? null;
}

// Helper listenPrivate : réalise le traitement métier associé.
export function listenPrivate(channel: string, event: string, callback: (payload: unknown) => void) {
  const echo = window.Echo;
  if (!echo) return { stop: () => undefined };
  const privateChannel = echo.private(channel);
  privateChannel.listen(event, (data: unknown) => callback(data));
  return {
    stop: () => {
      privateChannel.stopListening(event);
    },
  };
}
