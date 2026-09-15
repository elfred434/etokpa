import clsx from 'clsx';

interface DividerProps {
  label: string;
  className?: string;
}

/** Séparateur horizontal avec libellé micro uppercase centré (« OU CONTINUER AVEC »). */
export default function Divider({ label, className }: DividerProps) {
  return (
    <div className={clsx('flex items-center gap-md', className)} aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="micro whitespace-nowrap">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
