import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Thème clair / sombre / système.
 *
 * Conception (voir NOTE_23_MODE_SOMBRE.md) :
 * - Trois choix pour l'utilisateur : « clair », « sombre », « système »
 *   (ce dernier suit `prefers-color-scheme` et réagit en direct au changement) ;
 * - Le thème RÉSOLU est porté par `<html data-theme="light|dark">` : c'est lui
 *   qui déclenche les redéfinitions de jetons dans `theme.css` ;
 * - La classe `.dark` est posée en parallèle pour activer le variant Tailwind
 *   `dark:` là où les jetons ne suffisent pas (SVG, images, tuiles de carte) ;
 * - `color-scheme` est synchronisé pour que les éléments natifs (barres de
 *   défilement, champs de saisie, sélecteurs de date) suivent le thème ;
 * - Le choix est mémorisé sous `tokpa_theme` ; le script en ligne de
 *   `index.html` applique le même calcul avant le premier rendu, ce qui évite
 *   le flash de page claire (FOUC) au chargement.
 *
 * Note : la lecture du système est volontairement défensive (`matchMedia`
 * optionnel) pour rester utilisable en environnement de test (jsdom).
 */

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ThemeEffectif = 'light' | 'dark';

export const CLE_THEME = 'tokpa_theme';
export const MEDIA_SOMBRE = '(prefers-color-scheme: dark)';

/** Ordre du cycle du bouton : clair → sombre → système → clair. */
export const THEMES: { code: ThemeChoice; cle: string; icone: string }[] = [
  { code: 'light', cle: 'Clair', icone: 'light_mode' },
  { code: 'dark', cle: 'Sombre', icone: 'dark_mode' },
  { code: 'system', cle: 'Système', icone: 'brightness_auto' },
];

/** Le système est-il en mode sombre ? (jamais d'exception si matchMedia manque) */
export function systemePrefereSombre(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia?.(MEDIA_SOMBRE)?.matches ?? false;
  } catch {
    return false;
  }
}

/** Choix mémorisé par l'utilisateur (défaut : suivre le système). */
export function lireChoix(): ThemeChoice {
  if (typeof localStorage === 'undefined') return 'system';
  const v = localStorage.getItem(CLE_THEME);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

/** Choix → thème réellement appliqué. */
export function resoudreTheme(choix: ThemeChoice, systemeSombre = systemePrefereSombre()): ThemeEffectif {
  if (choix === 'system') return systemeSombre ? 'dark' : 'light';
  return choix;
}

/**
 * Applique le thème résolu au document. Exporté pour être réutilisable par le
 * script d'amorçage et par les tests.
 */
export function appliquerTheme(effectif: ThemeEffectif): void {
  if (typeof document === 'undefined') return;
  const racine = document.documentElement;
  racine.dataset.theme = effectif;
  racine.classList.toggle('dark', effectif === 'dark');
  racine.style.colorScheme = effectif;
}

interface ThemeContextValue {
  /** Choix de l'utilisateur (peut être « système »). */
  choix: ThemeChoice;
  /** Thème réellement appliqué (« light » ou « dark »). */
  effectif: ThemeEffectif;
  /** Faut-il afficher la variante sombre ? (raccourci pour les composants) */
  sombre: boolean;
  setChoix: (choix: ThemeChoice) => void;
  /** Bascule clair ↔ sombre en sortant explicitement du mode « système ». */
  basculer: () => void;
  /** Passe au choix suivant du cycle clair → sombre → système. */
  cycler: () => void;
}

const valeurParDefaut: ThemeContextValue = {
  choix: 'system',
  effectif: 'light',
  sombre: false,
  setChoix: () => {},
  basculer: () => {},
  cycler: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(valeurParDefaut);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choix, setChoixEtat] = useState<ThemeChoice>(() => lireChoix());
  const [systemeSombre, setSystemeSombre] = useState<boolean>(() => systemePrefereSombre());

  const effectif = resoudreTheme(choix, systemeSombre);

  // Application à chaque changement de thème résolu.
  useEffect(() => {
    appliquerTheme(effectif);
  }, [effectif]);

  // Suivi en direct de la préférence système (utile en mode « système »).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const requete = window.matchMedia(MEDIA_SOMBRE);
    const surChangement = (e: MediaQueryListEvent | MediaQueryList) => setSystemeSombre(!!e.matches);
    setSystemeSombre(requete.matches);
    if (typeof requete.addEventListener === 'function') {
      requete.addEventListener('change', surChangement);
      return () => requete.removeEventListener('change', surChangement);
    }
    // Navigateurs anciens : API héritée.
    requete.addListener?.(surChangement);
    return () => requete.removeListener?.(surChangement);
  }, []);

  const setChoix = useCallback((suivant: ThemeChoice) => {
    setChoixEtat(suivant);
    try {
      localStorage.setItem(CLE_THEME, suivant);
    } catch {
      /* mode privé : on garde le thème pour la session */
    }
    appliquerTheme(resoudreTheme(suivant));
  }, []);

  const basculer = useCallback(() => {
    setChoix(effectif === 'dark' ? 'light' : 'dark');
  }, [effectif, setChoix]);

  const cycler = useCallback(() => {
    const i = THEMES.findIndex((t) => t.code === choix);
    setChoix(THEMES[(i + 1) % THEMES.length].code);
  }, [choix, setChoix]);

  const valeur = useMemo<ThemeContextValue>(
    () => ({ choix, effectif, sombre: effectif === 'dark', setChoix, basculer, cycler }),
    [choix, effectif, setChoix, basculer, cycler],
  );

  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>;
}

/**
 * Accès au thème. Hors `ThemeProvider` (tests unitaires d'un composant isolé),
 * la valeur par défaut neutre évite toute exception.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export default ThemeProvider;
