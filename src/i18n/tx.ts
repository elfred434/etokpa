import { useLanguage, type Language } from '../context/LanguageContext';
import { EN } from './phrases';
import { ES } from './phrases-es';
import { DE } from './phrases-de';
import { PT } from './phrases-pt';

/** Dictionnaires par langue cible (clés = phrases françaises). */
const DICTS: Record<Exclude<Language, 'fr'>, Record<string, string>> = { en: EN, es: ES, de: DE, pt: PT };

/** Langue active, lue au moment de l'affichage (le stockage est mis à jour avant le rendu). */
export function uiLang(): Language {
  try {
    const saved = localStorage.getItem('tokpa_lang');
    if (saved === 'fr' || saved === 'en' || saved === 'es' || saved === 'de' || saved === 'pt') return saved;
  } catch {
    // localStorage indisponible (tests, SSR)
  }
  return 'fr';
}

/**
 * Traduit une phrase française connue. Chaîne de repli : dictionnaire de la langue
 * active → anglais → français (noms propres et données API laissés tels quels).
 */
export function tx(fr: string): string {
  if (!fr) return fr;
  const lang = uiLang();
  if (lang === 'fr') return fr;
  return DICTS[lang][fr] ?? EN[fr] ?? fr;
}

/**
 * Paire explicite, pour les phrases construites (prix, numéros).
 * Hors français, la variante anglaise sert de repli commun aux 4 autres langues.
 */
export function tr(fr: string, en: string): string {
  return uiLang() === 'fr' ? fr : en;
}

/** Abonne le composant au changement de langue, puis traduit (mêmes replis que tx). */
export function useTx(): (fr: string) => string {
  const { language } = useLanguage();
  return (fr: string) => {
    if (!fr || language === 'fr') return fr;
    return DICTS[language][fr] ?? EN[fr] ?? fr;
  };
}
