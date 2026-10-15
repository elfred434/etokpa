#!/usr/bin/env python3
"""Contrôle du mode sombre : couleurs réellement appliquées et contrastes.

Pour chaque couple fond/texte écrit dans les composants, le script résout la
couleur effective en mode sombre — jeton sombre, puis surcharge de classe
(`[data-theme='dark'] .bg-primary { … }`) si elle existe — compose la
transparence sur la surface de la page, puis calcule le contraste.

Il signale aussi toute surface qui resterait claire (l'« éblouissement »).

Usage :  python3 scripts/verifier_contraste_sombre.py [--seuil 4.5] [--tout]
Sortie  : code 0 si aucun défaut bloquant, 1 sinon.
"""
from __future__ import annotations

import glob
import os
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SEUIL_TEXTE = 4.5     # texte courant (AA)
SEUIL_ACCENT = 3.0    # icônes, gros texte, texte sur fond de marque
SURFACE_PAGE = '#1c1917'   # --color-bg-card en mode sombre

# Effets de verre : translucides par choix, posés sur des fonds de marque.
VERRES = ('white/5', 'white/10', 'white/15', 'white/20')


def bloc_equilibre(css: str, entete: str) -> str:
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


def css_compile() -> str:
    fichiers = glob.glob(str(RACINE / 'dist' / 'assets' / 'index-*.css'))
    if not fichiers:
        sys.exit('CSS compilé introuvable — lancez `npx vite build`.')
    return open(max(fichiers, key=os.path.getmtime), encoding='utf8').read()


def canaux(couleur: str) -> tuple[float, float, float, float] | None:
    valeur = couleur.strip()
    m = re.match(r'rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)', valeur)
    if m:
        r, g, b = (float(m.group(i)) for i in (1, 2, 3))
        a = float(m.group(4)) if m.group(4) else 1.0
        return r, g, b, a
    if valeur.startswith('#'):
        h = valeur.lstrip('#')
        if len(h) in (3, 4):
            h = ''.join(c * 2 for c in h[:3])
        if len(h) not in (6, 8):
            return None
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return float(r), float(g), float(b), a
    return None


def melanger(couleur: str, fond: str) -> str:
    """Compose une couleur éventuellement translucide sur un fond opaque."""
    haut, bas = canaux(couleur), canaux(fond)
    if haut is None:
        return couleur
    if bas is None:
        bas = (255.0, 255.0, 255.0, 1.0)
    r = haut[0] * haut[3] + bas[0] * (1 - haut[3])
    g = haut[1] * haut[3] + bas[1] * (1 - haut[3])
    b = haut[2] * haut[3] + bas[2] * (1 - haut[3])
    return f'rgb({round(r)}, {round(g)}, {round(b)})'


def luminance(couleur: str) -> float | None:
    c = canaux(couleur)
    if c is None:
        return None
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0] / 255) + 0.7152 * f(c[1] / 255) + 0.0722 * f(c[2] / 255)


