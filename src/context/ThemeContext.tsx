// Fournit le contexte React de thème (clair, sombre ou système) et applique les classes CSS associées.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ThemeEffectif = 'light' | 'dark';

export const CLE_THEME = 'tokpa_theme';
export const MEDIA_SOMBRE = '(prefers-color-scheme: dark)';

export const THEMES: { code: ThemeChoice; cle: string; icone: string }[] = [
  { code: 'light', cle: 'Clair', icone: 'light_mode' },
  { code: 'dark', cle: 'Sombre', icone: 'dark_mode' },
  { code: 'system', cle: 'Système', icone: 'brightness_auto' },
];

// Helper systemePrefereSombre : réalise le traitement métier associé.
export function systemePrefereSombre(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia?.(MEDIA_SOMBRE)?.matches ?? false;
  } catch {
    return false;
  }
}

// Récupère et normalise les données pour lireChoix.
export function lireChoix(): ThemeChoice {
  if (typeof localStorage === 'undefined') return 'system';
  const v = localStorage.getItem(CLE_THEME);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

// Helper resoudreTheme : réalise le traitement métier associé.
export function resoudreTheme(choix: ThemeChoice, systemeSombre = systemePrefereSombre()): ThemeEffectif {
  if (choix === 'system') return systemeSombre ? 'dark' : 'light';
  return choix;
}

// Helper appliquerTheme : réalise le traitement métier associé.
export function appliquerTheme(effectif: ThemeEffectif): void {
  if (typeof document === 'undefined') return;
  const racine = document.documentElement;
  racine.dataset.theme = effectif;
  racine.classList.toggle('dark', effectif === 'dark');
  racine.style.colorScheme = effectif;
}

interface ThemeContextValue {
  choix: ThemeChoice;
  effectif: ThemeEffectif;
  sombre: boolean;
  setChoix: (choix: ThemeChoice) => void;
  basculer: () => void;
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

// Composant React ThemeProvider : prépare l’état et affiche son interface.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choix, setChoixEtat] = useState<ThemeChoice>(() => lireChoix());
  const [systemeSombre, setSystemeSombre] = useState<boolean>(() => systemePrefereSombre());

  const effectif = resoudreTheme(choix, systemeSombre);

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    appliquerTheme(effectif);
  }, [effectif]);

  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const requete = window.matchMedia(MEDIA_SOMBRE);
    const surChangement = (e: MediaQueryListEvent | MediaQueryList) => setSystemeSombre(!!e.matches);
    setSystemeSombre(requete.matches);
    if (typeof requete.addEventListener === 'function') {
      requete.addEventListener('change', surChangement);
      return () => requete.removeEventListener('change', surChangement);
    }
    requete.addListener?.(surChangement);
    return () => requete.removeListener?.(surChangement);
  }, []);

  const setChoix = useCallback((suivant: ThemeChoice) => {
    setChoixEtat(suivant);
    try {
      localStorage.setItem(CLE_THEME, suivant);
    } catch {
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

  // Retourne le rendu JSX du composant.
  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>;
}

// Hook React useTheme : encapsule l’état et les effets associés.
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export default ThemeProvider;
