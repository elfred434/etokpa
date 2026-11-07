// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureFrontendError,
  clearFrontendErrorReports,
  getFrontendErrorReports,
  installGlobalErrorHandlers,
} from '../src/services/errors/frontendErrorReporter';

beforeEach(() => {
  clearFrontendErrorReports();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  clearFrontendErrorReports();
  sessionStorage.clear();
});

describe('safe frontend error receiver', () => {
  it('stores a redacted summary without the exception message, stack, ID or query string', () => {
    window.history.replaceState({}, '', '/admin/utilisateurs/987654/reset/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef1234?token=private-value');
    const secret = 'Bearer private-value';
    const report = captureFrontendError(new Error(`SQLSTATE ${secret}`), { source: 'window' });

    expect(report.reference).toMatch(/^TKP-/);
    expect(report.route).toBe('/admin/utilisateurs/:id/reset/:id');
    expect(report.errorType).toBe('Error');
    expect(report).not.toHaveProperty('message');
    expect(report).not.toHaveProperty('stack');

    const stored = JSON.stringify(getFrontendErrorReports());
    expect(stored).not.toContain(secret);
    expect(stored).not.toContain('SQLSTATE');
    expect(stored).not.toContain('987654');
    expect(stored).not.toContain('private-value');
  });

  it('deduplicates repeated reports and counts them without retaining raw details', () => {
    const first = captureFrontendError(new TypeError('first detail'), { source: 'window' });
    const second = captureFrontendError(new TypeError('different detail'), { source: 'window' });

    expect(second.reference).toBe(first.reference);
    expect(second.occurrences).toBe(2);
    expect(getFrontendErrorReports()).toHaveLength(1);
  });

  it('keeps a bounded report queue', () => {
    for (let status = 500; status < 530; status += 1) {
      captureFrontendError(new Error(`server detail ${status}`), { source: 'api', status });
    }
    expect(getFrontendErrorReports()).toHaveLength(25);
    expect(JSON.stringify(getFrontendErrorReports())).not.toContain('server detail');
  });

  it('captures uncaught script errors and unhandled promise rejections', () => {
    const uninstall = installGlobalErrorHandlers();
    try {
      window.dispatchEvent(new ErrorEvent('error', { error: new TypeError('private stack detail') }));
      const rejection = new Event('unhandledrejection');
      Object.defineProperty(rejection, 'reason', { value: new Error('private rejection detail') });
      window.dispatchEvent(rejection);

      const reports = getFrontendErrorReports();
      expect(reports.map((report) => report.source)).toEqual(['window', 'unhandled-rejection']);
      const stored = JSON.stringify(reports);
      expect(stored).not.toContain('private stack detail');
      expect(stored).not.toContain('private rejection detail');
    } finally {
      uninstall();
    }
  });
});