def contraste(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    if la is None or lb is None:
        return 99.0
    haut, bas = max(la, lb), min(la, lb)
    return round((haut + 0.05) / (bas + 0.05), 2)


def lire_surcharges(css: str) -> dict[str, dict[str, str]]:
    """Surcharges compilées. Lightning CSS regroupe les sélecteurs identiques
    et échappe les deux-points des variantes (`hover\\:bg-primary:hover`)."""
    surcharges: dict[str, dict[str, str]] = {}
    for regle in re.finditer(r'\[data-theme=dark\]([^{}]*)\{([^{}]*)\}', css):
        declarations = dict(
            (p, v.strip()) for p, v in re.findall(r'(background-color|color|border-color):\s*([^;]+)', regle.group(2))
        )
        if not declarations:
            continue
        for morceau in regle.group(1).split(','):
            selecteur = re.sub(r'^.*?\]', '', morceau).strip().lstrip('.').strip()
            if not selecteur:
                continue
            classe = re.split(r'(?<!\\):', selecteur)[0].replace('\\', '')
            surcharges.setdefault(classe, {}).update(declarations)
    return surcharges


def main() -> None:
    seuil = float(sys.argv[sys.argv.index('--seuil') + 1]) if '--seuil' in sys.argv else SEUIL_TEXTE
    css = css_compile()
    motif = r'(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;'
    clair = dict(re.findall(motif, bloc_equilibre(css, '@layer theme')))
    sombre = dict(re.findall(motif, bloc_equilibre(css, '[data-theme=dark]')))
    surcharges = lire_surcharges(css)

    def resoudre(classe: str, prop: str) -> str | None:
        base = classe.split('-', 1)[1] if '-' in classe else classe
        if classe in surcharges and prop in surcharges[classe]:
            return surcharges[classe][prop]
        if base in ('white', 'black'):
            return '#ffffff' if base == 'white' else '#000000'
        return sombre.get(f'--color-{base}') or clair.get(f'--color-{base}')

    motif_classe = re.compile(r'(?<![\w:-])((?:[a-z0-9-]+:)*)(bg|text)-([a-z0-9-]+)(?:/(\d{1,3}))?(?![\w/-])')
    surfaces_claires, illisibles, faibles = [], [], []
    classes_vues = 0

    for fichier in sorted(RACINE.joinpath('src').rglob('*.tsx')):
        contenu = fichier.read_text(encoding='utf8')
        for m in re.finditer(r'className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\})', contenu):
            classes = m.group(1) or m.group(2) or ''
            ligne = contenu[:m.start()].count('\n') + 1
            fonds, textes = {}, []
            for usage in motif_classe.finditer(classes):
                variantes, prop, base, opacite = usage.groups()
                if 'dark:' in variantes:
                    continue
                propriete = 'background-color' if prop == 'bg' else 'color'
                # le combinateur « / » fait partie du nom de classe : on cherche
                # d'abord la surcharge exacte (bg-primary/10), puis la base
                nom = f'{variantes}{prop}-{base}' + (f'/{opacite}' if opacite else '')
                brut = resoudre(nom, propriete)
                surcharge_trouvee = nom in surcharges
                if not brut and opacite:
                    nom = f'{variantes}{prop}-{base}'
                    brut = resoudre(nom, propriete)
                if not brut:
                    continue
                if opacite and not surcharge_trouvee:
                    c = canaux(brut)
                    if c:
                        brut = f'rgba({round(c[0])}, {round(c[1])}, {round(c[2])}, {round(min(c[3], int(opacite) / 100), 3)})'
                classes_vues += 1
                if prop == 'bg':
                    fonds[nom] = melanger(brut, SURFACE_PAGE)
                else:
                    textes.append((nom, brut))

            for nom, surface in fonds.items():
                if any(v in nom for v in VERRES):
                    continue
                l = luminance(surface)
                if l is not None and l > 0.5:
                    surfaces_claires.append(f'{fichier.name}:{ligne} {nom} → {surface}')

            if not textes:
                continue
            for nom_texte, couleur in textes:
                for nom_fond, surface in (fonds.items() or [('surface de page', SURFACE_PAGE)]):
                    effective = melanger(couleur, surface)
                    ratio = contraste(effective, surface)
                    if ratio < SEUIL_ACCENT:
                        illisibles.append(f'{fichier.name}:{ligne} {nom_texte} sur {nom_fond} → {ratio}:1')
                    elif ratio < seuil:
                        faibles.append(f'{fichier.name}:{ligne} {nom_texte} sur {nom_fond} → {ratio}:1')

    def rapport(titre: str, lignes: list[str], limite: int | None = None) -> None:
        uniques = sorted(set(lignes))
        print(f'\n=== {titre} ({len(uniques)}) ===')
        for ligne in (uniques[:limite] if limite else uniques):
            print('   ' + ligne)
        if limite and len(uniques) > limite:
            print(f'   … et {len(uniques) - limite} autre(s)')

    print(f'classes analysées : {classes_vues} · surcharges sombres trouvées : {len(surcharges)}')
    rapport('surfaces restées claires (éblouissement)', surfaces_claires, 20 if '--tout' not in sys.argv else None)
    rapport('textes illisibles (< 3:1)', illisibles, 25 if '--tout' not in sys.argv else None)
    rapport(f'textes faibles (3 à {seuil}:1, à arbitrer)', faibles, 15 if '--tout' not in sys.argv else None)
    sys.exit(1 if (surfaces_claires or illisibles) else 0)


if __name__ == '__main__':
    main()
