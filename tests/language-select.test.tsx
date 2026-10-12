// @vitest-environment jsdom
/**
 * Sélecteur de langue en liste déroulante (LanguageSelect) :
 * - les 5 langues sont proposées avec leur nom natif ;
 * - le choix met à jour le contexte, localStorage (tokpa_lang) et <html lang> ;
 * - la valeur affichée suit la langue active ;
 * - le composant LangToggle (admin, manager, livreur, auth) délègue à ce même sélecteur.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider, LANGUAGES, useLanguage } from '../src/context/LanguageContext';
import LanguageSelect from '../src/components/shared/LanguageSelect';
import LangToggle from '../src/components/shared/LangToggle';

function Probe() {
  const { language } = useLanguage();
  return <span data-testid="lang">{language}</span>;
}

function renderSelect(ui: React.ReactElement = <LanguageSelect />) {
  return render(
    <LanguageProvider>
      {ui}
      <Probe />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('LanguageSelect — liste déroulante', () => {
  it('propose les 5 langues avec leur nom natif, dans l’ordre du cycle', () => {
    renderSelect();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => [o.value, o.textContent]);
    expect(options).toEqual(LANGUAGES.map((l) => [l.code, l.label]));
    expect(options.map(([code]) => code)).toEqual(['fr', 'en', 'es', 'de', 'pt']);
  });

  it('démarre sur la langue active (fr par défaut)', () => {
    renderSelect();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('fr');
  });

  it('un choix met à jour le contexte, localStorage et <html lang>', () => {
    renderSelect();
    const select = screen.getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'es' } });

    expect(screen.getByTestId('lang').textContent).toBe('es');
    expect(localStorage.getItem('tokpa_lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(select.value).toBe('es');
  });

  it('ignore une valeur hors liste', () => {
    renderSelect();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'it' } });
    expect(screen.getByTestId('lang').textContent).toBe('fr');
    expect(localStorage.getItem('tokpa_lang')).toBeNull();
  });

  it('appelle onChange avec la langue choisie', () => {
    const chosen: string[] = [];
    renderSelect(<LanguageSelect onChange={(lang) => chosen.push(lang)} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pt' } });
    expect(chosen).toEqual(['pt']);
  });

  it('LangToggle délègue au même sélecteur en liste déroulante', () => {
    renderSelect(<LangToggle />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(5);
    fireEvent.change(select, { target: { value: 'de' } });
    expect(screen.getByTestId('lang').textContent).toBe('de');
  });
});
