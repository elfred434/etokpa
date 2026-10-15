#!/usr/bin/env python3
"""Contrôle du mode sombre : couleurs réellement appliquées et contrastes.

Pour chaque couple fond/texte écrit dans les composants, le script résout la
couleur effective en mode sombre — jeton sombre, puis surcharge de classe
(`[data-theme='dark'] .bg-primary { … }`) si elle existe — compose la
transparence sur la surface de la page, puis calcule le contraste.

Il signale aussi :
- les **surfaces restées claires** (l'« éblouissement ») ;
- les **surcharges sans effet** : sélecteur mal échappé (double antislash) ou
  classe inexistante — une règle morte ne corrige rien ;
- les **textes illisibles** et les textes faibles (à arbitrer).

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
VERRES = ('white/5', 'white/10', 'white/15', 'white/20')   # translucides voulus


# --------------------------------------------------------------------------- #
# Utilitaires de lecture de CSS (sans expression régulière fragile)
# --------------------------------------------------------------------------- #
def dechappe(texte: str) -> str:
    """Retire UN niveau d'échappement CSS : `hover\\:bg-x` → `hover:bg-x`.

    Sur un sélecteur mal échappé (`hover\\\\:bg-x`), il reste un antislash : c'est
    précisément ce que le contrôle des surcharges sans effet doit voir.
    """
    sortie, i = [], 0
    while i < len(texte):
        if texte[i] == '\\' and i + 1 < len(texte):
            sortie.append(texte[i + 1])
            i += 2
        else:
            sortie.append(texte[i])
            i += 1
    return ''.join(sortie)


def normalise(texte: str) -> str:
    """Nom de classe utilisable par le code source (`hover:bg-x`)."""
    return dechappe(texte).replace('\\', '')


def nom_de_classe(selecteur: str) -> tuple[str, str] | None:
    """(nom normalisé, nom brut) de la DERNIÈRE classe d'un sélecteur.

    Gère les sélecteurs descendants (`[data-theme='dark'] .leaflet-bar a`) et les
    variantes échappées (`hover\\:bg-x:hover`).
    """
    classes = [morceau for morceau in selecteur.split() if morceau.startswith('.')]
    if not classes:
        return None
    brut, i, gardes = classes[-1][1:], 0, []
    while i < len(brut):
        if brut[i] == '\\':
            gardes.append(brut[i:i + 2])
            i += 2
            continue
        if brut[i] == ':':          # pseudo-classe : fin du nom
            break
        gardes.append(brut[i])
        i += 1
    premier = ''.join(gardes)
    return normalise(premier), dechappe(premier)


def preludes(css: str) -> list[str]:
    """Tous les sélecteurs du fichier, à n'importe quelle profondeur.

    Un découpage naïf sur les accolades se trompe sur les règles imbriquées
    (`@media`/`@layer`/`@supports`) : le sélecteur interne se retrouve alors dans
    le corps de la règle englobante. On avance caractère par caractère.
    """
    trouves, tampon = [], []
    for caractere in css:
        if caractere == '{':
            trouves.append(''.join(tampon))
            tampon = []
        elif caractere == '}':
            tampon = []
        else:
            tampon.append(caractere)
    return trouves


def classes_connues(css: str) -> set[str]:
    """Noms de classes réellement définies, hors surcharges sombres."""
    noms: set[str] = set()
    for prelude in preludes(css):
        if 'data-theme' in prelude:
            continue
        for morceau in prelude.replace(',', ' ').split():
            if not morceau.startswith('.'):
                continue
            resultat = nom_de_classe(morceau)
            if resultat:
                noms.add(resultat[0])
    return noms


# --------------------------------------------------------------------------- #
# Couleurs
# --------------------------------------------------------------------------- #
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


def canaux(couleur: str):
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


def css_compile() -> str:
    fichiers = glob.glob(str(RACINE / 'dist' / 'assets' / 'index-*.css'))
    if not fichiers:
        sys.exit('CSS compilé introuvable — lancez `npx vite build`.')
    return open(max(fichiers, key=os.path.getmtime), encoding='utf8').read()


def lire_surcharges(css: str) -> tuple[dict[str, dict[str, str]], set[str]]:
    """Surcharges sombres compilées : (par classe normalisée, sélecteurs bruts)."""
    surcharges: dict[str, dict[str, str]] = {}
    bruts: set[str] = set()
    for regle in re.finditer(r'\[data-theme=dark\]([^{}]*)\{([^{}]*)\}', css):
        declarations = {
            prop: valeur.strip()
            for prop, valeur in re.findall(r'(background-color|color|border-color):\s*([^;]+)', regle.group(2))
        }
        if not declarations:
            continue
        for morceau in regle.group(1).split(','):
            resultat = nom_de_classe(morceau.split(']')[-1])
            if not resultat:
                continue
            normalise_nom, brut = resultat
            surcharges.setdefault(normalise_nom, {}).update(declarations)
            bruts.add(brut)
    return surcharges, bruts


def main() -> None:
    seuil = float(sys.argv[sys.argv.index('--seuil') + 1]) if '--seuil' in sys.argv else SEUIL_TEXTE
    tout = '--tout' in sys.argv
    css = css_compile()
    motif = r'(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;'
    clair = dict(re.findall(motif, bloc_equilibre(css, '@layer theme')))
    sombre = dict(re.findall(motif, bloc_equilibre(css, '[data-theme=dark]')))
    surcharges, selecteurs_bruts = lire_surcharges(css)
    connues = classes_connues(css)
    inertes = sorted(s for s in selecteurs_bruts if s not in connues)

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
                nom = f'{variantes}{prop}-{base}' + (f'/{opacite}' if opacite else '')
                brut = resoudre(nom, propriete)
                depuis_surcharge = nom in surcharges
                if not brut and opacite:
                    nom = f'{variantes}{prop}-{base}'
                    brut = resoudre(nom, propriete)
                    depuis_surcharge = nom in surcharges
                if not brut:
                    continue
                if opacite and not depuis_surcharge:
                    c = canaux(brut)
                    if c:
                        brut = f'rgba({round(c[0])}, {round(c[1])}, {round(c[2])}, {round(min(c[3], int(opacite) / 100), 3)})'
                classes_vues += 1
                if prop == 'bg':
                    fonds[nom] = melanger(brut, SURFACE_PAGE)
                else:
                    textes.append((nom, brut))

            for nom, surface in fonds.items():
                if any(verre in nom for verre in VERRES):
                    continue
                l = luminance(surface)
                if l is not None and l > 0.5:
                    surfaces_claires.append(f'{fichier.name}:{ligne} {nom} → {surface}')

            if not textes:
                continue
            for nom_texte, couleur in textes:
                for nom_fond, surface in (fonds.items() or [('surface de page', SURFACE_PAGE)]):
                    ratio = contraste(melanger(couleur, surface), surface)
                    if ratio < SEUIL_ACCENT:
                        illisibles.append(f'{fichier.name}:{ligne} {nom_texte} sur {nom_fond} → {ratio}:1')
                    elif ratio < seuil:
                        faibles.append(f'{fichier.name}:{ligne} {nom_texte} sur {nom_fond} → {ratio}:1')

    def rapport(titre: str, lignes: list[str], limite: int | None = None) -> None:
        uniques = sorted(set(lignes))
        print(f'\n=== {titre} ({len(uniques)}) ===')
        for ligne in (uniques if tout else uniques[:limite or 15]):
            print('   ' + ligne)
        if not tout and limite and len(uniques) > limite:
            print(f'   … et {len(uniques) - limite} autre(s)')

    print(f'classes analysées : {classes_vues} · surcharges sombres : {len(surcharges)} · classes connues : {len(connues)}')
    rapport('surcharges sans effet (sélecteur mal échappé ou classe inexistante)', inertes)
    rapport('surfaces restées claires (éblouissement)', surfaces_claires, 10)
    rapport('textes illisibles (< 3:1)', illisibles, 10)
    rapport(f'textes faibles (3 à {seuil}:1, à arbitrer)', faibles, 10)
    sys.exit(1 if (surfaces_claires or illisibles or inertes) else 0)


if __name__ == '__main__':
    main()
