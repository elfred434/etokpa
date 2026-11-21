// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import LoadingState, { type LoadingVariant } from '../src/components/shared/LoadingState';
import {
  CardsGridSkeleton,
  DetailPanelSkeleton,
  KeyValueGridSkeleton,
  MessagingShellSkeleton,
  NotificationsListSkeleton,
  OrdersTableSkeleton,
  ProductDetailSkeleton,
  ProfilePageSkeleton,
  TableBodySkeletonRows,
  TableSkeleton,
  TrackingSkeleton,
} from '../src/components/shared/Skeleton';

afterEach(() => {
  cleanup();
});

describe('Adaptive skeleton loaders', () => {
  it('renders all page-accurate LoadingState variants with accessible status labels', () => {
    const variants: LoadingVariant[] = [
      'cards',
      'rider-cards',
      'kpi-cards',
      'categories',
      'catalog-list',
      'product-detail',
      'orders-table',
      'tracking-shell',
      'notifications',
      'messaging',
      'negotiations',
      'profile',
      'livreur-active',
      'livreur-history',
      'livreur-recap',
      'livreur-settings',
      'table',
      'detail',
      'tracking',
      'spinner',
    ];

    for (const variant of variants) {
      const { unmount } = render(
        <LanguageProvider>
          <LoadingState variant={variant} label={`Loading ${variant}`} count={3} />
        </LanguageProvider>,
      );

      const statuses = screen.getAllByRole('status');
      expect(statuses.length).toBeGreaterThanOrEqual(1);
      expect(statuses[0].getAttribute('aria-label')).toBe(`Loading ${variant}`);
      unmount();
    }
  });

  it('renders base and page-accurate skeletons with aria-busy and matching layout primitives', () => {
    const { container } = render(
      <div>
        <TableSkeleton rows={3} cols={4} label="Table loading" />
        <CardsGridSkeleton count={2} variant="rider" label="Riders loading" />
        <DetailPanelSkeleton label="Detail loading" />
        <TrackingSkeleton label="Tracking loading" />
        <ProductDetailSkeleton label="Product loading" />
        <OrdersTableSkeleton rows={3} label="Orders loading" />
        <NotificationsListSkeleton count={3} label="Notifications loading" />
        <MessagingShellSkeleton label="Messaging loading" />
        <ProfilePageSkeleton label="Profile loading" />
        <KeyValueGridSkeleton rows={4} label="User detail loading" />
      </div>,
    );

    const statuses = container.querySelectorAll('[role="status"]');
    expect(statuses.length).toBeGreaterThanOrEqual(10);
    for (const el of statuses) {
      expect(el.getAttribute('aria-busy')).toBe('true');
    }
    expect(container.querySelector('.aspect-square')).not.toBeNull();
    expect(container.querySelector('.lg\\:grid-cols-2')).not.toBeNull();
    expect(container.querySelector('.lg\\:w-\\[320px\\]')).not.toBeNull();
  });

  it('renders TableBodySkeletonRows directly as tr/td cells inside tbody', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableBodySkeletonRows rows={4} cols={6} withAvatar label="Loading rows" />
        </tbody>
      </table>,
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    expect(rows[0].querySelectorAll('td').length).toBe(6);
  });

  it('renders admin table skeletons inside tbody instead of detached above header', () => {
    const adminTables = [
      'src/pages/admin/AdminCatalogPage.tsx',
      'src/pages/admin/AdminUsersPage.tsx',
      'src/pages/admin/AdminValidationsPage.tsx',
    ];
    for (const rel of adminTables) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf-8');
      expect(src).toContain('TableBodySkeletonRows');
      expect(src).not.toContain('<TableSkeleton');
    }
  });
});
