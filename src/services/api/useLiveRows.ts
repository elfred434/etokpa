import { useEffect, useState } from 'react';
import { unwrap, listOf } from './unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * useLiveRows — charge des données RÉELLES pour les pages design Stitch :
 * remplit les tableaux (copie conforme conservée) sans fausse donnée.
 * Erreurs API verbeuses (phase dev) + états chargement / vide.
 */
export function useLiveRows(fetcher: () => Promise<unknown>, deps: unknown[] = []) {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    setErr(null);
    fetcher()
      .then((r) => setRows(listOf(unwrap(r))))
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

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

  return { rows, err, loading, reload };
}
