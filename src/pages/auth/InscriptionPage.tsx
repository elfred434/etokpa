import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import clsx from 'clsx';
import { IconArrowRight, IconArrowLeft, IconCircleCheck, IconLock } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import Stepper from '../../components/auth/Stepper';
import PhoneInput from '../../components/auth/PhoneInput';
import PasswordInput from '../../components/auth/PasswordInput';
import TextField from '../../components/ui/TextField';
import SelectField from '../../components/ui/SelectField';
import Checkbox from '../../components/ui/Checkbox';

/* -------------------------------------------------------------------------- */
/*  Validation Zod (F-01)                                                     */
/* -------------------------------------------------------------------------- */

const profilSchema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().regex(/^\d{8,10}$/, '8 à 10 chiffres attendus'),
  ville: z.string().min(1, 'Sélectionnez votre ville'),
});

const securitySchema = z.object({
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .regex(/\d/, 'Au moins 1 chiffre')
    .regex(/[A-Z]/, 'Au moins 1 lettre majuscule'),
  confirm: z.string(),
  cgu: z.boolean().refine((v) => v, 'Vous devez accepter les CGU'),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
});

const VILLES = ['Cotonou', 'Abomey-Calavi', 'Porto-Novo', 'Parakou', 'Bohicon', 'Natitingou'];

/* -------------------------------------------------------------------------- */
/*  Force du mot de passe : 4 segments (maquette étape 2)                     */
/* -------------------------------------------------------------------------- */

function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score += 1;
  return score;
}

const STRENGTH = [
  { label: 'À définir', color: 'bg-line', text: 'text-ink-3' },
  { label: 'Faible', color: 'bg-error', text: 'text-error-dark' },
  { label: 'Moyen', color: 'bg-amber', text: 'text-amber-text' },
  { label: 'Bon', color: 'bg-success', text: 'text-success-dark' },
  { label: 'Fort', color: 'bg-success-dark', text: 'text-success-dark' },
];

type ProfilErrors = Partial<Record<'prenom' | 'nom' | 'email' | 'telephone' | 'ville', string>>;
type SecurityErrors = Partial<Record<'password' | 'confirm' | 'cgu', string>>;

/* -------------------------------------------------------------------------- */
/*  Page — wizard 2 étapes (maquettes Stitch v2)                              */
/* -------------------------------------------------------------------------- */

