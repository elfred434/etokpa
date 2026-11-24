// Affiche le squelette de chargement adapté à chaque type d’écran.
import clsx from 'clsx';
import MIcon from './MIcon';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';
import {
  CardsGridSkeleton,
  CatalogListSkeleton,
  CategoryGridSkeleton,
  DetailPanelSkeleton,
  LivreurActiveCardSkeleton,
  LivreurHistorySkeleton,
  LivreurRecapSkeleton,
  LivreurSettingsSkeleton,
  MessagingShellSkeleton,
  NegotiationsListSkeleton,
  NotificationsListSkeleton,
  OrdersTableSkeleton,
  OrderTrackingShellSkeleton,
  ProductDetailSkeleton,
  ProfilePageSkeleton,
  TableSkeleton,
  TrackingSkeleton,
} from './Skeleton';

export type LoadingVariant =
  | 'spinner'
  | 'cards'
  | 'rider-cards'
  | 'kpi-cards'
  | 'categories'
  | 'catalog-list'
  | 'product-detail'
  | 'orders-table'
  | 'tracking-shell'
  | 'notifications'
  | 'messaging'
  | 'negotiations'
  | 'profile'
  | 'livreur-active'
  | 'livreur-history'
  | 'livreur-recap'
  | 'livreur-settings'
  | 'table'
  | 'detail'
  | 'tracking';

// Composant React LoadingState : prépare l’état et affiche son interface.
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

  if (variant === 'table') return <TableSkeleton label={resolvedLabel} className={className} />;
  if (variant === 'detail') return <DetailPanelSkeleton label={resolvedLabel} className={className} />;
  if (variant === 'tracking') return <TrackingSkeleton label={resolvedLabel} className={className} />;
  if (variant === 'categories') return <CategoryGridSkeleton count={count} label={resolvedLabel} className={className} />;
  if (variant === 'catalog-list') return <CatalogListSkeleton count={count} label={resolvedLabel} />;
  if (variant === 'product-detail') return <ProductDetailSkeleton label={resolvedLabel} className={className} />;
  if (variant === 'orders-table') return <OrdersTableSkeleton rows={count} label={resolvedLabel} />;
  if (variant === 'tracking-shell') return <OrderTrackingShellSkeleton label={resolvedLabel} />;
  if (variant === 'notifications') return <NotificationsListSkeleton count={count} label={resolvedLabel} />;
  if (variant === 'messaging') return <MessagingShellSkeleton label={resolvedLabel} />;
  if (variant === 'negotiations') return <NegotiationsListSkeleton count={count} label={resolvedLabel} />;
  if (variant === 'profile') return <ProfilePageSkeleton label={resolvedLabel} />;
  if (variant === 'livreur-active') return <LivreurActiveCardSkeleton label={resolvedLabel} />;
  if (variant === 'livreur-history') return <LivreurHistorySkeleton label={resolvedLabel} />;
  if (variant === 'livreur-recap') return <LivreurRecapSkeleton label={resolvedLabel} />;
  if (variant === 'livreur-settings') return <LivreurSettingsSkeleton label={resolvedLabel} />;

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

  // Retourne le rendu JSX du composant.
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
