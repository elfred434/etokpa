/**
 * Mode sombre — contrastes WCAG vérifiés par calcul.
 *
 * Un mode sombre « terne » vient presque toujours d'un couple texte/fond trop
 * peu contrasté ; un mode sombre « éblouissant » vient d'une surface restée
 * claire. Ces tests calculent le ratio réel à partir des valeurs écrites dans
 * `theme.css` et verrouillent les deux :
 *
 *   - SOMBRE : exigence AA stricte (4,5:1) sur tous les couples de texte ;
 *   - CLAIR  : gel des valeurs actuelles (aucune régression). Plusieurs couples
 *     du thème clair sont en dessous de AA — c'est l'état historique du design
 *     (orange de marque sur blanc = 2,80:1, texte tertiaire = 2,54:1), documenté
 *     en § 6 de NOTE_23_MODE_SOMBRE.md. Les corriger changerait le thème validé :
 *     décision produit, pas technique. Ils ne doivent simplement jamais empirer.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const THEME = readFileSync(path.join(process.cwd(), 'src/theme/theme.css'), 'utf8');

function bloc(entete: string): string {
  const debut = THEME.indexOf(entete);
  if (debut === -1) throw new Error(`Bloc introuvable : ${entete}`);
  let i = THEME.indexOf('{', debut);
  const ouverture = i;
  let profondeur = 0;
  for (; i < THEME.length; i++) {
    if (THEME[i] === '{') profondeur++;
    else if (THEME[i] === '}') {
      profondeur--;
      if (profondeur === 0) return THEME.slice(ouverture + 1, i);
    }
  }
  throw new Error(`Bloc non fermé : ${entete}`);
}

function palette(zone: string): Record<string, string> {
  return Object.fromEntries(
    [...zone.matchAll(/(--color-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [m[1], m[2]]),
  );
}

const CLAIR = palette(bloc('@theme {'));
const SOMBRE = palette(bloc("[data-theme='dark'] {"));

const canal = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hexa: string): number {
  let h = hexa.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(avant: string, arriere: string): number {
  const [a, b] = [luminance(avant), luminance(arriere)];
  const [haut, bas] = a > b ? [a, b] : [b, a];
  return (haut + 0.05) / (bas + 0.05);
}

/** [libellé, jeton du texte, jeton du fond] */
const COUPLES: [string, string, string][] = [
  ['texte principal sur le fond', '--color-text-main', '--color-bg-app'],
  ['texte principal sur une carte', '--color-text-main', '--color-bg-card'],
  ['texte secondaire sur le fond', '--color-text-secondary', '--color-bg-app'],
  ['texte secondaire sur une carte', '--color-text-secondary', '--color-bg-card'],
  ['texte tertiaire sur une carte', '--color-text-tertiary', '--color-bg-card'],
  ['orange de marque sur une carte', '--color-primary', '--color-bg-card'],
  ['orange profond sur pastille', '--color-primary-dark', '--color-primary-lighter'],
  ['filet d’Ariane brun', '--color-warm-ink', '--color-bg-secondary'],
  ['succès', '--color-success-dark', '--color-success-light'],
  ['erreur', '--color-error-dark', '--color-error-light'],
  ['information', '--color-info-dark', '--color-info-light'],
  ['ambre', '--color-amber-text', '--color-amber-light'],
  ['texte sur la surface inversée', '--color-on-surface', '--color-inverse-surface'],
];

/**
 * Ratios mesurés du thème CLAIR avant l'arrivée du mode sombre : ils servent de
 * plancher de non-régression (tolérance 0,05 pour les arrondis).
 */
const PLANCHER_CLAIR: Record<string, number> = {
  'texte principal sur le fond': 16.12,
  'texte principal sur une carte': 17.74,
  'texte secondaire sur le fond': 4.39,
  'texte secondaire sur une carte': 4.83,
  'texte tertiaire sur une carte': 2.54,
  'orange de marque sur une carte': 2.8,
  'orange profond sur pastille': 4.88,
  'filet d’Ariane brun': 4.32,
  succès: 3.58,
  erreur: 7.6,
  information: 6.16,
  ambre: 6.37,
  'texte sur la surface inversée': 1.3,
};

describe('mode sombre — contrastes WCAG', () => {
  for (const [nom, avant, arriere] of COUPLES) {
    it(`sombre : ${nom} ≥ 4,5:1 (AA)`, () => {
      const ratio = contraste(SOMBRE[avant], SOMBRE[arriere]);
      expect(ratio, `${nom} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('sombre : le texte blanc du bouton principal est lisible (AA)', () => {
    const ratio = contraste('#ffffff', SOMBRE['--color-primary-container']);
    expect(ratio, `bouton = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it('clair : aucune régression par rapport aux valeurs historiques', () => {
    for (const [nom, avant, arriere] of COUPLES) {
      const ratio = contraste(CLAIR[avant], CLAIR[arriere]);
      const plancher = PLANCHER_CLAIR[nom] - 0.05;
      expect(ratio, `${nom} : ${ratio.toFixed(2)}:1 (plancher ${plancher.toFixed(2)})`).toBeGreaterThanOrEqual(plancher);
    }
  });

  it('clair : le texte blanc sur la surface inversée reste lisible', () => {
    expect(contraste('#ffffff', CLAIR['--color-inverse-surface'])).toBeGreaterThanOrEqual(4.5);
  });

  it('les surfaces sombres restent distinctes sans devenir claires', () => {
    const fond = luminance(SOMBRE['--color-bg-app']);
    const carte = luminance(SOMBRE['--color-bg-card']);
    const surface = luminance(SOMBRE['--color-bg-secondary']);
    expect(carte, 'la carte doit se détacher du fond').toBeGreaterThan(fond);
    expect(surface, 'la surface élevée doit se détacher de la carte').toBeGreaterThan(carte);
    expect(carte / Math.max(fond, 0.0001), 'écart trop fort = surfaces éblouissantes').toBeLessThan(3.2);
  });

  it('aucun jeton de surface n’a été oublié en mode sombre', () => {
    for (const jeton of ['--color-bg-card', '--color-bg-app', '--color-text-main', '--color-console']) {
      expect(SOMBRE[jeton], `${jeton} n'a pas de valeur sombre`).toBeTruthy();
      expect(SOMBRE[jeton], `${jeton} reprend la valeur claire`).not.toBe(CLAIR[jeton]);
    }
  });
});
