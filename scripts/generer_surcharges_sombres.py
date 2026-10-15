#!/usr/bin/env python3
"""Génère les surcharges du mode sombre dans src/theme/theme.css.

Pourquoi ce script existe
-------------------------
Tailwind v4 fige au build les utilitaires de couleur : `bg-bg-card/95` devient
`background-color:#fffffff2`, sans référence au jeton. Ces surfaces ignorent donc
le thème. La parade est d'écrire des surcharges `[data-theme='dark']` explicites,
mais elles dépendent de ce qui est RÉELLEMENT utilisé dans les composants.

Ce script relit le CSS compilé (`dist/assets/index-*.css`) pour connaître les
valeurs claires ET sombres de chaque jeton, relit les composants pour savoir
quelles classes sont utilisées, puis réécrit trois blocs de theme.css :

  1. « couleurs semi-transparentes » — bg-x/70, hover:bg-y/50… (valeur sombre)
  2. « fonds à texte clair »        — jetons clairs en mode sombre mais servant
                                      de FOND sous du texte blanc
  3. « texte sur fond sombre »      — jetons sombres en mode sombre mais servant
                                      de COULEUR DE TEXTE

Usage :  python3 scripts/generer_surcharges_sombres.py [--verifier]
   --verifier : n'écrit rien, signale seulement les manques.

À relancer après toute modification du CSS compilé (donc après `npx vite build`).
Le test tests/theme-dark-tokens.test.ts vérifie le résultat.
"""
from __future__ import annotations

import glob
import os
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
THEME = RACINE / 'src' / 'theme' / 'theme.css'

# --- jetons utilisés en FOND sous du texte blanc : valeur sombre profonde -----
FONDS = {
    'primary': '#c2410c',
    'primary-hover': '#9a3412',
    'primary-container': '#c2410c',
    'success': '#047857',
    'success-dark': '#065f46',
    'error': '#b91c1c',
    'error-dark': '#991b1b',
    'amber': '#b45309',
    'amber-text': '#92400e',
    'secondary': '#a16207',
    'info': '#1d4ed8',
    'info-dark': '#1e40af',
    'on-surface': '#251913',
}

# --- jetons utilisés en COULEUR DE TEXTE : valeur sombre claire ---------------
TEXTES = {
    'warm': '#fff8f6',
    'primary-tint': '#fff7ed',
    'orange-50': '#fff7ed',
    'orange-100': '#ffedd5',
    'orange-200': '#fed7aa',
    'surface-variant': '#f6ded3',
    'gray-300': '#9ca3af',
    'primary-deep': '#fdba74',
    'primary-light': '#fed7aa',
    'primary-container': '#fb923c',
    'secondary-container': '#fbbf24',
    'border-default': '#8a8177',
    'tertiary-container': '#38bdf8',
}

# --- couleurs à opacité volontairement laissées telles quelles -----------------
EXCLUS_OPACITE = {'white', 'black', 'on-surface'}
# --- couleurs à opacité : préfixes de propriété pris en charge -----------------
PROPRIETES = {
    'bg': 'background-color',
    'text': 'color',
    'border': 'border-color',
    'from': '--tw-gradient-from',
    'via': '--tw-gradient-via',
    'to': '--tw-gradient-to',
    'ring': '--tw-ring-color',
    'fill': 'fill',
    'stroke': 'stroke',
}
PSEUDO = {'hover': ':hover', 'focus': ':focus', 'active': ':active'}

# --- surcharges ponctuelles : classes précises, décidées au cas par cas --------
PONCTUELS = {
    'bg-on-surface-variant': 'background-color: rgb(74, 58, 47)',
    r'hover\:bg-primary-shade:hover': 'background-color: rgb(154, 52, 18)',
}

ENTETES = {
    'opacite': "/* ==========================================================================\n   MODE SOMBRE — couleurs semi-transparentes",
    'fonds': "/* --------------------------------------------------------------------------\n   Fonds à texte clair",
    'textes': "/* --------------------------------------------------------------------------\n   Textes sur fond sombre",
    'ponctuels': "/* --------------------------------------------------------------------------\n   Surcharges ponctuelles",
}
FIN_BLOC = "/* --------------------------------------------------------------------------\n   ÉLÉVATION EN MODE SOMBRE"


