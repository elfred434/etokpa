/**
 * Mode sombre — garantie de couverture.
 *
 * Ces tests protègent l'invariant central : TOUT jeton de couleur du thème a une
 * valeur sombre, et TOUTE couleur brute encore écrite dans les composants est
 * remappée. Sans cela, un nouveau composant pourrait silencieusement rester
 * clair en mode sombre.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
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

  it('aucune couleur claire codée en dur ne subsiste en fond (cause d’éblouissement)', () => {
    const fautifs: string[] = [];
    for (const f of fichiersSources()) {
      for (const [i, ligne] of lire(f).split('\n').entries()) {
        for (const m of ligne.matchAll(/\b(?:bg|from|via|to|fill|stroke)-\[#([0-9a-fA-F]{3,8})\]/g)) {
          let h = m[1];
          if (h.length === 3) h = [...h].map((c) => c + c).join('');
          const canaux = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
          const f2 = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
          const L = 0.2126 * f2(canaux[0]) + 0.7152 * f2(canaux[1]) + 0.0722 * f2(canaux[2]);
          if (L > 0.5) fautifs.push(`${f}:${i + 1} → ${m[0]}`);
        }
      }
    }
    expect(fautifs, `fonds clairs codés en dur : ${fautifs.join(' | ')}`).toEqual([]);
  });

  it('chaque fond clair figé dans les classes de composants a sa contrepartie sombre', () => {
    // Architecture retenue : les valeurs du thème clair restent intactes dans la
    // couche « components » (aucune dérive du design validé), et chaque couleur
    // littérale de FOND qui éblouirait en sombre est surchargée sous
    // [data-theme='dark']. Ce test vérifie que la surcharge existe : un aplat
    // blanc oublié fait échouer la suite. Les couleurs de texte ne sont pas
    // concernées ici (le blanc sur un bouton orange reste blanc dans les deux).
    const couche = THEME.slice(THEME.indexOf('@layer components'));
    const sansSurcharge: string[] = [];
    const clairSurFond = /^background(-color|-image)?\s*:[^;]*#[c-fC-F][0-9a-fA-F]{2,5}/;

    for (const regle of couche.matchAll(/(\.[a-zA-Z0-9_-]+)[^{}]*\{([^}]*)\}/g)) {
      const [, classe, corps] = regle;
      const aplatClair = corps
        .split(';')
        .map((d) => d.trim())
        .some((declaration) => clairSurFond.test(declaration));
      if (!aplatClair) continue;
      const surcharge = new RegExp(`\\[data-theme='dark'\\][^{]*\\${classe}\\b`);
      if (!surcharge.test(THEME)) sansSurcharge.push(classe);
    }

    expect(
      sansSurcharge,
      `fonds clairs sans contrepartie sombre : ${sansSurcharge.join(', ')}`,
    ).toEqual([]);
  });

  it('chaque couleur à opacité (bg-x/70, hover:bg-y/50…) a sa surcharge sombre', () => {
    // Tailwind v4 fige l'alpha au build : `bg-bg-card/95` devient #fffffff2 sans
    // référence au jeton, donc reste blanc en mode sombre. Toute couleur à
    // opacité utilisée dans le code doit donc être reprise sous [data-theme='dark'].
    const familles = [
      'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime',
      'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
    ];
    const jetonsProjet = new Set([
      ...THEME.matchAll(/(--color-[a-z0-9-]+)\s*:/g),
    ].map((m) => m[1]));
    const jetonExiste = (base: string) => {
      if (jetonsProjet.has(`--color-${base}`)) return true;
      const m = /^([a-z]+)-(\d{2,3})$/.exec(base);
      return !!m && familles.includes(m[1]);
    };

    const exclusions = new Set(['white', 'black', 'transparent', 'current', 'inherit', 'on-surface', 'auto']);
    const motif = /(?<![\w:-])((?:[a-z0-9-]+:)*)((?:bg|text|border|from|via|to|ring|fill|stroke)-[a-z0-9-]+)\/(\d{1,3})\b/g;
    const manquants: string[] = [];

    for (const f of fichiersSources()) {
      for (const m of lire(f).matchAll(motif)) {
        const [, variantes, classe, opacite] = m;
        const base = classe.split('-').slice(1).join('-');
        if (exclusions.has(base) || variantes.includes('dark:') || !jetonExiste(base)) continue;
        const selecteur = `[data-theme='dark'] .${(variantes + classe + '/' + opacite).replace(/:/g, '\\:').replace(/\//g, '\\/')}`;
        if (!THEME.includes(selecteur) && !manquants.includes(selecteur)) manquants.push(selecteur);
      }
    }

    // Seuls le voile de modale et les effets de verre sont attendus hors liste.
    expect(manquants, `couleurs à opacité sans surcharge sombre :\n${manquants.join('\n')}`).toEqual([]);
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

/**
 * Fonds à texte clair : certains jetons sont volontairement plus clairs en mode
 * sombre (lisibles en TEXTE), ce qui rendait invisible le texte blanc posé
 * dessus (jusqu'à 1,13:1). Ces jetons ont donc, en FOND, une valeur profonde.
 * Ce test verrouille la règle : toute forme utilisée dans le code a sa
 * surcharge, et la couleur retenue garde le texte blanc lisible (≥ 4,5:1).
 */
