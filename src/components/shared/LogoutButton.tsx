// Bouton de déconnexion appelant l’API puis réinitialisant la session locale.
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import { hasSession, useAuthRevision } from '../../routes/authGuard';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';
import MIcon from './MIcon';

interface LogoutButtonProps {
  className?: string;
  withLabel?: boolean;
  tone?: 'default' | 'inverse';
  onClick?: () => void;
}

// Composant React LogoutButton : prépare l’état et affiche son interface.
export default function LogoutButton({ className = '', withLabel = false, tone = 'default', onClick }: LogoutButtonProps) {
  useLanguage();
  useAuthRevision();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  if (!hasSession()) return null;

  // Helper logout : réalise le traitement métier associé.
  const logout = async () => {
    if (pending) return;
    onClick?.();
    setPending(true);
    try {
      await authApi.logout();
    } catch {
    }
    toast.success(tx('Déconnexion effectuée'), { id: 'tokpa-logout-done' });
    try {
      await navigate({ to: '/connexion' });
    } finally {
      setPending(false);
    }
  };

  // Retourne le rendu JSX du composant.
  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      aria-label={tx('Déconnexion')}
      aria-busy={pending}
      title={tx('Déconnexion')}
      data-testid="logout-button"
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg p-2 transition-colors disabled:cursor-wait disabled:opacity-60',
        tone === 'inverse' ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-text-secondary hover:bg-bg-secondary hover:text-error',
        className,
      )}
    >
      <MIcon name={pending ? 'hourglass_top' : 'logout'} className="text-[20px]" />
      {withLabel && <span className="whitespace-nowrap text-label font-semibold">{tx('Déconnexion')}</span>}
    </button>
  );
}
