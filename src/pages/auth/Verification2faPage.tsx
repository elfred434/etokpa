import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { IconMail, IconClock } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import OtpInput from '../../components/auth/OtpInput';
import Alert from '../../components/ui/Alert';

const INITIAL_SECONDS = 4 * 60 + 32; // 04:32 comme la maquette
const MAX_ATTEMPTS = 3;
const MOCK_VALID_CODE = '123456'; // MOCK : à remplacer par la vérification backend (F-02)

const format = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Page Vérification 2FA — maquette Stitch `v_rification_2fa_tokpa` :
 * cercle email 72px, 6 cases OTP, pill d'expiration ambre, alerte tentatives,
 * bouton orange, liens « Renvoyer le code » / « Changer d'adresse email ».
 */
export default function Verification2faPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [error, setError] = useState(false);

  const expired = secondsLeft <= 0;
  const blocked = attemptsLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const timer = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [expired]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length < 6 || expired || blocked) return;
    if (code === MOCK_VALID_CODE) {
      toast.success('Email vérifié ! Connexion réussie.');
      navigate({ to: '/' });
      return;
    }
    setError(true);
    setAttemptsLeft((a) => a - 1);
  };

  const handleResend = () => {
    setSecondsLeft(INITIAL_SECONDS);
    setAttemptsLeft(MAX_ATTEMPTS);
    setError(false);
    setCode('');
    toast.success('Un nouveau code a été envoyé.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-md">
      <div className="w-full max-w-[440px] rounded-2xl bg-surface p-lg shadow-sm md:p-xl">
        <div className="flex flex-col items-center text-center">
          <span className="mb-md flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-lighter">
            <IconMail size={48} strokeWidth={1.5} className="text-primary" />
          </span>
          <h1 className="mb-sm text-h2 text-ink">Vérifiez votre email</h1>
          <p className="max-w-[280px] text-secondary text-amber-text">
            Nous avons envoyé un code à 6 chiffres à{' '}
            <span className="font-semibold text-ink">k***@gmail.com</span>
          </p>
        </div>

        <form className="mt-lg space-y-lg" onSubmit={handleSubmit}>
          <OtpInput value={code} onChange={setCode} error={error} disabled={expired || blocked} />

          <div className="flex justify-center">
            <span className="flex items-center gap-sm rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-[14px] py-[8px] text-label font-medium text-amber-text">
              <IconClock size={18} />
              {expired ? 'Code expiré' : `Le code expire dans ${format(secondsLeft)}`}
            </span>
          </div>

          {error && !blocked && (
            <Alert>Code incorrect. Il vous reste {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''}.</Alert>
          )}
          {blocked && <Alert>Trop de tentatives. Renvoyez un code pour continuer.</Alert>}

          <button type="submit" className="btn btn-primary w-full" disabled={code.length < 6 || expired || blocked}>
            Vérifier le code
          </button>
        </form>

        <div className="mt-xl flex flex-col items-center gap-md">
          <button
            type="button"
            onClick={handleResend}
            className="text-label font-medium text-primary transition-colors hover:underline"
          >
            Renvoyer le code
          </button>
          <Link
            to="/connexion"
            className="text-label font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Changer d'adresse email
          </Link>
        </div>
      </div>
    </div>
  );
}
