import LanguageSelect from './LanguageSelect';

/** Sélecteur de langue (liste déroulante) utilisé par les espaces admin, manager, livreur et l'auth. */
export default function LangToggle({ className = '' }: { className?: string }) {
  return <LanguageSelect className={className} />;
}
