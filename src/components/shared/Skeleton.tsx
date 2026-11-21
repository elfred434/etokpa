import clsx from 'clsx';

/**
 * Briques de squelette adaptatif (thème clair/sombre) pour remplacer les textes
 * « Chargement… » bruts et refléter fidèlement la mise en page de chaque vue.
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

/**
 * Lignes squelettes à insérer directement dans un `<tbody>` existant afin de
 * conserver les en-têtes réels du tableau pendant le chargement.
 */
export function TableBodySkeletonRows({
  rows = 5,
  cols = 6,
  withAvatar = false,
  label,
}: {
  rows?: number;
  cols?: number;
  withAvatar?: boolean;
  label?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`sk-row-${rIdx}`} aria-label={rIdx === 0 ? label : undefined}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-md py-3.5">
              {cIdx === 0 && withAvatar ? (
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBlock className="h-3.5 w-28" />
                    <SkeletonBlock className="h-2.5 w-20" />
                  </div>
                </div>
              ) : (
                <SkeletonBlock className={cIdx === cols - 1 ? 'ml-auto h-7 w-16 rounded-lg' : 'h-3.5 w-4/5'} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
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
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : cols === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

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
          className="rounded-[14px] border border-border-default bg-bg-card p-md shadow-xs space-y-3"
        >
          {variant === 'product' && (
            <>
              <SkeletonBlock className="h-36 w-full rounded-[10px]" />
              <SkeletonBlock className="h-3 w-1/3" />
              <SkeletonBlock className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <SkeletonBlock className="h-4 w-1/3" />
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
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

/** Grille de catégories de HomePage (icône centrée + titre). */
export function CategoryGridSkeleton({
  count = 4,
  label = 'Chargement des catégories…',
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={clsx('grid grid-cols-2 gap-3 sm:gap-md md:grid-cols-4', className)}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center gap-sm rounded-[14px] border border-transparent bg-warm-low p-4 sm:p-lg"
        >
          <SkeletonBlock className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Liste horizontale pour le catalogue en mode liste. */
export function CatalogListSkeleton({
  count = 5,
  label = 'Chargement des produits…',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="flex flex-col gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-md rounded-xl border-[0.5px] border-line bg-bg-card p-3 sm:p-md"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <SkeletonBlock className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-4 w-44" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Squelette 2 colonnes de ProductPage et PackPage. */
export function ProductDetailSkeleton({
  label = 'Chargement de la fiche…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className={clsx('space-y-4', className)}>
      <div className="flex gap-2 py-2">
        <SkeletonBlock className="h-3.5 w-16" />
        <SkeletonBlock className="h-3.5 w-20" />
        <SkeletonBlock className="h-3.5 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-6 rounded-xl bg-bg-card p-4 pb-8 shadow-sm md:gap-8 md:px-10 md:pb-12 lg:grid-cols-2">
        <div className="space-y-3">
          <SkeletonBlock className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2.5">
            <SkeletonBlock className="h-[54px] w-[54px] rounded-lg" />
            <SkeletonBlock className="h-[54px] w-[54px] rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-5 pt-2">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-3/4" />
            <SkeletonBlock className="h-3.5 w-32" />
          </div>
          <SkeletonBlock className="h-px w-full" />
          <SkeletonBlock className="h-8 w-40" />
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-10 w-32 rounded-lg" />
          </div>
          <SkeletonBlock className="h-36 w-full rounded-lg" />
          <SkeletonBlock className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Squelette du tableau des commandes client (OrdersListPage). */
export function OrdersTableSkeleton({
  rows = 5,
  label = 'Chargement de vos commandes…',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="bg-bg-card rounded-lg border border-border-default overflow-hidden"
    >
      <table className="w-full text-left text-body">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="px-md py-sm"><SkeletonBlock className="h-3 w-12" /></th>
            <th className="hidden px-md py-sm md:table-cell"><SkeletonBlock className="h-3 w-14" /></th>
            <th className="hidden px-md py-sm md:table-cell"><SkeletonBlock className="h-3 w-16" /></th>
            <th className="hidden px-md py-sm md:table-cell"><SkeletonBlock className="h-3 w-14" /></th>
            <th className="px-md py-sm"><SkeletonBlock className="h-3 w-16" /></th>
            <th className="hidden px-md py-sm lg:table-cell"><SkeletonBlock className="h-3 w-16" /></th>
            <th className="hidden px-md py-sm md:table-cell"><SkeletonBlock className="ml-auto h-3 w-14" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="px-md py-3.5"><SkeletonBlock className="h-4 w-16" /></td>
              <td className="hidden px-md py-3.5 md:table-cell"><SkeletonBlock className="h-3.5 w-20" /></td>
              <td className="hidden px-md py-3.5 md:table-cell"><SkeletonBlock className="h-3.5 w-14" /></td>
              <td className="hidden px-md py-3.5 md:table-cell"><SkeletonBlock className="h-4 w-24" /></td>
              <td className="px-md py-3.5"><SkeletonBlock className="h-6 w-24 rounded-full" /></td>
              <td className="hidden px-md py-3.5 lg:table-cell"><SkeletonBlock className="h-3.5 w-28" /></td>
              <td className="hidden px-md py-3.5 md:table-cell"><SkeletonBlock className="ml-auto h-7 w-20 rounded-lg" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Squelette 2 colonnes carte + panneau de suivi (OrderTrackingPage). */
export function OrderTrackingShellSkeleton({
  label = 'Chargement du suivi…',
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="flex flex-grow flex-col pt-[52px] pb-[80px] lg:pb-lg lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:items-stretch lg:gap-lg lg:px-lg"
    >
      <div className="relative h-[420px] w-full sm:h-[520px] lg:h-auto lg:min-h-[620px] lg:rounded-[20px] overflow-hidden bg-bg-secondary dark:bg-surface-container animate-pulse">
        <SkeletonBlock className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-bg-card/80" />
      </div>
      <div className="relative z-40 -mt-8 flex-grow rounded-t-[20px] bg-bg-card px-lg pt-lg pb-xl shadow-sm mx-auto w-full max-w-[800px] lg:mt-0 lg:max-w-none lg:rounded-[20px] lg:px-xl lg:pt-xl">
        <div className="w-12 h-1.5 bg-border-default rounded-full mx-auto mb-lg" />
        <TrackingSkeleton label={label} />
      </div>
    </div>
  );
}

export function NotificationRowsSkeleton({
  count = 5,
  label = 'Chargement des notifications…',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 rounded-xl border border-border-default bg-bg-card p-4">
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SkeletonBlock className="h-4 w-48" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
            <SkeletonBlock className="h-3.5 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Squelette sidebar + liste verticale de notifications (NotificationsPage). */
export function NotificationsListSkeleton({
  count = 5,
  label = 'Chargement des notifications…',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="flex flex-1 max-w-[1200px] w-full mx-auto pb-24">
      <aside className="hidden md:flex w-64 border-r border-border-default bg-bg-card flex-col p-4 gap-3 shrink-0">
        <SkeletonBlock className="h-3 w-16 mt-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full rounded-xl" />
        ))}
        <SkeletonBlock className="mt-auto h-24 w-full rounded-xl" />
      </aside>
      <section className="flex-1 bg-bg-app p-4 sm:p-6 md:p-8 min-w-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="space-y-2 mb-6">
            <SkeletonBlock className="h-7 w-64" />
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <NotificationRowsSkeleton count={count} label={label} />
        </div>
      </section>
    </div>
  );
}

/** Squelette carte clé/valeur 2 colonnes (AdminUserDetailPage). */
export function KeyValueGridSkeleton({
  rows = 8,
  label = 'Chargement de la fiche…',
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={clsx('rounded-lg border border-border-default bg-bg-card p-4 shadow-sm sm:p-lg', className)}
    >
      <div className="grid grid-cols-1 gap-x-xl gap-y-3 lg:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-t border-border-default pt-2 first:border-t-0 first:pt-0">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-3.5 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Squelette 2 panneaux messagerie (MessagingPage). */
export function MessagingShellSkeleton({
  label = 'Chargement de la messagerie…',
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="mt-[52px] flex min-h-0 flex-1">
      <aside className="flex h-full w-full flex-col border-r border-border-default bg-bg-card lg:w-[320px]">
        <div className="p-md flex justify-between items-center border-b border-border-default">
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
        <div className="divide-y divide-border-default">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-md flex gap-md items-center">
              <SkeletonBlock className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-10" />
                </div>
                <SkeletonBlock className="h-3 w-40" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="hidden lg:flex flex-1 flex-col bg-bg-app">
        <div className="flex items-center gap-3 border-b border-border-default bg-bg-card p-md">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-lg space-y-4">
          <SkeletonBlock className="h-12 w-64 rounded-2xl" />
          <SkeletonBlock className="ml-auto h-12 w-56 rounded-2xl" />
          <SkeletonBlock className="h-14 w-72 rounded-2xl" />
        </div>
        <div className="border-t border-border-default bg-bg-card p-md flex gap-3">
          <SkeletonBlock className="h-10 flex-1 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Squelette liste verticale de cartes de négociation (NegotiationsPage). */
export function NegotiationsListSkeleton({
  count = 3,
  label = 'Chargement des négociations…',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="space-y-md">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-card rounded-card p-md shadow-sm border border-border-default flex flex-col sm:flex-row gap-md items-start"
        >
          <SkeletonBlock className="w-24 h-24 rounded-lg shrink-0" />
          <div className="flex-1 w-full space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4 w-44" />
                <SkeletonBlock className="h-3 w-32" />
              </div>
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SkeletonBlock className="h-12 rounded-lg" />
              <SkeletonBlock className="h-12 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Squelette fidèle à la grille 2 colonnes de ProfilePage. */
export function ProfilePageSkeleton({
  label = 'Chargement du profil…',
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-md lg:gap-lg"
    >
      <div className="bg-bg-card rounded-[14px] p-lg border border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md lg:col-span-2">
        <div className="flex items-center gap-md">
          <SkeletonBlock className="h-16 w-16 rounded-full shrink-0" />
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="h-3.5 w-52" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-md lg:col-span-2">
        <div className="bg-bg-card p-md rounded-[10px] border border-border-default flex flex-col items-center gap-2">
          <SkeletonBlock className="h-6 w-12" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <div className="bg-bg-card p-md rounded-[10px] border border-border-default flex flex-col items-center gap-2">
          <SkeletonBlock className="h-6 w-12" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      </div>
      <div className="bg-bg-card rounded-[14px] border border-border-default p-lg space-y-3">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="h-12 w-full rounded-lg" />
        <SkeletonBlock className="h-12 w-full rounded-lg" />
      </div>
      <div className="bg-bg-card rounded-[14px] border border-border-default p-lg space-y-3">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="h-12 w-full rounded-lg" />
        <SkeletonBlock className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Squelette carte de course active (LivreurDashboardPage / LivreurCoursePage). */
export function LivreurActiveCardSkeleton({
  label = 'Chargement de la course…',
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="rounded-lg border border-border-default border-l-4 border-l-primary bg-bg-card p-lg shadow-sm space-y-4"
    >
      <div className="flex items-start justify-between gap-md">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-5 w-24 rounded" />
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-3.5 w-36" />
        </div>
        <div className="space-y-1.5 text-right">
          <SkeletonBlock className="ml-auto h-5 w-24" />
          <SkeletonBlock className="ml-auto h-3 w-16" />
        </div>
      </div>
      <SkeletonBlock className="h-16 w-full rounded-lg" />
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 flex-1 rounded-lg" />
        <SkeletonBlock className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

/** Squelette LivreurHistoryPage (4 KPIs + tableau 8 cols + carte latérale 4 cols). */
export function LivreurHistorySkeleton({
  label = 'Chargement de l’historique…',
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="space-y-xl">
      <div className="grid grid-cols-1 gap-lg md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-default bg-bg-card p-lg space-y-2">
            <SkeletonBlock className="h-3.5 w-32" />
            <SkeletonBlock className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-xl lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-lg">
          <div className="flex gap-sm">
            <SkeletonBlock className="h-9 w-32 rounded-lg" />
            <SkeletonBlock className="h-9 w-28 rounded-lg" />
            <SkeletonBlock className="h-9 w-24 rounded-lg" />
          </div>
          <TableSkeleton rows={5} cols={6} label={label} />
        </div>
        <div className="lg:col-span-4">
          <DetailPanelSkeleton label={label} />
        </div>
      </div>
    </div>
  );
}

/** Squelette LivreurRecapPage (en-tête centré + 2 colonnes résumé). */
export function LivreurRecapSkeleton({
  label = 'Chargement du récapitulatif…',
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="space-y-xl">
      <div className="flex flex-col items-center gap-3">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <SkeletonBlock className="h-7 w-64" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-lg space-y-6 lg:space-y-0">
        <div className="rounded-[14px] border-[0.5px] border-border-default bg-bg-card p-lg space-y-4">
          <SkeletonBlock className="mx-auto h-4 w-28" />
          <SkeletonBlock className="mx-auto h-9 w-44" />
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-default">
            <SkeletonBlock className="h-12 rounded-lg" />
            <SkeletonBlock className="h-12 rounded-lg" />
          </div>
        </div>
        <DetailPanelSkeleton label={label} />
      </div>
    </div>
  );
}

/** Squelette LivreurSettingsPage (grille 12 colonnes : 7 formulaire + 5 zone/statut). */
export function LivreurSettingsSkeleton({
  label = 'Chargement de votre profil…',
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className="grid grid-cols-1 gap-lg lg:grid-cols-12">
      <div className="rounded-[14px] bg-bg-card p-lg shadow-sm lg:col-span-7 space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonBlock className="h-11 rounded-lg" />
          <SkeletonBlock className="h-11 rounded-lg" />
          <SkeletonBlock className="h-11 rounded-lg" />
          <SkeletonBlock className="h-11 rounded-lg" />
        </div>
        <SkeletonBlock className="h-10 w-40 rounded-lg ml-auto" />
      </div>
      <div className="rounded-[14px] bg-bg-card p-lg shadow-sm lg:col-span-5 space-y-4">
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-16 w-full rounded-xl" />
        <SkeletonBlock className="h-16 w-full rounded-xl" />
      </div>
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
      <SkeletonBlock className="h-14 w-full rounded-lg" />
    </div>
  );
}