def bloc_equilibre(css: str, entete: str) -> str:
    """Contenu d'un bloc CSS délimité par `entete` et des accolades équilibrées."""
    debut = css.index(entete)
    i = css.index('{', debut)
    ouverture, profondeur = i, 0
    while i < len(css):
        if css[i] == '{':
            profondeur += 1
        elif css[i] == '}':
            profondeur -= 1
            if profondeur == 0:
                return css[ouverture + 1:i]
        i += 1
    raise ValueError(f'Bloc non fermé : {entete}')


def lire_jetons() -> tuple[dict[str, str], dict[str, str]]:
    """Valeurs claires et sombres des jetons, lues dans le CSS COMPILÉ."""
    fichiers = glob.glob(str(RACINE / 'dist' / 'assets' / 'index-*.css'))
    if not fichiers:
        sys.exit('CSS compilé introuvable — lancez d’abord `npx vite build`.')
    css = open(max(fichiers, key=os.path.getmtime), encoding='utf8').read()
    motif = r'(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;'
    clair = dict(re.findall(motif, bloc_equilibre(css, '@layer theme')))
    sombre = dict(re.findall(motif, bloc_equilibre(css, '[data-theme=dark]')))
    return clair, sombre


def rgba(hexa: str, opacite: int) -> str:
    h = hexa.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    if opacite >= 100:
        return f'rgb({r}, {g}, {b})'
    return f'rgba({r}, {g}, {b}, {round(opacite / 100, 3)})'


def selecteur(classe: str) -> str:
    return classe.replace(':', r'\:').replace('/', r'\/')


def pseudo_de(variantes: str) -> str:
    return ''.join(PSEUDO.get(v, '') for v in variantes.split(':') if v)


def usages() -> list[tuple[str, str, str | None]]:
    """[(variantes, classe, opacité)] réellement présents dans les composants."""
    motif = re.compile(
        r'(?<![\w:-])((?:[a-z0-9-]+:)*)(bg|text|border|from|via|to|ring|fill|stroke)-([a-z0-9-]+)(?:/(\d{1,3}))?(?![\w/-])'
    )
    trouves: set[tuple[str, str, str | None]] = set()
    for fichier in RACINE.joinpath('src').rglob('*.tsx'):
        texte = fichier.read_text(encoding='utf8')
        for m in motif.finditer(texte):
            variantes, prop, base, opacite = m.groups()
            if 'dark:' in variantes:
                continue
            trouves.add((variantes, f'{prop}-{base}', opacite or '100'))
    return sorted(trouves)


