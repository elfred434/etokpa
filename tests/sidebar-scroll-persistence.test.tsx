// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('../src/components/shared/LogoutButton', () => ({ default: () => <button type="button" /> }));
vi.mock('../src/routes/authGuard', () => ({
  currentRole: () => 'super_admin',
  currentUserName: () => 'Admin TOKPa',
  currentUserZone: () => 'Dantokpa',
  initialsOf: () => 'AT',
  isAdminRole: () => true,
}));
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/admin/cles-api' } }),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode; onClick?: () => void }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import AdminSidebar from '../src/components/layout/admin/AdminSidebar';
import ManagerSidebar from '../src/components/layout/manager/ManagerSidebar';
import { resetPreservedScroll } from '../src/hooks/usePreservedScroll';

describe('sidebar scroll persistence across route navigation', () => {
  beforeEach(() => {
    localStorage.setItem('tokpa_lang', 'fr');
    resetPreservedScroll();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetPreservedScroll();
  });

  it('keeps AdminSidebar aside and nav scrollTop when remounting for a new page', () => {
    const first = render(<AdminSidebar currentPath="/admin/catalogue" />);
    const aside1 = first.container.querySelector('aside')!;
    const nav1 = first.container.querySelector('nav')!;
    aside1.scrollTop = 180;
    fireEvent.scroll(aside1);
    nav1.scrollTop = 340;
    fireEvent.scroll(nav1);

    first.unmount();

    const second = render(<AdminSidebar currentPath="/admin/cles-api" />);
    const aside2 = second.container.querySelector('aside')!;
    const nav2 = second.container.querySelector('nav')!;
    expect(aside2.scrollTop).toBe(180);
    expect(nav2.scrollTop).toBe(340);
  });

  it('does not reset AdminSidebar scrollTop if a mobile close drops scrollTop to 0 before unmount', () => {
    const first = render(<AdminSidebar currentPath="/admin/catalogue" open />);
    const nav1 = first.container.querySelector('nav')!;
    nav1.scrollTop = 290;
    fireEvent.scroll(nav1);

    // Simule un clic qui ferme le tiroir mobile avant le changement de page
    nav1.scrollTop = 0;
    first.unmount();

    const second = render(<AdminSidebar currentPath="/admin/systeme" />);
    expect(second.container.querySelector('nav')!.scrollTop).toBe(290);
  });

  it('keeps ManagerSidebar aside and nav scrollTop across route remounts', () => {
    const first = render(<ManagerSidebar currentPath="/manager" />);
    const aside1 = first.container.querySelector('aside')!;
    const nav1 = first.container.querySelector('nav')!;
    aside1.scrollTop = 95;
    fireEvent.scroll(aside1);
    nav1.scrollTop = 210;
    fireEvent.scroll(nav1);

    first.unmount();

    const second = render(<ManagerSidebar currentPath="/manager/parametres" />);
    expect(second.container.querySelector('aside')!.scrollTop).toBe(95);
    expect(second.container.querySelector('nav')!.scrollTop).toBe(210);
  });
});
