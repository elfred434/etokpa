import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react';
import TextField from '../ui/TextField';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: boolean;
  labelRight?: ReactNode;
}

/** Champ mot de passe : cadenas à gauche, bascule œil / œil barré à droite (design.md §4.2). */
export default function PasswordInput({ label, error, labelRight, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      label={label}
      labelRight={labelRight}
      error={error}
      type={visible ? 'text' : 'password'}
      iconLeft={<IconLock size={20} />}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-ink-3 transition-colors hover:text-ink-2"
        >
          {visible ? <IconEyeOff size={20} /> : <IconEye size={20} />}
        </button>
      }
      {...rest}
    />
  );
}
