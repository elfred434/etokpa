// Fournit le contexte React de langue active (fr, en, es, de, pt) avec persistance locale.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../constants/translations';

export type Language = 'fr' | 'en' | 'es' | 'de' | 'pt';

export const LANGUAGES: ReadonlyArray<{ code: Language; label: string }> = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

export const LANGUAGE_CODES: Language[] = LANGUAGES.map((l) => l.code);

// Vérifie la condition métier isLanguage.
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGE_CODES as string[]).includes(value);
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  isFr: boolean;
  isEn: boolean;
  languageLabel: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tokpa_lang';

// Composant React LanguageProvider : prépare l’état et affiche son interface.
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (isLanguage(saved)) return saved;
    } catch {
    }
    return 'fr';
  });

  // Met à jour les données ou l’état via setLanguage.
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    } catch {
    }
  };

  // Helper toggleLanguage : réalise le traitement métier associé.
  const toggleLanguage = () => {
    const index = LANGUAGE_CODES.indexOf(language);
    const next = LANGUAGE_CODES[(index + 1) % LANGUAGE_CODES.length];
    setLanguage(next);
  };

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Helper t : réalise le traitement métier associé.
  const t = (key: string): string => {
    const keys = key.split('.');
    let current: unknown = TRANSLATIONS[language];

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        let fallback: unknown = TRANSLATIONS['fr'];
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbKey];
          } else {
            return key;
          }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }

    return typeof current === 'string' ? current : key;
  };

  // Retourne le rendu JSX du composant.
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isFr: language === 'fr',
        isEn: language === 'en',
        languageLabel: LANGUAGES.find((l) => l.code === language)?.label ?? language,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

// Hook React useLanguage : encapsule l’état et les effets associés.
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage doit être utilisé à l’intérieur d’un LanguageProvider');
  }
  return context;
};
