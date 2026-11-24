// Bouton de bascule du thème clair/sombre/système.
import MIcon from './MIcon';
import { THEMES, useTheme } from '../../context/ThemeContext';
import { tx } from '../../i18n/tx';

// Composant React ThemeToggle : prépare l’état et affiche son interface.
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

  // Retourne le rendu JSX du composant.
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
