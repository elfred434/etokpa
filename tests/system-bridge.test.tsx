// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useCartSync: vi.fn(),
  useAutoRefresh: vi.fn(),
  useRealtimeNotifications: vi.fn(),
}));

vi.mock('../src/hooks/useCartSync', () => ({ useCartSync: mocks.useCartSync }));
vi.mock('../src/hooks/useRefresh', () => ({ useAutoRefresh: mocks.useAutoRefresh }));
vi.mock('../src/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: mocks.useRealtimeNotifications,
}));

import SystemBridge from '../src/components/system/SystemBridge';

function renderBridge() {
  return render(<SystemBridge />);
}

function setSession(user?: unknown) {
  localStorage.setItem('tokpa_token', 'test-session');
  if (user !== undefined) localStorage.setItem('tokpa_user', JSON.stringify(user));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SystemBridge server-cart role gate', () => {
  it('does not start cart sync for a manager, but keeps realtime notifications active', () => {
    setSession({ id: 37, role: { nom: 'manager' }, profil: { zone_id: 5 } });

    renderBridge();

    expect(mocks.useCartSync).toHaveBeenCalledWith(0);
    expect(mocks.useRealtimeNotifications).toHaveBeenCalledWith(1);
  });

  it('does not start cart sync for a delivery rider', () => {
    setSession({ id: 41, role: 'livreur' });

    renderBridge();

    expect(mocks.useCartSync).toHaveBeenCalledWith(0);
  });

  it.each([
    ['client', { role: { nom: 'client' } }],
    ['admin', { role: 'admin' }],
    ['super-admin', { role: 'super_admin' }],
  ])('keeps server-cart sync enabled for %s accounts', (_label, user) => {
    setSession(user);

    renderBridge();

    expect(mocks.useCartSync).toHaveBeenCalledWith(1);
  });

  it('fails closed when the stored role is absent or malformed', () => {
    setSession({ id: 9 });
    renderBridge();
    expect(mocks.useCartSync).toHaveBeenCalledWith(0);

    cleanup();
    mocks.useCartSync.mockClear();
    localStorage.setItem('tokpa_user', '{');
    renderBridge();
    expect(mocks.useCartSync).toHaveBeenCalledWith(0);
  });

  it('re-evaluates cart access after the auth-changed event', () => {
    setSession({ id: 37, role: 'manager' });
    renderBridge();
    expect(mocks.useCartSync).toHaveBeenCalledWith(0);

    localStorage.setItem('tokpa_user', JSON.stringify({ id: 37, role: 'client' }));
    act(() => window.dispatchEvent(new Event('tokpa:auth-changed')));

    const lastCartKey = mocks.useCartSync.mock.lastCall?.[0] as number | undefined;
    expect(lastCartKey).toBeGreaterThan(0);
  });

  it('does not enable cart sync without a token, even when a client profile remains', () => {
    localStorage.setItem('tokpa_user', JSON.stringify({ role: 'client' }));

    renderBridge();

    expect(mocks.useCartSync).toHaveBeenCalledWith(0);
  });
});
