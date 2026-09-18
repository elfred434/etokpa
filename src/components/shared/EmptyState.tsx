import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { TablerIcon } from '@tabler/icons-react';

interface EmptyStateProps {
  icon: TablerIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** État vide centré (panier vide, aucun résultat…) — icône dans un cercle crème. */
export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-xl text-center', className)}>
      <span className="mb-md flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-lighter">
        <Icon size={36} strokeWidth={1.5} className="text-primary" />
      </span>
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && <p className="mt-sm max-w-[320px] text-secondary text-ink-2">{description}</p>}
      {action && <div className="mt-lg">{action}</div>}
    </div>
  );
}
