import { LANGUAGES, isLanguage, useLanguage, type Language } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';
import MIcon from './MIcon';

interface LanguageSelectProps {
  /** Classes du conteneur (couleurs, bordure, taille) : chaque écran garde son style. */
  className?: string;
  /** Appelé après le changement de langue (ex. notification). */
  onChange?: (lang: Language) => void;
}

/**
 * Sélecteur de langue en liste déroulante stylisée : affiche le code de la langue
 * (FR, EN, ES, DE, PT) et enregistre le choix via `setLanguage` (persisté dans `tokpa_lang`).
 */
export default function LanguageSelect({ className = '', onChange }: LanguageSelectProps) {
  const { language, setLanguage } = useLanguage();

  const handleChange = (value: string) => {
    if (!isLanguage(value)) return;
    setLanguage(value);
    onChange?.(value);
  };

  return (
    <div
      className={`relative inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pl-2.5 pr-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15 focus-within:ring-2 focus-within:ring-primary/40 ${className}`}
    >
      <MIcon name="language" className="pointer-events-none text-[16px]" />
      <select
        value={language}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={tx('Langue')}
        title={tx('Langue')}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-xs font-bold uppercase tracking-wide text-current outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-surface font-semibold text-ink">
            {l.code.toUpperCase()}
          </option>
        ))}
      </select>
      <MIcon name="expand_more" className="pointer-events-none absolute right-2 text-[14px]" />
    </div>
  );
}
