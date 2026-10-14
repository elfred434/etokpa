/**
 * Bus de rafraîchissement global TOKPa.
 *
 * Un seul point d'entrée — `requestRefresh(origin)` — déclenché par :
 *   - le bouton « Actualiser » (origin = 'manual') ;
 *   - le processus silencieux (origin = 'auto' : minuterie 30 s, retour d'onglet) ;
 *   - le retour du réseau (origin = 'network') ;
 *   - un événement temps réel Reverb (origin = 'realtime').
 *
 * Il notifie, dans cet ordre :
 *   1. les pages DÉJÀ abonnées au bus temps réel existant
 *      (`tokpa:realtime-refresh`, scope 'all' → OrderTracking, Messaging,
 *      Notifications, Négociations, cloche admin…) ;
 *   2. les abonnés du bus global (`onGlobalRefresh`, via l'événement
 *      `tokpa:refresh` — Catalogue, Commandes, Mes packs, panier, tableaux admin…) ;
 *   3. l'état « en cours » (compteur d'appels en vol) pour le bouton.
 *
 * Pendant un rafraîchissement, `silentRefreshActive()` vaut `true` : les pages
 * s'en servent pour NE PAS afficher leur squelette de chargement (actualisation
 * invisible, sans clignotement). Le rafraîchissement manuel garde un retour
 * visuel : rotation de l'icône (+ court instant minimum, sinon c'est instantané).
 *
 * Aucune dépendance React ici : utilisable aussi depuis les tests et le bridge système.
 */

export type RefreshOrigin = 'manual' | 'auto' | 'network' | 'realtime';

export interface RefreshState {
  /** Au moins un rafraîchissement est en vol. */
  busy: boolean;
  /** Horodatage (ms) du dernier rafraîchissement terminé, null si aucun. */
  lastRefreshAt: number | null;
  /** Origine du dernier rafraîchissement terminé. */
  origin: RefreshOrigin | null;
}

type GlobalListener = (origin: RefreshOrigin) => void | Promise<void>;
type StateListener = (state: RefreshState) => void;

/** Durée minimale de rotation de l'icône (sinon un refresh local paraît « rien faire »). */
export const MIN_SPINNER_MS = 520;
/** Plafond d'attente des abonnés « promesse » (on ne bloque jamais l'UI plus longtemps). */
const MAX_SETTLE_MS = 4000;

const listeners = new Set<GlobalListener>();
const stateListeners = new Set<StateListener>();

let busyCount = 0;
let lastRefreshAt: number | null = null;
let lastOrigin: RefreshOrigin | null = null;
let silent = false;

export function refreshState(): RefreshState {
  return { busy: busyCount > 0, lastRefreshAt, origin: lastOrigin };
}

/** S'abonner aux rafraîchissements globaux. Le retour de la fonction annule l'abonnement. */
export function onGlobalRefresh(listener: GlobalListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** S'abonner à l'état (bouton : rotation). Retour = désabonnement. */
export function subscribeRefreshState(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

/**
 * `true` pendant un rafraîchissement (y compris le manuel) : les pages évitent
 * d'afficher un squelette de chargement et mettent à jour les données en place.
 */
export function silentRefreshActive(): boolean {
  return silent;
}

/** Le temps réel (Reverb) met à jour l'horodatage affiché sans passer par le bus complet. */
export function markRealtimeRefresh(): void {
  lastRefreshAt = Date.now();
  lastOrigin = 'realtime';
  emitState();
}

function emitState(): void {
  const state = refreshState();
  stateListeners.forEach((l) => {
    try {
      l(state);
    } catch {
      // un abonné défaillant ne doit jamais casser les autres
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Rafraîchit toutes les informations affichées.
 * Résout quand les abonnés « promesse » ont terminé (plafonné) — jamais de rejet.
 */
export async function requestRefresh(origin: RefreshOrigin = 'manual'): Promise<void> {
  if (typeof window === 'undefined') return;

  busyCount += 1;
  silent = true;
  emitState();
  const started = Date.now();

  try {
    // 1) Bus temps réel existant : scope 'all' → toutes les pages abonnées se rechargent.
    try {
      window.dispatchEvent(
        new CustomEvent('tokpa:realtime-refresh', { detail: { scope: 'all', payload: { origin } } }),
      );
    } catch {
      // CustomEvent indisponible (vieux navigateur / environnement de test minimal)
    }

    // 2) Bus global : pages/tableaux abonnés via onGlobalRefresh (ou l'événement DOM).
    const tasks = [...listeners].map((listener) =>
      Promise.resolve()
        .then(() => listener(origin))
        .catch(() => undefined),
    );
    try {
      window.dispatchEvent(new CustomEvent('tokpa:refresh', { detail: { origin } }));
    } catch {
      // idem
    }
    await Promise.race([Promise.all(tasks), sleep(MAX_SETTLE_MS)]);

    // 3) Rotation minimale du bouton : feedback visible pour l'utilisateur.
    const restant = MIN_SPINNER_MS - (Date.now() - started);
    if (restant > 0) await sleep(restant);
  } finally {
    busyCount = Math.max(0, busyCount - 1);
    silent = false;
    lastRefreshAt = Date.now();
    lastOrigin = origin;
    emitState();
  }
}
