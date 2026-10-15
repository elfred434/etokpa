import MIcon from './MIcon';
import { THEMES, useTheme } from '../../context/ThemeContext';
import { tx } from '../../i18n/tx';

/**
 * Bouton de thème : cycle clair → sombre → système, sur le modèle du sélecteur
 * de langue (même gabarit, même place dans la barre).
 *
 * - `pill` : pastille de la barre client (icône + libellé sur écrans larges) ;
 * - `icon` : bouton rond des en-têtes d'administration, de livreur et de manager.
 */
export default function ThemeToggle({ variant = 'pill' }: { variant?: 'pill' | 'icon' }) {
  const { choix, effectif, cycler } = useTheme();
  const i = THEMES.findIndex((t) => t.code === choix);
  const suivant = THEMES[(i + 1) % THEMES.length];
  const libelle = tx(THEMES[i === -1 ? 2 : i].cle);
  const titre = `${tx('Thème')} : ${libelle} → ${tx(suivant.cle)}`;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={cycler}
        title={titre}
        aria-label={titre}
        data-theme-choice={choix}
        data-theme-effectif={effectif}
        className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary transition-transform active:scale-95"
      >
        <MIcon name={THEMES[i === -1 ? 2 : i].icone} className="text-[16px]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycler}
      title={titre}
      aria-label={titre}
      data-theme-choice={choix}
      data-theme-effectif={effectif}
      className="flex items-center gap-1 rounded-full border border-primary-light bg-primary-lighter px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary-shade transition-transform active:scale-95"
    >
      <MIcon name={THEMES[i === -1 ? 2 : i].icone} className="text-[16px]" />
      <span className="hidden min-[400px]:inline">{libelle}</span>
    </button>
  );
}