export default function InscriptionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [profil, setProfil] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    ville: '',
  });
  const [profilErrors, setProfilErrors] = useState<ProfilErrors>({});

  const [security, setSecurity] = useState({
    password: '',
    confirm: '',
    cgu: false,
    sms: true,
  });
  const [securityErrors, setSecurityErrors] = useState<SecurityErrors>({});

  const setProfilField = <K extends keyof typeof profil>(key: K, value: string) =>
    setProfil((f) => ({ ...f, [key]: value }));

  const handleProfilSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = profilSchema.safeParse(profil);
    if (!result.success) {
      const next: ProfilErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProfilErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setProfilErrors(next);
      return;
    }
    setProfilErrors({});
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  const handleSecuritySubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = securitySchema.safeParse(security);
    if (!result.success) {
      const next: SecurityErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SecurityErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setSecurityErrors(next);
      return;
    }
    setSecurityErrors({});
    // MOCK : création du compte + envoi du code 2FA (F-01) au Sprint 1.
    toast.success('Compte créé ! Vérifiez votre email.');
    navigate({ to: '/verification-2fa' });
  };

  const score = passwordScore(security.password);
  const strength = STRENGTH[score];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page p-md md:p-lg">
      <div className="w-full max-w-[800px] overflow-hidden rounded-2xl bg-surface shadow-sm">
        {/* ---------------- Bandeau header ---------------- */}
        <header className="relative h-32 overflow-hidden bg-primary-lighter">
          <div
            className="absolute inset-0 opacity-20 bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:20px_20px]"
            aria-hidden="true"
          />
          {step === 1 && (
            <img
              src="/images/brand/photo-tomates.png"
              alt=""
              className="absolute right-0 top-1/2 h-[80px] w-[96px] -translate-y-1/2 object-cover"
            />
          )}
          {step === 2 && (
            <span className="absolute right-4 top-4 flex items-center gap-sm rounded-full bg-card px-[14px] py-[6px] text-[13px] font-medium text-ink-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              Bénin (229)
            </span>
          )}
          <div className="relative z-10 flex h-full flex-col items-center justify-center pt-4">
            <span className="text-2xl font-bold tracking-tight text-primary select-none">
              {step === 1 ? 'TOKPa' : 'TOKPA'}
            </span>
            <span className="mt-1 text-xs font-medium tracking-widest text-primary-dark uppercase">
              Ton marché, ta façon
            </span>
          </div>
        </header>

        {/* ---------------- Corps ---------------- */}
        <div className="p-lg px-md pb-10 md:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-[22px] font-bold text-ink">Créer votre compte</h1>
            <p className="mt-1 text-sm text-ink-2">Rejoignez le marché digital béninois</p>
          </div>

          <Stepper steps={['Profil', 'Sécurité']} current={step} />

          {/* ============ ÉTAPE 1 : PROFIL ============ */}
          {step === 1 && (
            <form className="space-y-5" onSubmit={handleProfilSubmit} noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Prénom"
                  placeholder="Ex: Jean"
                  value={profil.prenom}
                  onChange={(e) => setProfilField('prenom', e.target.value)}
                  error={Boolean(profilErrors.prenom)}
                />
                <TextField
                  label="Nom de famille"
                  placeholder="Ex: Dossou"
                  value={profil.nom}
                  onChange={(e) => setProfilField('nom', e.target.value)}
                  error={Boolean(profilErrors.nom)}
                />
              </div>

              <TextField
                label="Adresse email"
                type="email"
                placeholder="jean.dossou@email.com"
                autoComplete="email"
                value={profil.email}
                onChange={(e) => setProfilField('email', e.target.value)}
                error={Boolean(profilErrors.email)}
              />

              <PhoneInput
                label="Numéro de téléphone"
                placeholder="01 00 00 00"
                value={profil.telephone}
                onChange={(e) => setProfilField('telephone', e.target.value.replace(/\s/g, ''))}
                error={Boolean(profilErrors.telephone)}
              />

              <SelectField
                label="Ville/Zone"
                value={profil.ville}
                onChange={(e) => setProfilField('ville', e.target.value)}
                error={Boolean(profilErrors.ville)}
              >
                <option value="">Sélectionner votre ville</option>
                {VILLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </SelectField>

              <button type="submit" className="btn btn-primary w-full">
                Continuer
                <IconArrowRight size={18} />
              </button>

              <p className="text-center text-sm text-ink-2">
                Déjà un compte ?{' '}
                <Link to="/connexion" className="font-semibold text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </form>
          )}

          {/* ============ ÉTAPE 2 : SÉCURITÉ ============ */}
          {step === 2 && (
            <form className="space-y-5" onSubmit={handleSecuritySubmit} noValidate>
              <div>
                <PasswordInput
                  label="Mot de passe"
                  placeholder="••••••••••••"
                  showLockIcon={false}
                  autoComplete="new-password"
                  value={security.password}
                  onChange={(e) => setSecurity((s) => ({ ...s, password: e.target.value }))}
                  error={Boolean(securityErrors.password)}
                />
                <div className="mt-sm flex items-center justify-between">
                  <span className="text-[13px] text-ink-2">Force du mot de passe:</span>
                  <span className={clsx('text-[13px] font-medium', strength.text)}>{strength.label}</span>
                </div>
                <div className="mt-xs flex gap-sm" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={clsx('h-[5px] flex-1 rounded-full', i <= score ? strength.color : 'bg-line')}
                    />
                  ))}
                </div>
                <p className="mt-sm text-[13px] text-ink-2">
                  Au moins 8 caractères, dont 1 chiffre & 1 lettre majuscule.
                </p>
              </div>

              <PasswordInput
                label="Confirmer le mot de passe"
                placeholder="••••••••••••"
                showLockIcon={false}
                autoComplete="new-password"
                value={security.confirm}
                onChange={(e) => setSecurity((s) => ({ ...s, confirm: e.target.value }))}
                error={Boolean(securityErrors.confirm)}
              />
              {securityErrors.confirm && (
                <p className="-mt-3 text-[13px] font-medium text-error-dark">{securityErrors.confirm}</p>
              )}

              <div className="space-y-md">
                <Checkbox
                  checked={security.cgu}
                  onChange={(v) => setSecurity((s) => ({ ...s, cgu: v }))}
                  label={
                    <>
                      J'accepte les{' '}
                      <button
                        type="button"
                        onClick={() => toast('CGU — document à venir')}
                        className="font-medium text-primary underline"
                      >
                        Conditions Générales d'Utilisation
                      </button>{' '}
                      et la{' '}
                      <button
                        type="button"
                        onClick={() => toast('Politique de confidentialité — document à venir')}
                        className="font-medium text-primary underline"
                      >
                        Politique de confidentialité
                      </button>{' '}
                      de TOKPa.
                    </>
                  }
                />
                {securityErrors.cgu && (
                  <p className="ml-[26px] text-[13px] font-medium text-error-dark">{securityErrors.cgu}</p>
                )}
                <Checkbox
                  checked={security.sms}
                  onChange={(v) => setSecurity((s) => ({ ...s, sms: v }))}
                  label="Recevoir les alertes d'accès sécurisé et codes OTP par SMS (+229)."
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">
                Créer mon compte
                <IconArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mx-auto flex items-center gap-sm text-[15px] text-ink-2 transition-colors hover:text-ink"
              >
                <IconArrowLeft size={18} />
                Retour à l'étape précédente (Profil)
              </button>

              <div className="h-px w-full bg-line" aria-hidden="true" />

              <p className="text-center text-sm text-ink-2">
                Vous avez déjà un compte ?{' '}
                <Link to="/connexion" className="font-semibold text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ---------------- Footer confiance (hors carte, maquette étape 2) ---------------- */}
      {step === 2 && (
        <p className="mt-lg flex items-center gap-sm text-[13px] text-ink-3">
          <IconCircleCheck size={18} className="text-success" />
          Données chiffrées SSL
          <span className="mx-sm" aria-hidden="true">•</span>
          <IconLock size={16} className="text-primary" />
          Conforme APDP Bénin
        </p>
      )}
    </div>
  );
}
