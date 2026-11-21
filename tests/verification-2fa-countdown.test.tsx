// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify2fa: vi.fn(),
  resend2fa: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => mocks.navigate,
}));

vi.mock('../src/services/api', () => ({
  authApi: {
    verify2fa: (...args: unknown[]) => mocks.verify2fa(...args),
    resend2fa: (...args: unknown[]) => mocks.resend2fa(...args),
  },
}));

vi.mock('../src/components/shared/LangToggle', () => ({ default: () => null }));
vi.mock('../src/routes/authGuard', () => ({
  currentRole: () => 'client',
  hasSession: () => false,
  postLoginTarget: () => '/catalogue',
}));
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: vi.fn() }));
vi.mock('../src/i18n/tx', () => ({ tx: (value: string) => value, tr: (fr: string) => fr }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import Verification2faPage from '../src/pages/auth/Verification2faPage';
import { clearTwoFaSession, startTwoFaSession } from '../src/utils/twoFaTimer';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearTwoFaSession();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-16T12:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Verification2faPage countdown persistence', () => {
  it('keeps the remaining countdown across page reloads instead of resetting to 10:00', () => {
    startTwoFaSession('elfred434@gmail.com');

    const { unmount } = render(<Verification2faPage />);
    expect(screen.getByText(/Le code expire dans 10:00/)).toBeTruthy();

    vi.advanceTimersByTime(90_000);
    unmount();

    // Simule une actualisation (F5) : nouveau montage avec l'horloge avancée de 90s
    render(<Verification2faPage />);
    expect(screen.getByText(/Le code expire dans 08:30/)).toBeTruthy();
  });

  it('stays expired across reloads once deadline has passed, and resets only on resend', async () => {
    startTwoFaSession('elfred434@gmail.com');
    vi.advanceTimersByTime(10 * 60_000 + 5_000);

    const { unmount } = render(<Verification2faPage />);
    expect(screen.getByText('Code expiré')).toBeTruthy();
    unmount();

    render(<Verification2faPage />);
    expect(screen.getByText('Code expiré')).toBeTruthy();

    mocks.resend2fa.mockResolvedValueOnce({ success: true });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer le code' }));

    await waitFor(() => expect(mocks.resend2fa).toHaveBeenCalledWith('elfred434@gmail.com'));
    await waitFor(() => expect(screen.getByText(/Le code expire dans 10:00/)).toBeTruthy());
  });
});
