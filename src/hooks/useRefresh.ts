// Orchestre le rafraîchissement automatique silencieux (onglet visible, retour d’onglet, reconnexion réseau).
import { useEffect, useRef, useState } from 'react';
import {
  onGlobalRefresh,
  refreshState,
  subscribeRefreshState,
  requestRefresh,
  silentRefreshActive,
  backgroundRefreshActive,
  type RefreshOrigin,
  type RefreshState,
} from '../services/refresh/refreshBus';

export const AUTO_REFRESH_MS = 30_000;
const RESUME_AFTER_MS = 8_000;

// Hook React useAutoRefresh : encapsule l’état et les effets associés.
export function useAutoRefresh(intervalMs: number = AUTO_REFRESH_MS): void {
  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    let hiddenAt: number | null = null;

    const tick = () => {
      if (document.visibilityState === 'visible') void requestRefresh('auto');
    };

    const intervalId = window.setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const absence = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      if (absence >= RESUME_AFTER_MS) void requestRefresh('auto');
    };

    const onOnline = () => void requestRefresh('network');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [intervalMs]);
}

// Hook React useRefreshState : encapsule l’état et les effets associés.
export function useRefreshState(): RefreshState {
  const [state, setState] = useState<RefreshState>(() => refreshState());
  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => subscribeRefreshState(setState), []);
  return state;
}

// Hook React useGlobalRefreshListener : encapsule l’état et les effets associés.
export function useGlobalRefreshListener(listener: (origin: RefreshOrigin) => void | Promise<void>): void {
  const ref = useRef(listener);
  ref.current = listener;
  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => onGlobalRefresh((origin) => ref.current(origin)), []);
}

// Hook React useGlobalRefreshTick : encapsule l’état et les effets associés.
export function useGlobalRefreshTick(): number {
  const [tick, setTick] = useState(0);
  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    const handler = (ev: Event) => {
      const origin = (ev as CustomEvent<{ origin?: RefreshOrigin }>).detail?.origin;
      if (origin === 'realtime') return;
      setTick((t) => t + 1);
    };
    window.addEventListener('tokpa:refresh', handler as EventListener);
    return () => window.removeEventListener('tokpa:refresh', handler as EventListener);
  }, []);
  return tick;
}

export { silentRefreshActive, backgroundRefreshActive, requestRefresh };
export type { RefreshOrigin, RefreshState };
