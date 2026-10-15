import MIcon from '../shared/MIcon';
import { THEMES, useTheme } from '../../context/ThemeContext';
import { LANGUAGES, useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

/**
 * Paramètres — apparence (thème) et langue.
 *
 * Composant unique partagé par les quatre espaces : la page Paramètres du client
 * (`/parametres`) et les pages Paramètres déjà existantes de l'administration,
 * du livreur et du manager. Les deux réglages étaient auparavant deux pastilles
 * dans chaque barre de navigation ; ils sont désormais ici, en choix explicites
 * (voir plutôt qu'un bouton qui fait défiler).
 *
 * Aucun état local : le thème et la langue sont lus et écrits dans leurs
 * contextes (`ThemeContext`, `LanguageContext`), qui persistent le choix.
 */
export default function ParametresPanel() {
  const { choix, effectif, setChoix } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex flex-col gap-md">
      {/* ---------------------------------------------------------------- */}
      {/* Apparence : trois choix visibles, pas de cycle                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-[14px] border border-border-default bg-bg-card p-lg shadow-sm">
        <header className="mb-md flex items-center gap-md">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-container">
            <MIcon name="palette" className="text-[20px]" />
          </span>
          <div className="min-w-0">
            <h2 className="font-h3 text-h3 font-bold text-text-main">{tx('Thème')}</h2>
            <p className="font-body text-label text-text-secondary">{tx('Suit le réglage de votre appareil')}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-sm sm:grid-cols-3" role="group" aria-label={tx('Thème')}>
          {THEMES.map((theme) => {
            const actif = choix === theme.code;
            return (
              <button
                key={theme.code}
                type="button"
                onClick={() => setChoix(theme.code)}
                aria-pressed={actif}
                data-theme-option={theme.code}
                className={`flex items-center gap-sm rounded-[12px] border px-md py-3 text-left transition-all active:scale-[0.98] ${
                  actif
                    ? 'border-primary bg-primary-tint text-primary-deep shadow-sm'
                    : 'border-border-default bg-bg-secondary text-text-secondary hover:border-primary/40 hover:text-text-main'
                }`}
              >
                <MIcon name={theme.icone} className={`text-[20px] ${actif ? 'text-primary-container' : ''}`} />
                <span className="flex-1 font-body text-body font-semibold">{tx(theme.cle)}</span>
                {actif && <MIcon name="check_circle" className="text-[18px] text-primary-container" />}
              </button>
            );
          })}
        </div>

        <p className="mt-sm font-body text-micro text-text-tertiary">
          {effectif === 'dark' ? tx('Sombre') : tx('Clair')} · {tx('Préférences conservées sur cet appareil')}
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Langue : les cinq langues en liste                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-[14px] border border-border-default bg-bg-card p-lg shadow-sm">
        <header className="mb-md flex items-center gap-md">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-container">
            <MIcon name="language" className="text-[20px]" />
          </span>
          <div className="min-w-0">
            <h2 className="font-h3 text-h3 font-bold text-text-main">{tx('Langue')}</h2>
            <p className="font-body text-label text-text-secondary">{tx("Langue de l'interface")}</p>
          </div>
        </header>

        <div className="flex flex-col gap-1" role="group" aria-label={tx('Langue')}>
          {LANGUAGES.map((l) => {
            const actif = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                aria-pressed={actif}
                data-lang-option={l.code}
                className={`flex items-center justify-between gap-sm rounded-[10px] border px-md py-2.5 text-left transition-colors ${
                  actif
                    ? 'border-primary bg-primary-tint text-primary-deep'
                    : 'border-transparent bg-bg-secondary text-text-main hover:border-border-default'
                }`}
              >
                <span className="flex items-center gap-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 font-body text-micro font-bold uppercase ${
                      actif ? 'bg-primary text-white' : 'bg-bg-card text-text-secondary'
                    }`}
                  >
                    {l.code}
                  </span>
                  <span className="font-body text-body font-medium">{l.label}</span>
                </span>
                {actif && <MIcon name="check_circle" className="text-[18px] text-primary-container" />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
