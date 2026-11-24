// Mémorise et restaure la position de défilement d’un conteneur entre deux navigations.
import { useLayoutEffect, useRef, type RefObject } from 'react';

const scrollPositions = new Map<string, number>();

// Helper resetPreservedScroll : réalise le traitement métier associé.
export function resetPreservedScroll(key?: string): void {
  if (key) scrollPositions.delete(key);
  else scrollPositions.clear();
}

// Hook React usePreservedScroll : encapsule l’état et les effets associés.
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
