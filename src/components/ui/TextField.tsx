// Champ texte générique stylisé avec libellé et message d’erreur.
import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  iconLeft?: ReactNode;
  rightSlot?: ReactNode;
  error?: boolean;
  labelRight?: ReactNode;
}

// Composant React TextField : prépare l’état et affiche son interface.
export default function TextField({
  label,
  iconLeft,
  rightSlot,
  error,
  labelRight,
  className,
  id,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  // Retourne le rendu JSX du composant.
  return (
    <div className="w-full">
      <div className="mb-[6px] flex items-center justify-between gap-sm">
        <label htmlFor={inputId} className="label mb-0">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        {iconLeft && (
          <span className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-ink-2">
            {iconLeft}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            'input',
            iconLeft && 'pl-[42px]',
            rightSlot && 'pr-[42px]',
            error && 'border-error',
            className,
          )}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-[10px] top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
    </div>
  );
}
