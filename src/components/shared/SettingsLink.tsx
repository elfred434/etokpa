import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import MIcon from './MIcon';
import { tx } from '../../i18n/tx';

/** Pages Paramètres des quatre espaces. */
export type CheminParametres = '/parametres' | '/admin/parametres' | '/manager/parametres' | '/livreur/parametres';

interface SettingsLinkProps {
  /** Page Paramètres de l'espace courant. */
  to: CheminParametres;
  className?: string;
  /** Affiche le libellé à côté de l'icône. */
  withLabel?: boolean;
}

/**
 * Accès unique aux Paramètres depuis les barres supérieures.
 *
 * Remplace les deux pastilles « langue » et « thème » : un seul engrenage, qui
 * mène à la page Paramètres de l'espace (client `/parametres`, admin, manager,
 * livreur). Les réglages eux-mêmes vivent dans `ParametresPanel`.
 */
export default function SettingsLink({ to, className = '', withLabel = false }: SettingsLinkProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const actif = pathname === to;

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
