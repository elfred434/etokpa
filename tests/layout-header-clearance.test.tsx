// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
vi.mock('../src/hooks/useRefresh', () => ({ useGlobalRefreshTick: () => 0 }));
vi.mock('../src/routes/authGuard', () => ({
  currentRole: () => 'admin',
  currentUserId: () => 1,
  currentUserName: () => 'Admin TOKPa',
  currentUserZone: () => 'Dantokpa',
  isAdminRole: () => true,
  rememberUserZone: vi.fn(),
  useAuthRevision: () => 0,
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('../src/components/shared/MobileTableBridge', () => ({ default: () => null }));
vi.mock('../src/components/shared/RefreshButton', () => ({ default: () => <button type="button" /> }));
vi.mock('../src/components/shared/SettingsLink', () => ({ default: () => <a href="#settings" /> }));
vi.mock('../src/components/shared/LogoutButton', () => ({ default: () => <button type="button" /> }));
vi.mock('../src/components/shared/UserAvatar', () => ({ default: () => <span /> }));
vi.mock('../src/components/layout/admin/AdminSidebar', () => ({ default: () => <aside /> }));
vi.mock('../src/components/layout/admin/AdminNotificationBell', () => ({ default: () => <button type="button" /> }));
vi.mock('../src/components/layout/manager/ManagerSidebar', () => ({ default: () => <aside /> }));
vi.mock('../src/services/api', () => ({
  adminApi: { setManagerZone: vi.fn() },
  catalogApi: { getZones: vi.fn().mockResolvedValue({ data: [] }) },
}));

import AdminLayout from '../src/components/layout/admin/AdminLayout';
import ManagerLayout from '../src/components/layout/manager/ManagerLayout';

describe('fixed header clearance on admin and manager layouts', () => {
  beforeEach(() => {
    localStorage.setItem('tokpa_lang', 'fr');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('keeps AdminLayout main below the 52px fixed header on mobile and desktop', () => {
    const { container } = render(
      <AdminLayout currentPath="/admin/cles-api">
        <div>Contenu</div>
      </AdminLayout>,
    );
    const main = container.querySelector('#admin-main');
    expect(main).not.toBeNull();
    const cls = main!.className.split(/\s+/);
    expect(cls).toContain('pt-[calc(52px+16px)]');
    expect(cls).toContain('lg:pt-[calc(52px+24px)]');
    expect(cls).not.toContain('lg:p-lg');
    expect(cls).not.toContain('p-4');
  });

  it('keeps ManagerLayout main below the 52px fixed header on mobile and desktop', () => {
    const { container } = render(
      <ManagerLayout currentPath="/manager/litiges">
        <div>Contenu</div>
      </ManagerLayout>,
    );
    const main = container.querySelector('#manager-main');
    expect(main).not.toBeNull();
    const cls = main!.className.split(/\s+/);
    expect(cls).toContain('pt-[calc(52px+16px)]');
    expect(cls).toContain('lg:pt-[calc(52px+24px)]');
    expect(cls).not.toContain('lg:p-lg');
    expect(cls).not.toContain('p-4');
  });
});
