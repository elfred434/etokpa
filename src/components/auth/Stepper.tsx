import { Fragment } from 'react';
import clsx from 'clsx';

interface StepperProps {
  steps: string[];
  /** Étape courante, 1-based */
  current: number;
}

/**
 * Stepper horizontal du wizard d'inscription (maquette Stitch) :
 * pastilles 32px, ligne de progression orange derrière, libellés 13px.
 */
export default function Stepper({ steps, current }: StepperProps) {
  // Largeur de la ligne orange calibrée sur la maquette (étape 1 ≈ 33 %).
  const progress = Math.min(100, ((current - 0.3) / steps.length) * 100 + 10);

  return (
    <div className="relative mb-10 px-6">
      <div className="absolute left-0 right-0 top-4 h-[2px] bg-line" aria-hidden="true" />
      <div
        className="absolute left-0 top-4 h-[2px] bg-primary transition-all duration-300"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
      <div className="relative flex justify-between">
        {steps.map((label, i) => {
          const n = i + 1;
          const state = n < current ? 'done' : n === current ? 'active' : 'todo';
          return (
            <Fragment key={label}>
              <div className="z-10 flex flex-col items-center gap-sm">
                <span
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    state === 'todo' ? 'bg-line text-ink-2' : 'bg-primary text-white shadow-sm',
                  )}
                >
                  {n}
                </span>
                <span
                  className={clsx(
                    'text-[13px]',
                    state === 'active' && 'font-semibold text-primary',
                    state === 'done' && 'font-medium text-primary',
                    state === 'todo' && 'font-medium text-ink-2',
                  )}
                >
                  {label}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
