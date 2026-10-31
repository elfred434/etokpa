// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  useLiveRows: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock('../src/services/api/useLiveRows', () => ({ useLiveRows: mocks.useLiveRows }));
vi.mock('../src/services/api', () => ({ adminApi: { getCategories: mocks.getCategories } }));
vi.mock('../src/utils/designRuntime', () => ({ useDesignScript: vi.fn() }));
vi.mock('../src/components/layout/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../src/components/shared/MIcon', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: vi.fn() }));
vi.mock('../src/i18n/tx', () => ({ tr: (fr: string) => fr, tx: (text: string) => text }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));

import AdminCatalogPage from '../src/pages/admin/AdminCatalogPage';

describe('AdminCatalogPage product images', () => {
  beforeEach(() => {
    mocks.useLiveRows.mockReturnValue({
      rows: [
        { id: 1, nom: 'Tomate', image_url: 'https://cdn.test/tomate.webp', prix: 500, stock: 10, disponible: true },
        { id: 2, nom: 'Piment', img_url: 'https://cdn.test/piment.webp', prix: 300, stock: 5, disponible: true },
      ],
      err: null,
      loading: false,
      reload: vi.fn(),
    });
    mocks.getCategories.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders both current and legacy image fields without invalid table whitespace warnings', async () => {
    const errors: unknown[][] = [];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args));
    let container: HTMLElement | undefined;
    await act(async () => {
      container = render(<AdminCatalogPage />).container;
      await Promise.resolve();
    });

    const images = Array.from(container!.querySelectorAll('table tbody img')).map((image) => image.getAttribute('src'));
    expect(images).toEqual(['https://cdn.test/tomate.webp', 'https://cdn.test/piment.webp']);
    expect(errors.flat().join(' ')).not.toContain('whitespace text nodes cannot be a child');
    errorSpy.mockRestore();
  });
});
