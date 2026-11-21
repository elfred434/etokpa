// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import { useRealtimeNotifications } from '../src/hooks/useRealtimeNotifications';

const mocks = vi.hoisted(() => ({
  channels: new Map<string, any>(),
  callbacks: new Map<string, (payload: any) => void>(),
  notificationCallbacks: new Map<string, (payload: any) => void>(),
  toast: vi.fn(),
  getZones: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('../src/services/realtime/echo', () => ({
  windowEcho: () => ({
    private: (name: string) => {
      let channel = mocks.channels.get(name);
      if (!channel) {
        channel = {
          listen: (event: string, callback: (payload: any) => void) => {
            mocks.callbacks.set(`${name}:${event}`, callback);
            return channel;
          },
          notification: (callback: (payload: any) => void) => {
            mocks.notificationCallbacks.set(name, callback);
            return channel;
          },
          stopListening: (event: string, callback: (payload: any) => void) => {
            const key = `${name}:${event}`;
            if (mocks.callbacks.get(key) === callback) mocks.callbacks.delete(key);
            return channel;
          },
        };
        mocks.channels.set(name, channel);
      }
      return channel;
    },
  }),
}));

vi.mock('../src/services/api/catalog', () => ({
  catalogApi: { getZones: mocks.getZones },
}));

vi.mock('../src/services/api/auth', () => ({
  authApi: { getProfile: mocks.getProfile },
}));

vi.mock('react-hot-toast', () => ({
  default: (message: string, options?: unknown) => mocks.toast(message, options),
}));

function renderForUser(user: Record<string, unknown>) {
  localStorage.setItem('tokpa_token', 'test-session');
  localStorage.setItem('tokpa_user', JSON.stringify(user));
  const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;
  return renderHook(() => useRealtimeNotifications(1), { wrapper });
}

function emit(channel: string, payload: unknown) {
  const callback = mocks.callbacks.get(`${channel}:delivery.assigned`);
  if (!callback) throw new Error(`MISSING_ASSIGNMENT_LISTENER:${channel}`);
  act(() => callback(payload));
}

beforeEach(() => {
  localStorage.clear();
  mocks.channels.clear();
  mocks.callbacks.clear();
  mocks.notificationCallbacks.clear();
  mocks.toast.mockClear();
  mocks.getZones.mockReset();
  mocks.getZones.mockResolvedValue({ data: [] });
  mocks.getProfile.mockReset();
  mocks.getProfile.mockResolvedValue({ data: null });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('notifications toast delivery.assigned', () => {
  it('shows a new-course toast to the assigned rider, reading the nested order id', () => {
    renderForUser({ id: 21, role: 'livreur', profil: { zone_id: 4 } });

    expect(mocks.channels.has('notifications.21')).toBe(true);
    emit('notifications.21', { order: { id: 47 } });

    expect(mocks.toast).toHaveBeenCalledWith('Nouvelle course assignée — commande #47.', { icon: '🛵' });
  });

  it('shows a client-focused toast to the customer', () => {
    renderForUser({ id: 22, role: { nom: 'client' } });

    emit('notifications.22', { order_id: 48 });

    expect(mocks.toast).toHaveBeenCalledWith('Un livreur a été assigné à votre commande #48.', { icon: '🛵' });
  });

  it('subscribes the manager to its zone channel and shows the assignment toast', () => {
    renderForUser({ id: 23, role: 'manager', profil: { zone_id: '5' } });

    expect(mocks.channels.has('manager.5')).toBe(true);
    emit('manager.5', { id: 49 });

    expect(mocks.toast).toHaveBeenCalledWith('Un livreur a été assigné à la commande #49.', { icon: '🛵' });
  });

  it('subscribes admins to every zone and cleans up manager listeners on unmount', async () => {
    mocks.getZones.mockResolvedValue({ data: [{ id: 5 }, { id: 8 }] });
    const { unmount } = renderForUser({ id: 24, role: 'super_admin' });

    await waitFor(() => {
      expect(mocks.channels.has('manager.5')).toBe(true);
      expect(mocks.channels.has('manager.8')).toBe(true);
    });
    emit('manager.8', { order: { id: 50 } });
    expect(mocks.toast).toHaveBeenCalledWith('Un livreur a été assigné à la commande #50.', { icon: '🛵' });

    unmount();
    expect(mocks.callbacks.has('manager.5:delivery.assigned')).toBe(false);
    expect(mocks.callbacks.has('manager.8:delivery.assigned')).toBe(false);
  });

  it('uses the English rider toast when English is selected', () => {
    localStorage.setItem('tokpa_lang', 'en');
    renderForUser({ id: 25, role: 'livreur' });

    emit('notifications.25', { id: 51 });

    expect(mocks.toast).toHaveBeenCalledWith('New delivery assigned — order #51.', { icon: '🛵' });
  });

  it('handles RoleChangedNotification and refreshes the active user role', async () => {
    mocks.getProfile.mockResolvedValueOnce({ data: { id: 26, role: { nom: 'admin' } } });
    renderForUser({ id: 26, role: 'client' });

    const cb = mocks.notificationCallbacks.get('notifications.26');
    expect(cb).toBeTypeOf('function');
    act(() =>
      cb!({
        type: 'App\\Notifications\\RoleChangedNotification',
        role: 'admin',
        message: 'Vous êtes maintenant administrateur.',
      }),
    );

    expect(mocks.toast).toHaveBeenCalledWith('Vous êtes maintenant administrateur.', { icon: '🛡️' });
    await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tokpa_user') ?? '{}');
      expect(stored.role).toEqual({ nom: 'admin' });
    });
  });
});
