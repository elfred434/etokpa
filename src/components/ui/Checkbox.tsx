import { useId } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { IconCheck } from '@tabler/icons-react';

interface CheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/** Case à cocher carrée 18px, cochée = fond orange (maquette connexion). */
export default function Checkbox({ label, checked, onChange, className }: CheckboxProps) {
  const id = useId();

  return (
    <label htmlFor={id} className={clsx('flex cursor-pointer items-center gap-sm select-none', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={clsx(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors duration-150',
          'peer-focus-visible:shadow-[var(--shadow-focus-a11y)]',
          checked ? 'border-primary bg-primary' : 'border-line bg-card',
        )}
      >
        {checked && <IconCheck size={13} stroke={3} className="text-white" />}
      </span>
      <span className="text-secondary text-ink-2">{label}</span>
    </label>
  );
}
