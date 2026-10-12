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
 * Sélecteur de langue en liste déroulante (native `<select>`) : affiche les 5 langues
 * avec leur nom natif et enregistre le choix via `setLanguage` (persisté dans `tokpa_lang`).
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
      className={`inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary focus-within:ring-2 focus-within:ring-primary/40 ${className}`}
    >
      <MIcon name="language" className="pointer-events-none text-[16px]" />
      <select
        value={language}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={tx('Langue')}
        className="cursor-pointer bg-transparent pr-1 text-xs font-bold text-current outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-ink">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
