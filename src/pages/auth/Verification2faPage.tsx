// Page de saisie du code OTP à 6 chiffres avec compte à rebours et renvoi de code.
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import OtpInput from '../../components/auth/OtpInput';
import MIcon from '../../components/shared/MIcon';
import LangToggle from '../../components/shared/LangToggle';
import { authApi } from '../../services/api';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { currentRole, hasSession, postLoginTarget } from '../../routes/authGuard';
import {
  clearTwoFaSession,
  getTwoFaAttemptsLeft,
  getTwoFaDeadline,
  getTwoFaSecondsLeft,
  setTwoFaAttemptsLeft,
  startTwoFaSession,
  TWO_FA_MAX_ATTEMPTS,
  TWO_FA_TTL_SECONDS,
} from '../../utils/twoFaTimer';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';

// Transforme ou formate les données via formatTime.
const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Composant de la page Verification2fa : gère le chargement des données et le rendu.
export default function Verification2faPage() {
  useLanguage();
  const navigate = useNavigate();
  const pendingEmail = localStorage.getItem('tokpa_pending_email');
  const deadlineRef = useRef<number>(
    pendingEmail ? getTwoFaDeadline(pendingEmail) : Date.now() + TWO_FA_TTL_SECONDS * 1000,
  );

  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() =>
    pendingEmail ? getTwoFaSecondsLeft(deadlineRef.current) : TWO_FA_TTL_SECONDS,
  );
  const [attemptsLeft, setAttemptsLeft] = useState(() =>
    pendingEmail ? getTwoFaAttemptsLeft(pendingEmail) : TWO_FA_MAX_ATTEMPTS,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const verified = useRef(false);

  const expired = secondsLeft <= 0;
  const blocked = attemptsLeft <= 0;

  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    if (!pendingEmail) return;
    const syncRemaining = () => {
      setSecondsLeft(getTwoFaSecondsLeft(deadlineRef.current));
    };
    syncRemaining();
    if (expired) return;
    const timer = window.setInterval(syncRemaining, 1000);
    window.addEventListener('focus', syncRemaining);
    document.addEventListener('visibilitychange', syncRemaining);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncRemaining);
      document.removeEventListener('visibilitychange', syncRemaining);
    };
  }, [pendingEmail, expired]);

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => {
    if (pendingEmail || verified.current || hasSession()) return;
    toast.error(tx("Aucune connexion en cours : saisissez d’abord votre email et votre mot de passe."), { id: '2fa-no-email' });
    navigate({ to: '/connexion', replace: true });
  }, [pendingEmail, navigate]);

  // Gère l’action utilisateur Submit.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingEmail || code.length < 6 || expired || blocked) return;

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.verify2fa({ email: pendingEmail, code });
      verified.current = true;
      clearTwoFaSession();
      toast.success(res.message || tx("Authentification réussie !"));
      navigate({ href: postLoginTarget(currentRole()), replace: true });
    } catch (err: unknown) {
      setError(formatApiError(extractApiError(err)));
      setAttemptsLeft((a) => {
        const next = Math.max(0, a - 1);
        setTwoFaAttemptsLeft(pendingEmail, next);
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  // Gère l’action utilisateur Resend.
  const handleResend = async () => {
    if (!pendingEmail) return;
    try {
      await authApi.resend2fa(pendingEmail);
      toast.success(tx("Un nouveau code OTP a été envoyé par email."));
      deadlineRef.current = startTwoFaSession(pendingEmail);
      setSecondsLeft(TWO_FA_TTL_SECONDS);
      setAttemptsLeft(TWO_FA_MAX_ATTEMPTS);
      setError(null);
      setCode('');
    } catch (err) {
      toast.error(formatApiError(extractApiError(err)));
    }
  };

  if (!pendingEmail) return null;

  // Retourne le rendu JSX du composant.
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 font-body text-text-main">
      <div className="fixed right-4 top-4 z-50"><LangToggle /></div>
      <div className="w-full max-w-[440px] rounded-2xl bg-bg-card p-6 md:p-8 shadow-sm border border-border-default">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-tint border border-primary-light">
            <MIcon name="mark_email_read" className="text-primary-container text-[36px]" />
          </div>
          <h1 className="mb-1 text-h2 font-bold text-text-main">{tx("Vérifiez votre email")}</h1>
          <p className="max-w-[300px] text-xs text-text-secondary leading-relaxed">
            Nous avons envoyé un code de sécurité à 6 chiffres à{' '}
            <strong className="text-text-main">{pendingEmail}</strong>
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <OtpInput value={code} onChange={setCode} error={!!error} disabled={expired || blocked || loading} />

          <div className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg border border-amber bg-amber-light px-3.5 py-2 text-xs font-semibold text-amber-text">
              <MIcon name="schedule" className="text-sm" />
              {expired ? tx("Code expiré") : tr(`Le code expire dans ${formatTime(secondsLeft)}`, `The code expires in ${formatTime(secondsLeft)}`)}
            </span>
          </div>

          {error && !blocked && (
            <div className="p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark text-center">
              {error}{' '}{tr(`Il vous reste ${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''}.`, `You have ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left.`)}
            </div>
          )}
          {blocked && (
            <div className="p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark text-center">
              {tx("Trop de tentatives erronées. Veuillez cliquer sur « Renvoyer le code ».")}
            </div>
          )}

          <button
            type="submit"
            disabled={code.length < 6 || expired || blocked || loading}
            className="w-full bg-primary-container hover:bg-primary-hover text-white font-bold py-3 rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? tx("Vérification...") : tx("Vérifier le code")}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleResend}
            className="text-xs font-bold text-primary-container hover:underline cursor-pointer"
          >
            {tx("Renvoyer le code")}
          </button>
          <Link
            to="/connexion"
            className="text-xs font-medium text-text-secondary hover:text-text-main transition-colors"
          >
            {tx("Changer d'adresse email")}
          </Link>
        </div>
      </div>
    </div>
  );
}
