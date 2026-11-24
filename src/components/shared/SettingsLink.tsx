// Lien raccourci vers la page de paramètres de l’espace courant.
import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

export type CheminParametres = '/parametres' | '/admin/parametres' | '/manager/parametres' | '/livreur/parametres';

interface SettingsLinkProps {
  to: CheminParametres;
  className?: string;
  withLabel?: boolean;
}

// Composant React SettingsLink : prépare l’état et affiche son interface.
export default function SettingsLink({ to, className = '', withLabel = false }: SettingsLinkProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const actif = pathname === to;

  // Retourne le rendu JSX du composant.
  return (
    <Link
      to={to}
      title={tx('Paramètres')}
      aria-label={tx('Paramètres')}
      aria-current={actif ? 'page' : undefined}
      className={clsx(
        'flex items-center gap-1.5 rounded-full p-2 text-text-secondary transition-all hover:bg-bg-app hover:text-primary-container active:scale-95',
        actif && 'bg-primary-tint text-primary-deep',
        className,
      )}
    >
      <MIcon name="settings" />
      {withLabel && <span className="hidden text-label font-semibold sm:inline">{tx('Paramètres')}</span>}
    </Link>
  );
}
