
// Bus d’événements coordonnant les rafraîchissements manuels et silencieux dans toute l’application.
export type RefreshOrigin = 'manual' | 'auto' | 'network' | 'realtime';

export interface RefreshState {
  busy: boolean;
  lastRefreshAt: number | null;
  origin: RefreshOrigin | null;
}

type GlobalListener = (origin: RefreshOrigin) => void | Promise<void>;
type StateListener = (state: RefreshState) => void;

export const MIN_SPINNER_MS = 520;
const MAX_SETTLE_MS = 4000;

const listeners = new Set<GlobalListener>();
const stateListeners = new Set<StateListener>();

let busyCount = 0;
let backgroundBusyCount = 0;
let lastRefreshAt: number | null = null;
let lastOrigin: RefreshOrigin | null = null;
let silent = false;

// Helper refreshState : réalise le traitement métier associé.
export function refreshState(): RefreshState {
  return { busy: busyCount > 0, lastRefreshAt, origin: lastOrigin };
}

// Gère l’action utilisateur GlobalRefresh.
export function onGlobalRefresh(listener: GlobalListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Helper subscribeRefreshState : réalise le traitement métier associé.
export function subscribeRefreshState(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

// Helper silentRefreshActive : réalise le traitement métier associé.
export function silentRefreshActive(): boolean {
  return silent;
}

// Helper backgroundRefreshActive : réalise le traitement métier associé.
export function backgroundRefreshActive(): boolean {
  return backgroundBusyCount > 0;
}

// Helper markRealtimeRefresh : réalise le traitement métier associé.
export function markRealtimeRefresh(): void {
  lastRefreshAt = Date.now();
  lastOrigin = 'realtime';
  emitState();
}

// Helper emitState : réalise le traitement métier associé.
function emitState(): void {
  const state = refreshState();
  stateListeners.forEach((l) => {
    try {
      l(state);
    } catch {
    }
  });
}

// Helper sleep : réalise le traitement métier associé.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Helper requestRefresh : réalise le traitement métier associé.
export async function requestRefresh(origin: RefreshOrigin = 'manual'): Promise<void> {
  if (typeof window === 'undefined') return;

  busyCount += 1;
  if (origin === 'auto' || origin === 'network') backgroundBusyCount += 1;
  silent = true;
  emitState();
  const started = Date.now();

  try {
    try {
      window.dispatchEvent(
        new CustomEvent('tokpa:realtime-refresh', { detail: { scope: 'all', payload: { origin } } }),
      );
    } catch {
    }

    const tasks = [...listeners].map((listener) =>
      Promise.resolve()
        .then(() => listener(origin))
        .catch(() => undefined),
    );
    try {
      window.dispatchEvent(new CustomEvent('tokpa:refresh', { detail: { origin } }));
    } catch {
    }
    await Promise.race([Promise.all(tasks), sleep(MAX_SETTLE_MS)]);

    const restant = MIN_SPINNER_MS - (Date.now() - started);
    if (restant > 0) await sleep(restant);
  } finally {
    busyCount = Math.max(0, busyCount - 1);
    if (origin === 'auto' || origin === 'network') backgroundBusyCount = Math.max(0, backgroundBusyCount - 1);
    silent = busyCount > 0;
    lastRefreshAt = Date.now();
    lastOrigin = origin;
    emitState();
  }
}
