// Champ téléphone préfixé (+229 Bénin) avec drapeau.
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

// Composant React BeninFlag : prépare l’état et affiche son interface.
function BeninFlag() {
  // Retourne le rendu JSX du composant.
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" className="shrink-0 rounded-[2px]">
      <rect width="8" height="14" fill="#008751" />
      <rect x="8" width="12" height="7" fill="#FCD116" />
      <rect x="8" y="7" width="12" height="7" fill="#E8112D" />
    </svg>
  );
}

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: boolean;
}

// Composant React PhoneInput : prépare l’état et affiche son interface.
export default function PhoneInput({ label, error, className, id, ...rest }: PhoneInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  // Retourne le rendu JSX du composant.
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <div className={clsx('input flex items-stretch p-0', error && 'border-error', className)}>
        <span className="flex shrink-0 items-center gap-sm border-r-[1.5px] border-line px-[14px] text-sm font-medium text-ink">
          <BeninFlag />
          +229
        </span>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          className="w-full bg-transparent px-[14px] py-[10px] text-sm text-ink outline-none placeholder:text-ink-3"
          {...rest}
        />
      </div>
    </div>
  );
}
