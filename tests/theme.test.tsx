// @vitest-environment jsdom
/**
 * Mode sombre — moteur de thème (choix clair / sombre / système) et bouton.
 *
 * Vérifie la mécanique complète : amorçage, priorité du choix mémorisé, cycle
 * du bouton, suivi en direct de la préférence système, et synchronisation des
 * trois marqueurs utilisés par le CSS (`data-theme`, classe `.dark`,
 * `color-scheme`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/context/LanguageContext';
import {
  CLE_THEME,
  ThemeProvider,
  appliquerTheme,
  resoudreTheme,
  useTheme,
} from '../src/context/ThemeContext';
import ThemeToggle from '../src/components/shared/ThemeToggle';

/* ------------------------------------------------------------------ *
 * Faux `matchMedia` : jsdom n'en fournit pas, et le mode « système »
 * a besoin de pouvoir simuler la préférence et ses changements.
 * ------------------------------------------------------------------ */
type Ecouteur = (e: { matches: boolean }) => void;
let ecouteurs: Ecouteur[] = [];
let systemeSombre = false;

function installerMatchMedia() {
  ecouteurs = [];
  window.matchMedia = ((requete: string) => ({
    matches: systemeSombre,
    media: requete,
    onchange: null,
    addEventListener: (_type: string, cb: Ecouteur) => {
      ecouteurs.push(cb);
    },
    removeEventListener: (_type: string, cb: Ecouteur) => {
      ecouteurs = ecouteurs.filter((x) => x !== cb);
    },
    addListener: (cb: Ecouteur) => {
      ecouteurs.push(cb);
    },
    removeListener: (cb: Ecouteur) => {
      ecouteurs = ecouteurs.filter((x) => x !== cb);
    },
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;
}

/** Simule un basculement du thème par le système d'exploitation. */
function systemeChange(sombre: boolean) {
  systemeSombre = sombre;
  act(() => {
    ecouteurs.forEach((cb) => cb({ matches: sombre }));
  });
}

const racine = () => document.documentElement;

function Sonde() {
  const { choix, effectif } = useTheme();
  return (
    <span data-testid="sonde">
      {choix}|{effectif}
    </span>
  );
}

function monter(avecBouton = false) {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        {avecBouton ? <ThemeToggle /> : null}
        <Sonde />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tokpa_lang', 'fr');
  systemeSombre = false;
  installerMatchMedia();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
  vi.clearAllMocks();
});

describe('mode sombre — moteur de thème', () => {
  it('suit la préférence système quand aucun choix n’est mémorisé', () => {
    systemeSombre = true;
    monter();
    expect(screen.getByTestId('sonde').textContent).toBe('system|dark');
    expect(racine().dataset.theme).toBe('dark');
    expect(racine().classList.contains('dark')).toBe(true);
    expect(racine().style.colorScheme).toBe('dark');
  });

  it('reste en clair si le système est clair', () => {
    monter();
    expect(screen.getByTestId('sonde').textContent).toBe('system|light');
    expect(racine().dataset.theme).toBe('light');
    expect(racine().classList.contains('dark')).toBe(false);
  });

  it('donne la priorité au choix mémorisé sur la préférence système', () => {
    systemeSombre = true;
    localStorage.setItem(CLE_THEME, 'light');
    monter();
    expect(screen.getByTestId('sonde').textContent).toBe('light|light');
    expect(racine().dataset.theme).toBe('light');
  });

  it('le bouton cycle clair → sombre → système, et mémorise le choix', () => {
    monter(true);
    const bouton = screen.getByRole('button');

    act(() => bouton.click()); // clair
    expect(localStorage.getItem(CLE_THEME)).toBe('light');
    expect(screen.getByTestId('sonde').textContent).toBe('light|light');

    act(() => bouton.click()); // sombre
    expect(localStorage.getItem(CLE_THEME)).toBe('dark');
    expect(screen.getByTestId('sonde').textContent).toBe('dark|dark');
    expect(racine().dataset.theme).toBe('dark');
    expect(racine().style.colorScheme).toBe('dark');

    act(() => bouton.click()); // système
    expect(localStorage.getItem(CLE_THEME)).toBe('system');
    expect(screen.getByTestId('sonde').textContent).toBe('system|light');
  });

  it('suit en direct un changement du système en mode « système »', () => {
    monter();
    expect(racine().dataset.theme).toBe('light');
    systemeChange(true);
    expect(racine().dataset.theme).toBe('dark');
    expect(racine().classList.contains('dark')).toBe(true);
    systemeChange(false);
    expect(racine().dataset.theme).toBe('light');
  });

  it('un choix explicite ne bouge plus quand le système change', () => {
    localStorage.setItem(CLE_THEME, 'light');
    monter();
    systemeChange(true);
    expect(racine().dataset.theme).toBe('light');
    expect(screen.getByTestId('sonde').textContent).toBe('light|light');
  });

  it('le bouton annonce le thème courant et le suivant', () => {
    localStorage.setItem(CLE_THEME, 'light');
    monter(true);
    const bouton = screen.getByRole('button');
    expect(bouton.getAttribute('title')).toBe('Thème : Clair → Sombre');
    expect(bouton.getAttribute('aria-label')).toContain('Thème');
  });

  it('résout correctement les combinaisons choix × système', () => {
    expect(resoudreTheme('light', true)).toBe('light');
    expect(resoudreTheme('dark', false)).toBe('dark');
    expect(resoudreTheme('system', true)).toBe('dark');
    expect(resoudreTheme('system', false)).toBe('light');
  });

  it('applique les trois marqueurs attendus par le CSS', () => {
    appliquerTheme('dark');
    expect(racine().dataset.theme).toBe('dark');
    expect(racine().classList.contains('dark')).toBe(true);
    expect(racine().style.colorScheme).toBe('dark');
    appliquerTheme('light');
    expect(racine().dataset.theme).toBe('light');
    expect(racine().classList.contains('dark')).toBe(false);
  });

  it('ne plante pas si matchMedia est absent (environnements anciens)', () => {
    // @ts-expect-error — on simule un navigateur sans matchMedia
    delete window.matchMedia;
    expect(() => monter()).not.toThrow();
    expect(racine().dataset.theme).toBe('light');
  });
});
