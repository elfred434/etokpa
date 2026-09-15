import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { IconChevronDown } from '@tabler/icons-react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: boolean;
}

/** Select stylé comme l'input standard (design.md §4.2), chevron à droite. */
export default function SelectField({ label, error, className, id, children, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="w-full">
      <label htmlFor={selectId} className="label">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={clsx('input appearance-none pr-[42px]', error && 'border-error', className)}
          {...rest}
        >
          {children}
        </select>
        <IconChevronDown
          size={20}
          className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 text-ink-2"
        />
      </div>
    </div>
  );
}