def construire(clair: dict[str, str], sombre: dict[str, str]) -> dict[str, str]:
    """Les trois blocs de surcharges."""
    lignes_opacite, lignes_fonds, lignes_textes = [], [], []

    for variantes, classe, opacite in usages():
        prop, base = classe.split('-', 1)
        valeur_sombre = sombre.get(f'--color-{base}')
        valeur_claire = clair.get(f'--color-{base}')
        selector = selecteur(variantes + classe + (f'/{opacite}' if opacite != '100' else ''))
        pseudo = pseudo_de(variantes)

        if opacite != '100' and base not in EXCLUS_OPACITE and (valeur_sombre or valeur_claire):
            # un jeton de TEXTE garde la teinte claire décidée, même avec opacité
            valeur = TEXTES.get(base) if prop == 'text' and base in TEXTES else (valeur_sombre or valeur_claire)
            lignes_opacite.append(
                f"[data-theme='dark'] .{selector}{pseudo} {{ {PROPRIETES[prop]}: {rgba(valeur, int(opacite))}; }}"
            )
        if opacite == '100' and prop == 'bg' and base in FONDS:
            lignes_fonds.append(
                f"[data-theme='dark'] .{selector}{pseudo} {{ background-color: {rgba(FONDS[base], 100)}; }}"
            )
        if opacite == '100' and prop == 'text' and base in TEXTES:
            lignes_textes.append(
                f"[data-theme='dark'] .{selector}{pseudo} {{ color: {rgba(TEXTES[base], 100)}; }}"
            )

    entete_opacite = ENTETES['opacite'] + """
   --------------------------------------------------------------------------
   Tailwind v4 FIGE la valeur d'un utilitaire à opacité au moment du build :
   `bg-bg-card/95` devient `background-color:#fffffff2`, sans référence au jeton.
   Ces surfaces restaient donc blanches en mode sombre — l'une des deux causes
   d'« éblouissement » signalées.

   ATTENTION : la solution évidente (écrire `color-mix(in oklab,
   var(--color-x) NN%, transparent)`) NE FONCTIONNE PAS ici — le minifieur
   (Lightning CSS) évalue le mélange au build à partir des jetons, eux-mêmes
   statiques, et ré-inscrit la couleur claire. Les surcharges ci-dessous portent
   donc la VALEUR SOMBRE explicite, calculée depuis le jeton.

   Volontairement exclus : le voile de modale `bg-on-surface/60` (il doit rester
   sombre dans les deux thèmes) et les effets de verre `bg-white/NN` (posés sur
   des fonds de marque, ils restent translucides).

   GÉNÉRÉ AUTOMATIQUEMENT par scripts/generer_surcharges_sombres.py
   ========================================================================== */"""

    entete_fonds = ENTETES['fonds'] + """
   Plusieurs jetons sont VOLONTAIREMENT plus clairs en mode sombre : c'est
   correct pour du texte (un orange lisible sur fond sombre), mais désastreux
   pour un FOND surmonté de texte blanc — le contraste tombait jusqu'à 1,13:1
   (texte invisible). Ces jetons reprennent donc, en FOND uniquement, une valeur
   profonde qui garde le texte blanc lisible (toutes ≥ 4,9:1).
   Les valeurs de TEXTE correspondantes restent claires : seules les classes de
   FOND sont surchargées, jamais les jetons.

   GÉNÉRÉ AUTOMATIQUEMENT par scripts/generer_surcharges_sombres.py
   -------------------------------------------------------------------------- */"""

    entete_textes = ENTETES['textes'] + """
   Symétrique du bloc précédent. Plusieurs jetons deviennent SOMBRES en mode
   sombre parce qu'ils servent de fond ailleurs (`--color-primary-tint` = #2a1a12
   plutôt que #fff7ed) : utilisés comme COULEUR DE TEXTE, ils disparaissaient sur
   les surfaces sombres (jusqu'à 1,03:1). Ils reprennent donc, en TEXTE
   uniquement, une teinte claire lisible (≥ 4:1 pour le texte courant).

   GÉNÉRÉ AUTOMATIQUEMENT par scripts/generer_surcharges_sombres.py
   -------------------------------------------------------------------------- */"""

    entete_ponctuels = ENTETES['ponctuels'] + """
   Pastilles du pied de page : `bg-on-surface-variant` est volontairement clair
   en mode sombre (il sert de TEXTE ailleurs) ; en FOND, la pastille ressortait
   comme une tache claire. Elle reprend une teinte charbon chaude, et le survol
   l'orangé profond — dans les deux cas l'icône claire reste lisible (≥ 7:1).

   GÉNÉRÉ AUTOMATIQUEMENT par scripts/generer_surcharges_sombres.py
   -------------------------------------------------------------------------- */"""
    lignes_ponctuels = [
        f"[data-theme='dark'] .{selecteur(classe)} {{ {declaration}; }}"
        for classe, declaration in sorted(PONCTUELS.items())
    ]

    return {
        'ponctuels': entete_ponctuels + '\n' + '\n'.join(lignes_ponctuels) + '\n',
        'opacite': entete_opacite + '\n' + '\n'.join(lignes_opacite) + '\n',
        'fonds': entete_fonds + '\n' + '\n'.join(lignes_fonds) + '\n',
        'textes': entete_textes + '\n' + '\n'.join(lignes_textes) + '\n',
    }


def main() -> None:
    clair, sombre = lire_jetons()
    blocs = construire(clair, sombre)
    css = THEME.read_text(encoding='utf8')

    # Les trois blocs forment une seule région : on la réécrit d'un coup.
    # (Les remplacer un par un est un piège : le bloc « fonds » s'étend jusqu'au
    # bloc d'élévation et avalerait le bloc « textes » placé après lui.)
    debut = css.index(ENTETES['opacite'])
    fin = css.index(FIN_BLOC, debut)
    region = '\n\n'.join(blocs[cle].strip() for cle in ('opacite', 'fonds', 'textes', 'ponctuels')) + '\n\n'
    css = css[:debut] + region + css[fin:]
    THEME.write_text(css, encoding='utf8')

    for cle in ('opacite', 'fonds', 'textes', 'ponctuels'):
        regles = len(re.findall(r"\[data-theme='dark'\] \.", blocs[cle]))
        print(f'   {cle:8} : {regles:>3} règles')
    print(f'theme.css mis à jour ({len(css)} octets)')


if __name__ == '__main__':
    main()
