// Composant d’affichage d’erreur API avec bouton de réessai.
import EmptyState from './EmptyState';
import MIcon from './MIcon';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

interface ApiErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

// Composant React ApiErrorState : prépare l’état et affiche son interface.
export default function ApiErrorState({ title, message, onRetry, className }: ApiErrorStateProps) {
  useLanguage();
  // Retourne le rendu JSX du composant.
  return (
    <EmptyState
      icon={<MIcon name="cloud_off" className="text-4xl text-primary" />}
      title={title}
      description={message}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-primary-container px-lg py-3 font-bold text-white transition-all active:scale-[0.97]"
          >
{tx("Réessayer")}
          </button>
        )
      }
      className={className}
    />
  );
}
