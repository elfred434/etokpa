import clsx from 'clsx';

/**
 * Briques de squelette adaptatif (thème clair/sombre) pour remplacer les textes
 * « Chargement… » bruts et éviter les sauts de mise en page pendant le chargement.
 */
export function SkeletonBlock({
  className,
  as = 'div',
}: {
  className?: string;
  as?: 'div' | 'span';
}) {
  const Tag = as;
  return (
    <Tag
      aria-hidden="true"
      className={clsx('animate-pulse rounded-md bg-bg-secondary dark:bg-surface-container', className)}
    />
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
  label = 'Chargement du tableau…',
  className,
}: {
  rows?: number;
  cols?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={clsx('w-full overflow-hidden rounded-lg border border-border-default bg-bg-card p-md', className)}
    >
      <div className="grid gap-3 border-b border-border-default pb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, idx) => (
          <SkeletonBlock key={idx} className="h-3.5 w-3/4" />
        ))}
      </div>
      <div className="divide-y divide-border-default">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid items-center gap-3 py-3.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div key={cIdx} className="space-y-1.5">
                <SkeletonBlock className={cIdx === 0 ? 'h-4 w-4/5' : 'h-3.5 w-3/5'} />
                {cIdx === 0 && <SkeletonBlock className="h-2.5 w-1/2" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsGridSkeleton({
  count = 6,
  cols = 3,
  variant = 'product',
  label = 'Chargement des éléments…',
  className,
}: {
  count?: number;
  cols?: 2 | 3 | 4;
  variant?: 'product' | 'rider' | 'kpi';
  label?: string;
  className?: string;
}) {
  const gridCols =
    cols === 4
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : cols === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={clsx('grid gap-4', gridCols, className)}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border-default bg-bg-card p-md shadow-sm space-y-3"
        >
          {variant === 'product' && (
            <>
              <SkeletonBlock className="h-36 w-full rounded-lg" />
              <SkeletonBlock className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <SkeletonBlock className="h-4 w-1/3" />
                <SkeletonBlock className="h-8 w-20 rounded-lg" />
              </div>
            </>
          )}
          {variant === 'rider' && (
            <>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-2/3" />
                  <SkeletonBlock className="h-3 w-1/2" />
                </div>
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
              <SkeletonBlock className="h-3 w-4/5" />
            </>
          )}
          {variant === 'kpi' && (
            <>
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-5 w-5 rounded" />
                <SkeletonBlock className="h-3.5 w-1/2" />
              </div>
              <SkeletonBlock className="h-7 w-2/5" />
              <SkeletonBlock className="h-3 w-1/3" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function DetailPanelSkeleton({
  label = 'Chargement du détail…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={clsx('rounded-lg border border-border-default bg-bg-card p-lg space-y-5', className)}
    >
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-14 w-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
      </div>
      <div className="space-y-2.5 border-t border-border-default pt-4">
        <SkeletonBlock className="h-3.5 w-full" />
        <SkeletonBlock className="h-3.5 w-5/6" />
        <SkeletonBlock className="h-3.5 w-3/4" />
      </div>
      <div className="space-y-2 border-t border-border-default pt-4">
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-14 w-full rounded-xl" />
        <SkeletonBlock className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function TrackingSkeleton({
  label = 'Chargement du suivi…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={clsx('space-y-5 py-md', className)}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-32 rounded-full" />
        <SkeletonBlock className="h-5 w-3/4" />
      </div>
      <div className="grid grid-cols-4 gap-2 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <SkeletonBlock className="h-8 w-8 rounded-full" />
            <SkeletonBlock className="h-2.5 w-14" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="h-16 w-full rounded-lg" />
      <SkeletonBlock className="h-24 w-full rounded-lg" />
    </div>
  );
}
