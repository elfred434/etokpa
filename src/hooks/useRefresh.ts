import { useEffect, useRef, useState } from 'react';
import {
  onGlobalRefresh,
  refreshState,
  subscribeRefreshState,
  requestRefresh,
  silentRefreshActive,
  type RefreshOrigin,
  type RefreshState,
} from '../services/refresh/refreshBus';

/** Intervalle du rafraîchissement silencieux (onglet visible uniquement). */
export const AUTO_REFRESH_MS = 30_000;
/** Retour sur l'onglet : on recharge si l'absence a duré plus que ce seuil. */
const RESUME_AFTER_MS = 8_000;

/**
 * Processus d'actualisation SILENCIEUSE, monté une fois à la racine (SystemBridge) :
 *   - toutes les 30 s tant que l'onglet est visible (aucun toast, aucun squelette) ;
 *   - au retour sur l'onglet après plus de 8 s d'absence ;
 *   - au retour du réseau (`online`).
 *
 * Silencieux ne veut pas dire invisible : le bouton d'actualisation affiche la
 * heure de la dernière mise à jour et tourne brièvement pendant l'appel.
 */
export function useAutoRefresh(intervalMs: number = AUTO_REFRESH_MS): void {
  useEffect(() => {
    let hiddenAt: number | null = null;

    const tick = () => {
      // Onglet en arrière-plan : on ne consomme pas le réseau/API pour rien.
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

/** État observable du rafraîchissement (rotation du bouton, heure de la dernière mise à jour). */
export function useRefreshState(): RefreshState {
  const [state, setState] = useState<RefreshState>(() => refreshState());
  useEffect(() => subscribeRefreshState(setState), []);
  return state;
}

/**
 * Abonnement d'une page/tableau au rafraîchissement global (bouton + silencieux).
 * La fonction peut retourner une promesse : le bouton attend sa fin (plafonné).
 */
export function useGlobalRefreshListener(listener: (origin: RefreshOrigin) => void | Promise<void>): void {
  const ref = useRef(listener);
  ref.current = listener;
  useEffect(() => onGlobalRefresh((origin) => ref.current(origin)), []);
}

/**
 * Compteur incrémenté à chaque rafraîchissement global.
 * À mettre dans les dépendances d'un `useEffect` de chargement :
 *   const tick = useGlobalRefreshTick();
 *   useEffect(() => { …charger… }, [page, tick]);
 * `tick` vaut 0 au montage : aucun chargement supplémentaire n'est déclenché.
 */
export function useGlobalRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = (ev: Event) => {
      const origin = (ev as CustomEvent<{ origin?: RefreshOrigin }>).detail?.origin;
      // Un rafraîchissement déclenché par Reverb est déjà traité par les pages abonnées
      // au bus temps réel : on ne double pas leur rechargement ici.
      if (origin === 'realtime') return;
      setTick((t) => t + 1);
    };
    window.addEventListener('tokpa:refresh', handler as EventListener);
    return () => window.removeEventListener('tokpa:refresh', handler as EventListener);
  }, []);
  return tick;
}

export { silentRefreshActive, requestRefresh };
export type { RefreshOrigin, RefreshState };
