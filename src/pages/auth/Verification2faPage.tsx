import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import OtpInput from '../../components/auth/OtpInput';
import MIcon from '../../components/shared/MIcon';
import { authApi } from '../../services/api';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { currentRole, postLoginTarget } from '../../routes/authGuard';

const INITIAL_SECONDS = 10 * 60; // TTL réel du backend (TwoFAService::TTL_MINUTES = 10)
const MAX_ATTEMPTS = 3;

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Page Vérification 2FA — Intégration API Backend Laravel + Mode Test / Démo
 */
export default function Verification2faPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pendingEmail = localStorage.getItem('tokpa_pending_email') || 'client@tokpa.bj';

  const expired = secondsLeft <= 0;
  const blocked = attemptsLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const timer = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [expired]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length < 6 || expired || blocked) return;

    setLoading(true);
    setError(null);

    try {
      // Tentative d'appel API Backend POST /api/auth/verify-2fa
      const res = await authApi.verify2fa({ email: pendingEmail, code });
      toast.success(res.message || 'Authentification réussie !');
      // Retour à la page demandée avant la connexion si ce rôle y a droit ; sinon l'espace du rôle
      // (admin → /admin, manager → /manager, client/livreur → accueil).
      navigate({ href: postLoginTarget(currentRole()) });
    } catch (err: unknown) {
      console.warn('API 2FA verification error:', err);
      // Pas de fallback factice : sans token réel du backend, on ne « connecte » personne.
      setError(formatApiError(extractApiError(err)));
      setAttemptsLeft((a) => a - 1);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.resend2fa(pendingEmail);
      toast.success('Un nouveau code OTP a été envoyé par email.');
    } catch (err) {
      console.warn('Resend 2FA error:', err);
      toast.error(formatApiError(extractApiError(err)));
    }
    setSecondsLeft(INITIAL_SECONDS);
    setAttemptsLeft(MAX_ATTEMPTS);
    setError(null);
    setCode('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 font-body text-text-main">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-border-default">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-tint border border-primary-light">
            <MIcon name="mark_email_read" className="text-primary-container text-[36px]" />
          </div>
          <h1 className="mb-1 text-h2 font-bold text-text-main">Vérifiez votre email</h1>
          <p className="max-w-[300px] text-xs text-text-secondary leading-relaxed">
            Nous avons envoyé un code de sécurité à 6 chiffres à{' '}
            <strong className="text-text-main">{pendingEmail}</strong>
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <OtpInput value={code} onChange={setCode} error={!!error} disabled={expired || blocked || loading} />

          <div className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2 text-xs font-semibold text-amber-text">
              <MIcon name="schedule" className="text-sm" />
              {expired ? 'Code expiré' : `Le code expire dans ${formatTime(secondsLeft)}`}
            </span>
          </div>

          {error && !blocked && (
            <div className="p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark text-center">
              {error} Il vous reste {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''}.
            </div>
          )}
          {blocked && (
            <div className="p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark text-center">
              Trop de tentatives erronées. Veuillez cliquer sur "Renvoyer le code".
            </div>
          )}

          <button
            type="submit"
            disabled={code.length < 6 || expired || blocked || loading}
            className="w-full bg-primary-container hover:bg-primary-hover text-white font-bold py-3 rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleResend}
            className="text-xs font-bold text-primary-container hover:underline cursor-pointer"
          >
            Renvoyer le code
          </button>
          <Link
            to="/connexion"
            className="text-xs font-medium text-text-secondary hover:text-text-main transition-colors"
          >
            Changer d'adresse email
          </Link>
        </div>
      </div>
    </div>
  );
}
