// Sélecteur déroulant de langue (fr, en, es, de, pt).
import { LANGUAGES, useLanguage } from '../../context/LanguageContext';
import MIcon from './MIcon';

// Composant React LangToggle : prépare l’état et affiche son interface.
export default function LangToggle({ className = '' }: { className?: string }) {
  const { language, toggleLanguage } = useLanguage();
  const index = LANGUAGES.findIndex((l) => l.code === language);
  const current = LANGUAGES[index] ?? LANGUAGES[0];
  const next = LANGUAGES[(index + 1) % LANGUAGES.length];
  // Retourne le rendu JSX du composant.
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={`${current.label} → ${next.label}`}
      aria-label={`Langue : ${current.label}. Changer vers ${next.label}.`}
      className={`flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary transition-transform active:scale-95 ${className}`}
    >
      <MIcon name="language" className="text-[16px]" />
      <span>{language}</span>
    </button>
  );
}