describe('mode sombre — fonds à texte clair', () => {
  const FONDS = {
    primary: '#c2410c',
    'primary-hover': '#9a3412',
    'primary-container': '#c2410c',
    success: '#047857',
    'success-dark': '#065f46',
    error: '#b91c1c',
    'error-dark': '#991b1b',
    amber: '#b45309',
    'amber-text': '#92400e',
    secondary: '#a16207',
    info: '#1d4ed8',
    'info-dark': '#1e40af',
    'on-surface': '#251913',
  };

  const luminance = (hexa: string) => {
    const h = hexa.replace('#', '');
    const canaux = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(canaux[0]) + 0.7152 * f(canaux[1]) + 0.0722 * f(canaux[2]);
  };
  const contrasteBlanc = (hexa: string) => {
    const l = luminance(hexa);
    return Math.round((1.05 / (l + 0.05)) * 100) / 100;
  };

  const fichiers = (dossier: string): string[] =>
    readdirSync(path.join(racine, dossier), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? fichiers(path.join(dossier, e.name))
        : e.name.endsWith('.tsx')
          ? [path.join(dossier, e.name)]
          : [],
    );
  const source = fichiers('src')
    .map((f) => lire(f))
    .join('\n');

  it('chaque fond à texte clair a sa surcharge sombre', () => {
    const manquants: string[] = [];
    for (const jeton of Object.keys(FONDS)) {
      const motif = new RegExp(`(?<![\\w:-])((?:[a-z0-9-]+:)*)bg-${jeton}(?![\\w/-])`, 'g');
      for (const usage of source.matchAll(motif)) {
        if (usage[1].includes('dark:')) continue;
        const selecteur = `${usage[1]}bg-${jeton}`.replaceAll(':', '\\:');
        if (!THEME.includes(`[data-theme='dark'] .${selecteur}`)) {
          manquants.push(`${selecteur} (jeton ${jeton})`);
        }
      }
    }
    expect([...new Set(manquants)], `fonds à texte clair sans surcharge sombre :\n${manquants.join('\n')}`).toEqual([]);
  });

  it('ces fonds gardent le texte blanc lisible (AA)', () => {
    // règles réellement présentes dans la feuille : sélecteur → couleur
    const regles = new Map<string, string>();
    for (const m of THEME.matchAll(/\[data-theme='dark'\] \.([^\s{,]+)\s*\{\s*background-color:\s*([^;]+);/g)) {
      const cle = m[1].replaceAll('\\', '');
      // la règle porte la pseudo-classe (`hover:bg-x:hover`) alors que la
      // variante écrite dans le code est `hover:bg-x`
      regles.set(cle, m[2].trim());
      regles.set(cle.replace(/:(hover|focus|active)$/, ''), m[2].trim());
    }
    const hexa = (valeur: string) => {
      const rgb = valeur.match(/\((\d+), (\d+), (\d+)\)/);
      if (!rgb) return valeur.replace('#', '').toLowerCase();
      return [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    };
    const faibles: string[] = [];
    for (const jeton of Object.keys(FONDS)) {
      const motif = new RegExp(`(?<![\\w:-])((?:[a-z0-9-]+:)*)bg-${jeton}(?![\\w/-])`, 'g');
      const formes = new Set<string>();
      for (const usage of source.matchAll(motif)) {
        if (usage[1].includes('dark:')) continue;
        formes.add(`${usage[1]}bg-${jeton}`);   // forme telle qu'écrite dans le code
      }
      for (const forme of formes) {
        const valeur = regles.get(forme);
        if (!valeur) {
          faibles.push(`${forme} : surcharge sombre introuvable`);
          continue;
        }
        const trouve = '#' + hexa(valeur);
        const ratio = contrasteBlanc(trouve);
        if (ratio < 4.5) faibles.push(`${forme} → ${trouve} : ${ratio}:1 (texte blanc illisible)`);
        if (trouve.toLowerCase() !== FONDS[jeton as keyof typeof FONDS].toLowerCase()) {
          faibles.push(`${forme} : valeur ${trouve} au lieu de ${FONDS[jeton as keyof typeof FONDS]}`);
        }
      }
    }
    expect(faibles, `fonds sombres non lisibles :\n${faibles.join('\n')}`).toEqual([]);
  });
});
