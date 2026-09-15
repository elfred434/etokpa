import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { IconArrowRight } from '@tabler/icons-react';
import Stepper from '../../components/auth/Stepper';
import RoleSelector from '../../components/auth/RoleSelector';
import type { RoleId } from '../../components/auth/RoleSelector';
import PhoneInput from '../../components/auth/PhoneInput';
import TextField from '../../components/ui/TextField';
import SelectField from '../../components/ui/SelectField';

/** Validation Zod du formulaire (F-01 : nom complet, email, téléphone). */
const schema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().regex(/^\d{8,10}$/, '8 à 10 chiffres attendus'),
  ville: z.string().min(1, 'Sélectionnez votre ville'),
  role: z.enum(['client', 'livreur', 'manager']),
});

const VILLES = ['Cotonou', 'Abomey-Calavi', 'Porto-Novo', 'Parakou', 'Bohicon', 'Natitingou'];

type FieldErrors = Partial<Record<'prenom' | 'nom' | 'email' | 'telephone' | 'ville' | 'role', string>>;

/**
 * Page Inscription — maquette Stitch `inscription_tokpa` (étape 1/3 du wizard).
 * Choix documenté (RAPPORT) : page unique conforme à la maquette ;
 * « Continuer » → page 2FA. Le stepper reste visuel (étapes 2-3 non maquettées).
 */
export default function InscriptionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    ville: '',
    role: 'client' as RoleId,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    // MOCK : création de compte + envoi du code 2FA (F-01) au Sprint 1.
    navigate({ to: '/verification-2fa' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-md md:p-lg">
      <div className="w-full max-w-[800px] overflow-hidden rounded-2xl bg-surface shadow-sm">
        {/* Bandeau header : fond orange clair, motif pointillé, cercle paille */}
        <header className="relative h-32 overflow-hidden bg-primary-lighter">
          <div
            className="absolute inset-0 opacity-20 bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:20px_20px]"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-3 -right-3 h-24 w-24 translate-x-4 translate-y-4 rounded-full opacity-40"
            style={{
              background: 'repeating-linear-gradient(45deg, #C4A58A 0 4px, #A98467 4px 8px)',
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full flex-col items-center justify-center pt-4">
            <span className="text-2xl font-bold tracking-tight text-primary select-none">TOKPa</span>
            <span className="mt-1 text-xs font-medium tracking-widest text-primary-dark uppercase">
              Ton marché, ta façon
            </span>
          </div>
        </header>

        <div className="p-lg px-md pb-10 md:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-[22px] font-bold text-ink">Créer votre compte</h1>
            <p className="mt-1 text-sm text-ink-2">Rejoignez le marché digital béninois</p>
          </div>

          <Stepper steps={['Profil', 'Rôle', 'Sécurité']} current={1} />

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Prénom"
                placeholder="Ex: Jean"
                value={form.prenom}
                onChange={(e) => set('prenom', e.target.value)}
                error={Boolean(errors.prenom)}
              />
              <TextField
                label="Nom de famille"
                placeholder="Ex: Dossou"
                value={form.nom}
                onChange={(e) => set('nom', e.target.value)}
                error={Boolean(errors.nom)}
              />
            </div>

            <TextField
              label="Adresse email"
              type="email"
              placeholder="jean.dossou@email.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={Boolean(errors.email)}
            />

            <PhoneInput
              label="Numéro de téléphone"
              placeholder="01 00 00 00"
              value={form.telephone}
              onChange={(e) => set('telephone', e.target.value.replace(/\s/g, ''))}
              error={Boolean(errors.telephone)}
            />

            <SelectField
              label="Ville/Zone"
              value={form.ville}
              onChange={(e) => set('ville', e.target.value)}
              error={Boolean(errors.ville)}
            >
              <option value="">Sélectionner votre ville</option>
              {VILLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </SelectField>

            <RoleSelector
              value={form.role}
              onChange={(role) => set('role', role)}
              error={Boolean(errors.role)}
            />

            <button type="submit" className="btn btn-primary w-full">
              Continuer
              <IconArrowRight size={18} />
            </button>
          </form>

          <p className="mt-lg text-center text-sm text-ink-2">
            Déjà un compte ?{' '}
            <Link to="/connexion" className="font-semibold text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
