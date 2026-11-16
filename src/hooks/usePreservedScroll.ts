import { useLayoutEffect, useRef, type RefObject } from 'react';

const scrollPositions = new Map<string, number>();

/** Réinitialise les positions mémorisées (utile en tests unitaires). */
export function resetPreservedScroll(key?: string): void {
  if (key) scrollPositions.delete(key);
  else scrollPositions.clear();
}

/**
 * Conserve `scrollTop` d'un conteneur défilant (ex. barre latérale admin/manager)
 * entre deux navigations lorsque le layout est démonté puis remonté par le routeur.
 */
export function usePreservedScroll<T extends HTMLElement>(key: string): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const saved = scrollPositions.get(key);
    if (typeof saved === 'number' && saved > 0) {
      el.scrollTop = saved;
    }

    const onScroll = () => {
      scrollPositions.set(key, el.scrollTop);
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (el.scrollTop > 0) {
        scrollPositions.set(key, el.scrollTop);
      }
      el.removeEventListener('scroll', onScroll);
    };
  }, [key]);

  return ref;
}
