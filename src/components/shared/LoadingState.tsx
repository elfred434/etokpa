import clsx from 'clsx';
import MIcon from './MIcon';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';
import { CardsGridSkeleton, DetailPanelSkeleton, TableSkeleton, TrackingSkeleton } from './Skeleton';

export type LoadingVariant = 'spinner' | 'cards' | 'rider-cards' | 'kpi-cards' | 'table' | 'detail' | 'tracking';

/**
 * État de chargement adaptatif : affiche un squelette fidèle à la section
 * demandée (`cards`, `table`, `detail`, `tracking`, etc.) ou un spinner léger.
 */
export default function LoadingState({
  label,
  className,
  variant = 'cards',
  count = 4,
  cols = 3,
}: {
  label?: string;
  className?: string;
  variant?: LoadingVariant;
  count?: number;
  cols?: 2 | 3 | 4;
}) {
  useLanguage();
  const resolvedLabel = label ?? tx('Chargement…');

  if (variant === 'table') {
    return <TableSkeleton label={resolvedLabel} className={className} />;
  }
  if (variant === 'detail') {
    return <DetailPanelSkeleton label={resolvedLabel} className={className} />;
  }
  if (variant === 'tracking') {
    return <TrackingSkeleton label={resolvedLabel} className={className} />;
  }
  if (variant === 'cards' || variant === 'rider-cards' || variant === 'kpi-cards') {
    return (
      <CardsGridSkeleton
        count={count}
        cols={cols}
        variant={variant === 'rider-cards' ? 'rider' : variant === 'kpi-cards' ? 'kpi' : 'product'}
        label={resolvedLabel}
        className={className}
      />
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={resolvedLabel}
      className={clsx('flex flex-col items-center justify-center py-xl text-center text-ink-2', className)}
    >
      <MIcon name="sync" className="animate-spin text-4xl text-primary" />
      <p className="mt-sm text-secondary">{resolvedLabel}</p>
    </div>
  );
}
