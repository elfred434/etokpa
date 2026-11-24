// Hook générique chargeant des lignes API avec mise à jour silencieuse sur rafraîchissement global.
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { invokeDesign } from '../../utils/designRuntime';
import { unwrap, listOf } from './unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { backgroundRefreshActive, onGlobalRefresh, silentRefreshActive } from '../refresh/refreshBus';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Hook React useLiveRows : encapsule l’état et les effets associés.
export function useLiveRows(fetcher: () => Promise<unknown>, deps: unknown[] = []) {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper reload : réalise le traitement métier associé.
  const reload = (): Promise<void> => {
    const silent = silentRefreshActive();
    const background = backgroundRefreshActive();
    if (!silent) {
      setLoading(true);
      setErr(null);
    }
    return fetcher()
      .then((r) => {
        setRows(listOf(unwrap(r)));
        setErr(null);
      })
      .catch((e) => {
        if (!background) setErr(formatApiError(extractApiError(e)));
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  // Charge ou synchronise les données depuis l’API au montage ou lors d’un changement de dépendance.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetcher()
      .then((r) => alive && setRows(listOf(unwrap(r))))
      .catch((e) => alive && setErr(formatApiError(extractApiError(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(
    () =>
      onGlobalRefresh(() => reloadRef.current()),
    [],
  );

  return { rows, err, loading, reload };
}

// Helper zoneNom : réalise le traitement métier associé.
export const zoneNom = (z: unknown): string =>
  z && typeof z === 'object' ? String((z as any).nom ?? '—') : String((z as any) ?? '—') || '—';

// Helper escArg : réalise le traitement métier associé.
export const escArg = (s: unknown): string =>
  String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Déclenche l’action interactive associée à l’élément cliqué.
export function fireDesign(e: MouseEvent<HTMLElement>): void {
  const el = e.currentTarget;
  const code = el.getAttribute('data-onclick') || '';
  if (!code) return;
  invokeDesign(code, el, e.nativeEvent ?? (e as unknown as Event));
}

// Extrait deux initiales à partir d’un nom complet.
export const initials = (nom: unknown): string =>
  String(nom ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join('') || '—';

// Helper dateShort : réalise le traitement métier associé.
export const dateShort = (s: unknown): string => String(s ?? '').slice(0, 10) || '—';
