// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ hasSession: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const query = search ? `?${new URLSearchParams(search).toString()}` : '';
    return <a href={`${to}${query}`} {...props}>{children}</a>;
  },
  useNavigate: () => vi.fn(),
}));
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr', isFr: true }) }));
vi.mock('../src/routes/authGuard', () => ({
  hasSession: mocks.hasSession,
  currentRole: vi.fn(),
  rememberSessionUser: vi.fn(),
}));
vi.mock('../src/hooks/useRefresh', () => ({
  silentRefreshActive: () => false,
  useGlobalRefreshTick: () => 0,
}));
vi.mock('../src/services/api', () => ({ authApi: {}, ordersApi: {}, paymentsApi: {} }));
vi.mock('../src/components/layout/client/ClientNavbar', () => ({ default: () => <div data-testid="client-navbar" /> }));
vi.mock('../src/components/layout/client/ClientBottomNav', () => ({ default: () => <div data-testid="client-bottom-nav" /> }));
vi.mock('../src/components/shared/MIcon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span aria-hidden="true" data-icon-name={name} className={className} />
  ),
}));
vi.mock('../src/components/shared/ProfilePhotoField', () => ({ default: () => null }));
vi.mock('../src/components/shared/UserAvatar', () => ({ default: () => null }));
vi.mock('../src/components/client/profil/ProfileLandmarks', () => ({ default: () => null }));

import ProfilePage from '../src/pages/client/profil/ProfilePage';

describe('ProfilePage guest state', () => {
  beforeEach(() => mocks.hasSession.mockReturnValue(false));
  afterEach(() => cleanup());

  it('keeps the message readable and makes the login icon an accessible sign-in action', () => {
    render(<ProfilePage />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Connectez-vous pour voir votre profil',
    });
    const description = screen.getByText('Vos commandes et vos points de repère s’affichent ici.');
    expect(heading.closest('a')).toBeNull();
    expect(description.closest('a')).toBeNull();

    const card = heading.closest('section');
    const main = heading.closest('main');
    expect(card?.className).toContain('max-w-[620px]');
    expect(main?.className).toContain('max-w-[1200px]');
    expect(heading.className).toContain('max-w-[520px]');
    expect(description.className).toContain('max-w-[480px]');
    expect(card?.className).not.toMatch(/\bmax-w-(?:sm|md|lg|xl|[2-7]xl)\b/);

    const loginLinks = screen.getAllByRole('link', { name: 'Se connecter' });
    expect(loginLinks).toHaveLength(2);
    const [iconButton, textButton] = loginLinks;
    for (const link of loginLinks) {
      expect(link.getAttribute('href')).toBe('/connexion?redirect=%2Fprofil');
    }
    expect(iconButton.getAttribute('data-testid')).toBe('profile-login-icon');
    expect(iconButton.getAttribute('title')).toBe('Se connecter');
    expect(iconButton.className).toContain('rounded-full');
    expect(iconButton.querySelector('[data-icon-name="login"]')).not.toBeNull();
    expect(textButton.textContent).toContain('Se connecter');
  });
});
