// @vitest-environment jsdom
/**
 * Page Paramètres — apparence (thème) et langue, pour les quatre espaces.
 *
 * Les deux réglages vivaient dans deux pastilles à cycle dans les barres de
 * navigation ; ils sont désormais sur une page, en choix explicites. Ces tests
 * vérifient :
 *   - les trois thèmes proposés et l'effet réel du choix (attribut `data-theme`,
 *     classe `.dark`, `color-scheme`, mémorisation `tokpa_theme`) ;
 *   - les cinq langues, l'effet du choix (`<html lang>`, `tokpa_lang`) ;
 *   - l'accès unique depuis les barres (`SettingsLink`) vers la page Paramètres
 *     de chaque espace ;
 *   - l'absence de toute pastille à cycle dans le nouveau panneau.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import { CLE_THEME, ThemeProvider } from '../src/context/ThemeContext';

/* Le composant d'accès utilise `Link` et `useRouterState` : on les remplace par
   des équivalents inertes, comme dans les autres tests de page. */
vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => '/parametres',
  Link: ({ to, children, ...reste }: { to: string; children?: unknown }) => (
    <a href={to} {...reste}>
      {children as never}
    </a>
  ),
}));

import ParametresPanel from '../src/components/settings/ParametresPanel';
import SettingsLink from '../src/components/shared/SettingsLink';

function installerMatchMedia() {
  window.matchMedia = ((requete: string) => ({
    matches: false,
    media: requete,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function monter() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <ParametresPanel />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

const racine = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  installerMatchMedia();
  racine().removeAttribute('data-theme');
  racine().classList.remove('dark');
  racine().removeAttribute('lang');
  vi.clearAllMocks();
});

describe('Paramètres — apparence et langue', () => {
  it('propose les trois thèmes, en choix visibles (pas de cycle)', () => {
    const { container } = monter();
    const options = [...container.querySelectorAll('[data-theme-option]')].map((b) => b.getAttribute('data-theme-option'));
    expect(options).toEqual(['light', 'dark', 'system']);
    for (const libelle of ['Clair', 'Sombre', 'Système']) {
      expect(screen.getByText(libelle), `libellé « ${libelle} »`).toBeTruthy();
    }
    // aucune pastille à cycle (ancien marqueur du bouton de barre) ne subsiste
    expect(container.querySelector('[data-theme-choice]')).toBeNull();
  });

  it('applique le thème choisi et le mémorise', () => {
    const { container } = monter();
    fireEvent.click(container.querySelector('[data-theme-option="dark"]')!);

    expect(racine().getAttribute('data-theme')).toBe('dark');
    expect(racine().classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(CLE_THEME)).toBe('dark');
    expect(container.querySelector('[data-theme-option="dark"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-theme-option="light"]')?.getAttribute('aria-pressed')).toBe('false');

    // le retour à « système » est un choix explicite, mémorisé lui aussi
    fireEvent.click(container.querySelector('[data-theme-option="system"]')!);
    expect(localStorage.getItem(CLE_THEME)).toBe('system');
  });

  it('propose les cinq langues et applique celle qui est choisie', () => {
    const { container } = monter();
    const codes = [...container.querySelectorAll('[data-lang-option]')].map((b) => b.getAttribute('data-lang-option'));
    expect(codes).toEqual(['fr', 'en', 'es', 'de', 'pt']);
    for (const libelle of ['Français', 'English', 'Español', 'Deutsch', 'Português']) {
      expect(screen.getByText(libelle), `libellé « ${libelle} »`).toBeTruthy();
    }

    fireEvent.click(container.querySelector('[data-lang-option="de"]')!);
    expect(localStorage.getItem('tokpa_lang')).toBe('de');
    expect(racine().getAttribute('lang')).toBe('de');
    expect(container.querySelector('[data-lang-option="de"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('annonce le thème effectif et la persistance du choix', () => {
    monter();
    expect(screen.getByText(/Clair ·/)).toBeTruthy();
  });
});

describe('Paramètres — accès depuis les barres', () => {
  it('mène à la page Paramètres de chaque espace', () => {
    for (const chemin of ['/parametres', '/admin/parametres', '/manager/parametres', '/livreur/parametres'] as const) {
      const { unmount } = render(<SettingsLink to={chemin} />);
      const lien = screen.getByLabelText('Paramètres');
      expect(lien.getAttribute('href')).toBe(chemin);
      expect(lien.getAttribute('title')).toBe('Paramètres');
      unmount();
    }
  });

  it('affiche le libellé quand la barre a la place', () => {
    render(<SettingsLink to="/admin/parametres" withLabel />);
    expect(screen.getByText('Paramètres')).toBeTruthy();
  });
});
