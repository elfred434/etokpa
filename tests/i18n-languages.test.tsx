// @vitest-environment jsdom
/**
 * Intégration des langues es / de / pt au système i18n existant :
 * - parité stricte des clés TRANSLATIONS entre fr, en, es, de, pt ;
 * - cycle du sélecteur fr → en → es → de → pt → fr (contexte + localStorage + <html lang>) ;
 * - couche tx()/tr() : dictionnaires ES/DE/PT (couverture complète des phrases
 *   statiques) puis repli anglais, puis français.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TRANSLATIONS } from '../src/constants/translations';
import { LANGUAGES, LanguageProvider, useLanguage, type Language } from '../src/context/LanguageContext';
import { tx, tr, uiLang } from '../src/i18n/tx';
import { ES } from '../src/i18n/phrases-es';
import { DE } from '../src/i18n/phrases-de';
import { PT } from '../src/i18n/phrases-pt';

/** Chemins des feuilles d'un objet de traductions (ex: "common.cancel"). */
function leafKeys(node: unknown, prefix = ''): string[] {
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
      leafKeys(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

function Probe() {
  const { language, toggleLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="name">{t('common.languageName')}</span>
      <button type="button" data-testid="toggle" onClick={toggleLanguage}>
        langue
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('TRANSLATIONS — 5 langues', () => {
  it('expose exactement fr, en, es, de, pt', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual(['de', 'en', 'es', 'fr', 'pt']);
  });

  it('a la même arborescence de clés que le français pour chaque langue', () => {
    const reference = leafKeys(TRANSLATIONS.fr).sort();
    for (const lang of ['en', 'es', 'de', 'pt'] as const) {
      expect(leafKeys(TRANSLATIONS[lang]).sort(), `parité des clés pour ${lang}`).toEqual(reference);
    }
  });

  it('ne contient que des chaînes non vides', () => {
    for (const lang of Object.keys(TRANSLATIONS)) {
      const tree = TRANSLATIONS[lang as Language] as unknown;
      const stack: unknown[] = [tree];
      let leaves = 0;
      while (stack.length) {
        const node = stack.pop();
        if (node && typeof node === 'object') {
          stack.push(...Object.values(node as Record<string, unknown>));
        } else {
          expect(typeof node, `feuille non-string dans ${lang}`).toBe('string');
          expect((node as string).trim().length, `feuille vide dans ${lang}`).toBeGreaterThan(0);
          leaves += 1;
        }
      }
      expect(leaves).toBeGreaterThan(150);
    }
  });

  it('nomme chaque langue dans sa propre langue', () => {
    const expected: Record<Language, string> = {
      fr: 'Français',
      en: 'English',
      es: 'Español',
      de: 'Deutsch',
      pt: 'Português',
    };
    for (const [lang, label] of Object.entries(expected)) {
      const block = TRANSLATIONS[lang as Language] as { common: { languageName: string } };
      expect(block.common.languageName).toBe(label);
    }
    expect(LANGUAGES.map((l) => l.label)).toEqual(Object.values(expected));
  });

  it('traduit les clés communes dans les 5 langues', () => {
    const cancels = (['fr', 'en', 'es', 'de', 'pt'] as Language[]).map(
      (l) => (TRANSLATIONS[l] as { common: { cancel: string } }).common.cancel,
    );
    expect(cancels).toEqual(['Annuler', 'Cancel', 'Cancelar', 'Abbrechen', 'Cancelar']);
    const carts = (['fr', 'en', 'es', 'de', 'pt'] as Language[]).map(
      (l) => (TRANSLATIONS[l] as { nav: { cart: string } }).nav.cart,
    );
    expect(carts).toEqual(['Panier', 'Cart', 'Carrito', 'Warenkorb', 'Carrinho']);
  });
});

describe('LanguageProvider — sélecteur 5 langues', () => {
  it('démarre en français et cycle fr → en → es → de → pt → fr', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    const sequence: Array<[string, string]> = [
      ['fr', 'Français'],
      ['en', 'English'],
      ['es', 'Español'],
      ['de', 'Deutsch'],
      ['pt', 'Português'],
      ['fr', 'Français'],
    ];
    for (const [code, label] of sequence) {
      expect(screen.getByTestId('lang').textContent).toBe(code);
      expect(screen.getByTestId('name').textContent).toBe(label);
      fireEvent.click(screen.getByTestId('toggle'));
    }
  });

  it('persiste la langue dans localStorage et sur <html lang>', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle')); // → en
    fireEvent.click(screen.getByTestId('toggle')); // → es
    expect(localStorage.getItem('tokpa_lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('repart de la langue enregistrée, y compris es/de/pt', () => {
    for (const lang of ['en', 'es', 'de', 'pt'] as const) {
      localStorage.setItem('tokpa_lang', lang);
      const { unmount } = render(
        <LanguageProvider>
          <Probe />
        </LanguageProvider>,
      );
      expect(screen.getByTestId('lang').textContent, `init depuis ${lang}`).toBe(lang);
      unmount();
    }
  });

  it('ignore une valeur localStorage inconnue (retour au français)', () => {
    localStorage.setItem('tokpa_lang', 'xx');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('lang').textContent).toBe('fr');
  });

  it('t() retourne la clé inconnue telle quelle', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    // Sonde dédiée : t sur une clé absente.
    function KeyProbe() {
      const { t } = useLanguage();
      return <span data-testid="missing">{t('cle.inexistante')}</span>;
    }
    const { unmount } = render(
      <LanguageProvider>
        <KeyProbe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('missing').textContent).toBe('cle.inexistante');
    unmount();
  });
});

describe('Couche tx()/tr() — es, de, pt', () => {
  it('uiLang() reconnaît les 5 langues et rejette le reste', () => {
    for (const lang of ['fr', 'en', 'es', 'de', 'pt'] as const) {
      localStorage.setItem('tokpa_lang', lang);
      expect(uiLang()).toBe(lang);
    }
    localStorage.setItem('tokpa_lang', 'it');
    expect(uiLang()).toBe('fr');
  });

  it('tx() traduit via le dictionnaire de la langue active', () => {
    const cases: Array<[Language, string]> = [
      ['fr', 'Fermer'],
      ['en', 'Close'],
      ['es', 'Cerrar'],
      ['de', 'Schließen'],
      ['pt', 'Fechar'],
    ];
    for (const [lang, expected] of cases) {
      localStorage.setItem('tokpa_lang', lang);
      expect(tx('Fermer'), `tx('Fermer') en ${lang}`).toBe(expected);
    }
  });

  it('tx() retombe sur l’anglais puis sur le français', () => {
    localStorage.setItem('tokpa_lang', 'es');
    // Présente dans EN mais pas dans ES → repli anglais.
    expect(tx("Volume d'Affaires")).toBe('Revenue');
    // Absente de tous les dictionnaires → français tel quel (donnée API, nom propre).
    expect(tx('Phrase inconnue du système')).toBe('Phrase inconnue du système');
    expect(tx('')).toBe('');
  });

  it('tr() sert l’anglais comme repli commun hors français', () => {
    localStorage.setItem('tokpa_lang', 'fr');
    expect(tr('Oui', 'Yes')).toBe('Oui');
    for (const lang of ['en', 'es', 'de', 'pt'] as const) {
      localStorage.setItem('tokpa_lang', lang);
      expect(tr('Oui', 'Yes'), `tr en ${lang}`).toBe('Yes');
    }
  });

  it('les dictionnaires ES/DE/PT sont cohérents (mêmes clés, valeurs non vides)', () => {
    const dicts: Array<[string, Record<string, string>]> = [
      ['ES', ES],
      ['DE', DE],
      ['PT', PT],
    ];
    const reference = Object.keys(ES).sort();
    // 240 phrases initiales + 1055 longue traîne + 15 « Mes packs » (atelier client)
    // + 5 « actualisation » (bouton Actualiser + processus silencieux ; « Actualiser »
    //   existait déjà)
    // + 3 « modale de paiement » (détail, informations de paiement, commande
    //   associée ; « Voir la commande » existait déjà)
    // + 1 « adresse de livraison » (modale de paiement) =
    // couverture complète des tx() statiques.
    expect(reference.length).toBe(1335);
    for (const [name, dict] of dicts) {
      expect(Object.keys(dict).sort(), `clés ${name}`).toEqual(reference);
      for (const [k, v] of Object.entries(dict)) {
        expect(k.trim().length, `clé vide ${name}`).toBeGreaterThan(0);
        expect(v.trim().length, `valeur vide ${name} pour « ${k} »`).toBeGreaterThan(0);
      }
    }
  });
});
