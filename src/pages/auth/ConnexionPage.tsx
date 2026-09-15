import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link , useNavigate } from '@tanstack/react-router';
import { IconMail, IconShieldCheck, IconLock } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import AuthSplitLayout from '../../components/auth/AuthSplitLayout';
import PasswordInput from '../../components/auth/PasswordInput';
import TextField from '../../components/ui/TextField';
import Checkbox from '../../components/ui/Checkbox';
import Alert from '../../components/ui/Alert';
import Divider from '../../components/ui/Divider';

/**
 * Page Connexion — reproduction fidèle de la maquette Stitch `connexion_tokpa`.
 * Mock (backend absent) : test@tokpa.bj / tokpa2026 → sinon erreur maquette.
 */
export default function ConnexionPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    setLoading(true);
    // MOCK : à remplacer par la mutation TanStack Query (F-02) au Sprint 1.
    window.setTimeout(() => {
      setLoading(false);
      if (email === 'test@tokpa.bj' && password === 'tokpa2026') {
        navigate({ to: '/verification-2fa' });
      } else {
        setAuthError(true);
      }
    }, 700);
  };

  return (
    <AuthSplitLayout>
      <h1 className="text-h1 text-ink">Bon retour 👋</h1>
      <p className="mt-sm text-ink-2">Connectez-vous à votre compte TOKPa</p>

      <form className="mt-xl space-y-lg" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Adresse email"
          type="email"
          placeholder="user@example.com"
          autoComplete="email"
          iconLeft={<IconMail size={20} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={authError}
          required
        />

        <PasswordInput
          label="Mot de passe"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={authError}
          labelRight={
            <button
              type="button"
              onClick={() => toast('Récupération de mot de passe — à venir (Sprint 1)')}
              className="text-[13px] font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
            >
              Mot de passe oublié ?
            </button>
          }
          required
        />

        <Checkbox label="Se souvenir de moi" checked={remember} onChange={setRemember} />

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>

        {authError && <Alert>Email ou mot de passe incorrect</Alert>}

        <Divider label="OU CONTINUER AVEC" />
        <p className='mt-lg flex items-center justify-center gap-sm text-[13px] text-ink-3'> Si vous n'avez pas encore de compte
          <Link to="/inscription">Inscrivez-vous</Link>
        </p>

        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => navigate({ to: '/verification-2fa' })}
        >
          <IconShieldCheck size={20} />
          Vérification en 2 étapes
        </button>
      </form>

      <p className="mt-lg flex items-center justify-center gap-sm text-[13px] text-ink-3">
        <IconLock size={16} />
        Paiement sécurisé via FedaPay
      </p>
    </AuthSplitLayout>
  );
}
