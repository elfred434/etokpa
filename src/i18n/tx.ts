// Fournit les fonctions utilitaires `tx`, `tr` et `useTx` pour traduire dynamiquement l’interface.
import { useLanguage, type Language } from '../context/LanguageContext';
import { EN } from './phrases';
import { ES } from './phrases-es';
import { DE } from './phrases-de';
import { PT } from './phrases-pt';

const DICTS: Record<Exclude<Language, 'fr'>, Record<string, string>> = { en: EN, es: ES, de: DE, pt: PT };

// Helper uiLang : réalise le traitement métier associé.
export function uiLang(): Language {
  try {
    const saved = localStorage.getItem('tokpa_lang');
    if (saved === 'fr' || saved === 'en' || saved === 'es' || saved === 'de' || saved === 'pt') return saved;
  } catch {
  }
  return 'fr';
}

// Helper tx : réalise le traitement métier associé.
export function tx(fr: string): string {
  if (!fr) return fr;
  const lang = uiLang();
  if (lang === 'fr') return fr;
  return DICTS[lang][fr] ?? EN[fr] ?? fr;
}

// Helper tr : réalise le traitement métier associé.
export function tr(fr: string, en: string): string {
  return uiLang() === 'fr' ? fr : en;
}

// Hook React useTx : encapsule l’état et les effets associés.
export function useTx(): (fr: string) => string {
  const { language } = useLanguage();
  return (fr: string) => {
    if (!fr || language === 'fr') return fr;
    return DICTS[language][fr] ?? EN[fr] ?? fr;
  };
}
