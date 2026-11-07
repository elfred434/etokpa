import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { extractApiError, formatApiError } from '../src/utils/apiError';
import { clearFrontendErrorReports, getFrontendErrorReports } from '../src/services/errors/frontendErrorReporter';

describe('API error handling', () => {
  beforeEach(() => {
    clearFrontendErrorReports();
    sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());
  it('extracts Laravel validation errors', () => {
    const info = extractApiError({ response: { status: 422, data: { message: 'Validation failed', errors: { email: ['Email invalide'] } } } });
    expect(info.status).toBe(422);
    expect(formatApiError(info)).toContain('email : Email invalide');
  });
  it('adds CSRF context to 419 errors', () => expect(extractApiError({ response: { status: 419, data: {} } }).message).toContain('CSRF'));
  it('does not report raw cancellation details', () => {
    const info = extractApiError({ name: 'CanceledError', code: 'ERR_CANCELED', message: 'cancelled' });
    expect(info.status).toBeNull();
    expect(formatApiError(info)).toContain('service est momentanément indisponible');
    expect(getFrontendErrorReports()).toHaveLength(0);
  });

  it('recognizes network failures without exposing the backend address or raw message', () => {
    const info = extractApiError({ message: 'Network Error at https://internal.test/api?token=private-value' });
    const text = formatApiError(info);
    expect(text).toContain('[Réseau]');
    expect(text).not.toContain('internal.test');
    expect(text).not.toContain('private-value');
    expect(info.reference).toMatch(/^TKP-/);
  });

  it('shows a redacted server message in development while storing only a safe summary', () => {
    const info = extractApiError({
      response: {
        status: 500,
        data: {
          message: 'SQLSTATE[08006] at /srv/private.php; Bearer private-token-value\n at /srv/stack.php:99\n#0 /srv/vendor/Database.php(99)\nhttps://internal.test/api?token=private',
          errors: { debug: ['internal stack trace'] },
        },
      },
    });
    const text = formatApiError(info);
    expect(text).toContain('[HTTP 500]');
    expect(text).toContain('SQLSTATE[08006]');
    expect(text).toContain(info.reference);
    expect(text).not.toContain('private-token-value');
    expect(text).not.toContain('/srv/stack.php:99');
    expect(text).not.toContain('vendor/Database.php');
    expect(text).not.toContain('internal.test');
    expect(info.fieldErrors).toEqual({});

    const report = JSON.stringify(getFrontendErrorReports());
    expect(report).not.toContain('SQLSTATE');
    expect(report).not.toContain('private-token-value');
    expect(report).not.toContain('stack trace');
  });

  it('keeps server failures generic outside development', () => {
    vi.stubEnv('DEV', false);
    const info = extractApiError({
      response: { status: 500, data: { message: 'SQLSTATE[08006] private detail' } },
    });
    const text = formatApiError(info);
    expect(text).toContain('erreur interne');
    expect(text).not.toContain('SQLSTATE');
  });

  it('shows detailed 4xx and validation messages during development', () => {
    const info = extractApiError({
      response: {
        status: 422,
        data: {
          message: 'SQLSTATE[08006] at /srv/private.php',
          errors: {
            email: ['The email field is required.'],
            debug: ['Illuminate\\\\Database\\\\QueryException at /srv/private.php'],
          },
        },
      },
    });
    const text = formatApiError(info);
    expect(text).toContain('SQLSTATE[08006]');
    expect(text).toContain('email : The email field is required.');
    expect(text).toContain('QueryException');
    expect(info.fieldErrors.debug).toContain('Illuminate\\\\Database\\\\QueryException at /srv/private.php');
  });

  it('filters technical 4xx details outside development but keeps normal validation messages', () => {
    vi.stubEnv('DEV', false);
    const info = extractApiError({
      response: {
        status: 422,
        data: {
          message: 'SQLSTATE[08006] at /srv/private.php',
          errors: {
            email: ['The email field is required.'],
            debug: ['Illuminate\\\\Database\\\\QueryException at /srv/private.php'],
          },
        },
      },
    });
    const text = formatApiError(info);
    expect(text).toContain('Erreur HTTP 422');
    expect(text).toContain('email : The email field is required.');
    expect(text).not.toContain('SQLSTATE');
    expect(text).not.toContain('QueryException');
    expect(info.fieldErrors).toEqual({ email: ['The email field is required.'] });
  });

  it('keeps useful 422 validation feedback while redacting credential-shaped text', () => {
    const info = extractApiError({
      response: {
        status: 422,
        data: {
          message: 'Validation failed',
          errors: {
            email: ['Email invalide'],
            password: ['Bearer hidden-credential'],
            token: ['access_token=hidden-access-token'],
            confirmation: ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.signaturevaluehere'],
          },
        },
      },
    });
    const text = formatApiError(info);
    expect(text).toContain('email : Email invalide');
    expect(text).toContain('password : Bearer [redacted]');
    expect(text).not.toContain('hidden-credential');
    expect(text).not.toContain('hidden-access-token');
    expect(text).not.toContain('signaturevaluehere');
  });
});
