// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import LoadingState from '../src/components/shared/LoadingState';
import {
  CardsGridSkeleton,
  DetailPanelSkeleton,
  TableSkeleton,
  TrackingSkeleton,
} from '../src/components/shared/Skeleton';

afterEach(() => {
  cleanup();
});

describe('Adaptive skeleton loaders', () => {
  it('renders adaptive skeleton variants via LoadingState with accessible status labels', () => {
    const variants = ['cards', 'rider-cards', 'kpi-cards', 'table', 'detail', 'tracking', 'spinner'] as const;

    for (const variant of variants) {
      const { unmount } = render(
        <LanguageProvider>
          <LoadingState variant={variant} label={`Loading ${variant}`} count={3} />
        </LanguageProvider>,
      );

      const status = screen.getByRole('status');
      expect(status.getAttribute('aria-label')).toBe(`Loading ${variant}`);
      unmount();
    }
  });

  it('renders TableSkeleton, CardsGridSkeleton, DetailPanelSkeleton and TrackingSkeleton with aria-busy', () => {
    const { container } = render(
      <div>
        <TableSkeleton rows={3} cols={4} label="Table loading" />
        <CardsGridSkeleton count={2} variant="rider" label="Riders loading" />
        <DetailPanelSkeleton label="Detail loading" />
        <TrackingSkeleton label="Tracking loading" />
      </div>,
    );

    const statuses = container.querySelectorAll('[role="status"]');
    expect(statuses.length).toBe(4);
    for (const el of statuses) {
      expect(el.getAttribute('aria-busy')).toBe('true');
    }
  });
});
