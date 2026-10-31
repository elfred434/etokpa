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
  /** Classes de présentation adaptées à la barre ou à la navigation latérale. */
  className?: string;
  /** Affiche « Déconnexion » à côté de l'icône. */
  withLabel?: boolean;
  /** Ton clair pour les barres latérales sombres ou colorées. */
  tone?: 'default' | 'inverse';
  /** Action facultative du parent, par exemple fermer le menu mobile. */
  onClick?: () => void;
}

/** Déconnexion partagée : invalide la session côté API puis nettoie toujours la session locale. */
export default function LogoutButton({ className = '', withLabel = false, tone = 'default', onClick }: LogoutButtonProps) {
  useLanguage();
  useAuthRevision();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  if (!hasSession()) return null;

  const logout = async () => {
    if (pending) return;
    onClick?.();
    setPending(true);
    try {
      // authApi.logout() efface la session locale dans son finally, même si le serveur est hors ligne.
      await authApi.logout();
    } catch {
      // L'utilisateur est tout de même déconnecté localement par le service d'authentification.
    }
    toast.success(tx('Déconnexion effectuée'), { id: 'tokpa-logout-done' });
    try {
      await navigate({ to: '/connexion' });
    } finally {
      setPending(false);
    }
  };

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
