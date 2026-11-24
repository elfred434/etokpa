// Champ de saisie OTP à 6 cases numériques avec collage et navigation clavier.
import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import clsx from 'clsx';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
}

// Composant React OtpInput : prépare l’état et affiche son interface.
export default function OtpInput({ value, onChange, length = 6, error, disabled }: OtpInputProps) {
  useLanguage();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  // Met à jour les données ou l’état via setDigit.
  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, length));
  };

  // Gère l’action utilisateur Change.
  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  // Gère l’action utilisateur KeyDown.
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, '');
      e.preventDefault();
    }
  };

  // Gère l’action utilisateur Paste.
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  // Retourne le rendu JSX du composant.
  return (
    <div className="flex justify-between gap-xs sm:gap-sm" role="group" aria-label={tx("Code de vérification")}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          aria-label={`Chiffre ${i + 1}`}
          className={clsx(
            'h-14 w-12 rounded-lg border-[1.5px] bg-card text-center text-[24px] font-bold text-ink',
            'outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-error' : 'border-line',
            'focus:border-info focus:border-[2px]',
          )}
        />
      ))}
    </div>
  );
}
