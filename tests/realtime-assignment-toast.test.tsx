// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import { useRealtimeNotifications } from '../src/hooks/useRealtimeNotifications';

const mocks = vi.hoisted(() => ({
  channels: new Map<string, any>(),
  callbacks: new Map<string, (payload: any) => void>(),
  toast: vi.fn(),
  getZones: vi.fn(),
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
  mocks.toast.mockClear();
  mocks.getZones.mockReset();
  mocks.getZones.mockResolvedValue({ data: [] });
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
});
