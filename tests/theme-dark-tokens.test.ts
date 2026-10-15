/**
 * Mode sombre — garantie de couverture.
 *
 * Ces tests protègent l'invariant central : TOUT jeton de couleur du thème a une
 * valeur sombre, et TOUTE couleur brute encore écrite dans les composants est
 * remappée. Sans cela, un nouveau composant pourrait silencieusement rester
 * clair en mode sombre.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const racine = process.cwd();
const lire = (rel: string) => readFileSync(path.join(racine, rel), 'utf8');

/** Extrait le contenu d'un bloc préfixé par `entete`, accolades équilibrées. */
function bloc(css: string, entete: string): string {
  const debut = css.indexOf(entete);
  if (debut === -1) throw new Error(`Bloc introuvable : ${entete}`);
  let i = css.indexOf('{', debut);
  let profondeur = 0;
  const ouverture = i;
  for (; i < css.length; i++) {
    if (css[i] === '{') profondeur++;
    else if (css[i] === '}') {
      profondeur--;
      if (profondeur === 0) return css.slice(ouverture + 1, i);
    }
  }
  throw new Error(`Bloc non fermé : ${entete}`);
}

const jetons = (css: string) =>
  [...css.matchAll(/(--color-[a-z0-9-]+)\s*:/gi)].map((m) => m[1]);

const THEME = lire('src/theme/theme.css');

describe('mode sombre — couverture des jetons', () => {
  it('chaque jeton de couleur du thème a une valeur sombre', () => {
    const clairs = jetons(bloc(THEME, '@theme {'));
    const sombres = new Set(jetons(bloc(THEME, "[data-theme='dark'] {")));
    const manquants = [...new Set(clairs)].filter((t) => !sombres.has(t));
    expect(manquants, `jetons sans variante sombre : ${manquants.join(', ')}`).toEqual([]);
  });

  it('le variant Tailwind `dark:` est activé (classe .dark)', () => {
    expect(THEME).toContain('@custom-variant dark (&:where(.dark, .dark *));');
  });

  it('`color-scheme` est déclaré pour les deux thèmes (éléments natifs)', () => {
    expect(THEME).toContain("[data-theme='dark']");
    expect(THEME).toMatch(/color-scheme:\s*dark/);
    expect(THEME).toMatch(/color-scheme:\s*light/);
  });

  it('la palette brute utilisée dans les composants est remappée en sombre', () => {
    // Toutes les classes de palette encore présentes dans le code…
    const palette = new Set<string>();
    for (const f of fichiersSources()) {
      const s = lire(f);
      for (const m of s.matchAll(
        /\b(?:bg|text|border|ring|divide|placeholder|from|to|via)-(gray|slate|red|orange|amber|emerald|green|blue|indigo)-\d{2,3}\b/g,
      )) {
        palette.add(`--color-${m[1]}-${m[0].match(/(\d{2,3})$/)![1]}`);
      }
    }
    expect(palette.size).toBeGreaterThan(0);
    const sombres = new Set(jetons(bloc(THEME, "[data-theme='dark'] {")));
    const manquants = [...palette].filter((t) => !sombres.has(t));
    expect(manquants, `couleurs brutes non remappées : ${manquants.join(', ')}`).toEqual([]);
  });
});

describe('mode sombre — garde-fous anti-régression', () => {
  it('aucune surface blanche codée en dur ne subsiste dans les composants', () => {
    const fautifs = fichiersSources().filter((f) => /\bbg-white\b(?!\/)/.test(lire(f)));
    expect(fautifs, `bg-white nu dans : ${fautifs.join(', ')}`).toEqual([]);
  });

  it('aucune classe de jeton inexistante (bg-bg-primary)', () => {
    const fautifs = fichiersSources().filter((f) => lire(f).includes('bg-bg-primary'));
    expect(fautifs).toEqual([]);
  });

  it('le script d’amorçage de index.html est cohérent avec ThemeContext', () => {
    const html = lire('index.html');
    const contexte = lire('src/context/ThemeContext.tsx');
    // Même clé de stockage des deux côtés
    expect(html).toContain('tokpa_theme');
    expect(contexte).toContain("'tokpa_theme'");
    // Le script doit poser le thème avant le module applicatif
    expect(html.indexOf('tokpa_theme')).toBeLessThan(html.indexOf('/src/main.jsx'));
    // Les deux marqueurs que lit le CSS
    expect(html).toContain('data-theme');
    expect(contexte).toContain('dataset.theme');
  });

  it('le fournisseur de thème enveloppe l’application entière', () => {
    const main = lire('src/main.jsx');
    expect(main).toContain('<ThemeProvider>');
    expect(main.indexOf('<ThemeProvider>')).toBeLessThan(main.indexOf('<RouterProvider'));
  });
});

/** Fichiers de composants inspectés par les garde-fous. */
function fichiersSources(): string[] {
  const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const sortie: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(path.join(racine, dossier))) {
      const rel = `${dossier}/${entree}`;
      if (statSync(path.join(racine, rel)).isDirectory()) parcourir(rel);
      else if (/\.(tsx|jsx)$/.test(entree)) sortie.push(rel);
    }
  };
  parcourir('src');
  return sortie;
}
