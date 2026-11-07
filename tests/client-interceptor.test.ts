import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/api/client';
import { clearFrontendErrorReports, getFrontendErrorReports } from '../src/services/errors/frontendErrorReporter';

type Rejected = (error: unknown) => Promise<unknown>;

function responseRejected(): Rejected {
  const handlers = (apiClient.interceptors.response as unknown as { handlers: Array<{ rejected: Rejected }> }).handlers;
  return handlers[0].rejected;
}

describe('API client session interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearFrontendErrorReports();
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });

  it('adds the bearer token when a session exists', async () => {
    localStorage.setItem('tokpa_token', 'abc');
    const handlers = (apiClient.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (config: { headers: Record<string, string> }) => unknown }>;
    }).handlers;
    const config = await handlers[0].fulfilled({ headers: {} });
    expect(config).toMatchObject({ headers: { Authorization: 'Bearer abc' } });
  });

  it('clears a dead session and announces it on 401', async () => {
    localStorage.setItem('tokpa_token', 'abc');
    localStorage.setItem('tokpa_user', '{}');
    await expect(responseRejected()({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('tokpa_token')).toBeNull();
    expect(window.dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it('does not announce a 401 for a visitor', async () => {
    await expect(responseRejected()({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('leaves the session intact and captures a safe summary for server failures', async () => {
    localStorage.setItem('tokpa_token', 'abc');
    const error = { response: { status: 500, data: { message: 'SQLSTATE private backend detail' } } };
    await expect(responseRejected()(error)).rejects.toBeTruthy();
    expect(localStorage.getItem('tokpa_token')).toBe('abc');
    expect(getFrontendErrorReports()).toMatchObject([{ source: 'api', status: 500 }]);
    expect(JSON.stringify(getFrontendErrorReports())).not.toContain('SQLSTATE');
  });
});
