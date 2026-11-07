// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppErrorBoundary from '../src/components/errors/AppErrorBoundary';
import RouterErrorFallback from '../src/components/errors/RouterErrorFallback';
import { clearFrontendErrorReports, getFrontendErrorReports } from '../src/services/errors/frontendErrorReporter';

function BrokenView(): never {
  throw new Error('SQLSTATE /srv/internal.php Bearer private-value');
}

beforeEach(() => {
  clearFrontendErrorReports();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  clearFrontendErrorReports();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('safe application error fallbacks', () => {
  it('replaces a React crash with a generic page and a safe reference', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Une erreur inattendue est survenue.' })).toBeTruthy();
    expect(screen.queryByText(/SQLSTATE|internal\.php|private-value/)).toBeNull();
    expect(getFrontendErrorReports().some((report) => report.source === 'react-boundary')).toBe(true);
  });

  it('uses the safe route fallback, records the route error and supports retry', async () => {
    const reset = vi.fn();
    render(<RouterErrorFallback error={new Error('private route stack')} reset={reset} />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/private route stack/)).toBeNull();
    await waitFor(() => {
      expect(getFrontendErrorReports().some((report) => report.source === 'router')).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
