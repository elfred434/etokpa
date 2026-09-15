import type { ReactNode } from 'react';
import clsx from 'clsx';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';

interface AlertProps {
  variant?: 'error' | 'success';
  children: ReactNode;
  /** Remplace l'icône par défaut du variant */
  icon?: ReactNode;
  className?: string;
}

/**
 * Bannière d'alerte — reproduction exacte de la maquette Stitch :
 * fond error-light, bordure error/10, icône 20px, texte error-dark.
 */
export default function Alert({ variant = 'error', children, icon, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        'flex items-center gap-sm rounded-lg border p-md text-label font-medium',
        variant === 'error' && 'border-error/10 bg-error-light text-error-dark',
        variant === 'success' && 'border-success-border bg-success-light text-[#065F46]',
        className,
      )}
    >
      {icon ??
        (variant === 'error' ? (
          <IconAlertCircle size={20} className="shrink-0 text-error" />
        ) : (
          <IconCircleCheck size={20} className="shrink-0 text-success" />
        ))}
      <span>{children}</span>
    </div>
  );
}
