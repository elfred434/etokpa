import clsx from 'clsx';
import MIcon from './MIcon';

/** Chargement en cours (même icône que la fiche produit) — à la place des anciennes données factices. */
export default function LoadingState({ label = 'Chargement…', className }: { label?: string; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-xl text-center text-ink-2', className)}>
      <MIcon name="sync" className="animate-spin text-4xl text-primary" />
      <p className="mt-sm text-secondary">{label}</p>
    </div>
  );
}
