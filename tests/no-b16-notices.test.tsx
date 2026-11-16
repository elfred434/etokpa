// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
vi.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', resolved: 'light', setTheme: vi.fn() }),
}));
vi.mock('../src/utils/designRuntime', () => ({ useDesignScript: () => undefined }));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('../src/components/settings/ParametresPanel', () => ({ default: () => <div data-testid="parametres-panel" /> }));
vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/layout/manager/ManagerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../src/services/api', () => ({
  adminApi: {
    getZones: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

import AdminClesApiPage from '../src/pages/admin/AdminClesApiPage';
import AdminBddPage from '../src/pages/admin/AdminBddPage';
import AdminParametresPage from '../src/pages/admin/AdminParametresPage';
import AdminSystemePage from '../src/pages/admin/AdminSystemePage';
import AdminSecuritePage from '../src/pages/admin/AdminSecuritePage';
import ManagerParametresPage from '../src/pages/manager/ManagerParametresPage';
import ManagerLitigesPage from '../src/pages/manager/ManagerLitigesPage';

describe('removed mockup / B-16 notices', () => {
  beforeEach(() => {
    localStorage.setItem('tokpa_lang', 'fr');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it.each([
    ['AdminClesApiPage', AdminClesApiPage],
    ['AdminBddPage', AdminBddPage],
    ['AdminParametresPage', AdminParametresPage],
    ['AdminSystemePage', AdminSystemePage],
    ['AdminSecuritePage', AdminSecuritePage],
    ['ManagerParametresPage', ManagerParametresPage],
    ['ManagerLitigesPage', ManagerLitigesPage],
  ])('%s does not render B-16 or mockup notices', (_name, Page) => {
    const { container } = render(<Page />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Non branché/i);
    expect(text).not.toMatch(/B-16/i);
    expect(text).not.toMatch(/aperçu maquette/i);
    expect(text).not.toMatch(/design Stitch/i);
    expect(text).not.toMatch(/aucune donnée réelle/i);
    expect(text).not.toMatch(/\bMAQUETTE\b/);
  });
});
