import clsx from 'clsx';
import { IconCheck } from '@tabler/icons-react';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

const STEPS = ['Panier', 'Livraison', 'Paiement', 'Confirmation'];

interface CheckoutStepperProps {
  /** Étape courante, 1-based */
  current: number;
}

/** Stepper de commande 4 étapes (maquette panier) : fait = coche, actif = orange, à venir = gris. */
export default function CheckoutStepper({ current }: CheckoutStepperProps) {
  useLanguage();
  const fill = `${((current - 1) / (STEPS.length - 1)) * 100}%`;

  return (
    <div className="mb-xl w-full">
      <div className="relative flex items-start justify-between gap-1 px-1 sm:px-xl">
        <div className="absolute left-[12%] right-[12%] top-[16px] -z-10 h-[3px] rounded-full bg-line sm:top-[18px]" aria-hidden="true" />
        <div
          className="absolute left-[12%] top-[16px] -z-10 h-[3px] rounded-full bg-primary transition-all duration-300 sm:top-[18px]"
          style={{ width: `${((current - 1) / (STEPS.length - 1)) * 76}%` }}
          aria-hidden="true"
        />
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < current ? 'done' : n === current ? 'active' : 'todo';
          return (
            <div key={label} className="flex w-[23%] flex-col items-center gap-1 sm:gap-sm">
              <span
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 sm:h-9 sm:w-9 sm:text-h3',
                  state === 'done' && 'border-primary bg-card text-primary',
                  state === 'active' && 'border-primary bg-primary text-white shadow-md',
                  state === 'todo' && 'border-[#D1D5DB] bg-page text-ink-3',
                )}
              >
                {state === 'done' ? <IconCheck size={18} /> : n}
              </span>
              <span
                className={clsx(
                  'text-center text-[11px] leading-tight sm:text-label',
                  state === 'active' ? 'font-bold text-primary' : state === 'done' ? 'text-primary' : 'text-ink-3',
                )}
              >
{tx(label)}
              </span>
            </div>
          );
        })}
        <span className="sr-only">{fill}</span>
      </div>
    </div>
  );
}
