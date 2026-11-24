// Wrapper affichant une icône Material Symbols Outlined.
import clsx from 'clsx';
import type { CSSProperties } from 'react';

interface MIconProps {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}

// Composant React MIcon : prépare l’état et affiche son interface.
export default function MIcon({ name, className, filled, style }: MIconProps) {
  const merged: CSSProperties | undefined = filled
    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24", ...style }
    : style;
  // Retourne le rendu JSX du composant.
  return (
    <span className={clsx('material-symbols-outlined', className)} style={merged} aria-hidden="true">
      {name}
    </span>
  );
}
