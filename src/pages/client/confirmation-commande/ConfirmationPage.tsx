import { useRouterState, useNavigate } from '@tanstack/react-router';
import { IconCheck, IconMap, IconHeadset, IconSun, IconChevronRight } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { formatFCFA } from '../../../utils/format';
import { ZONES } from '../../../constants/mockData';

interface ConfirmationState {
  total?: number;
  zone?: string;
}

/** Page Confirmation de commande — copie conforme de la maquette v2 (succès FedaPay). */
export default function ConfirmationPage() {
  const navigate = useNavigate();
  const state = useRouterState({ select: (s) => s.location.state as ConfirmationState | undefined });
  const total = state?.total ?? 2580;
  const zoneNom = ZONES.find((z) => z.id === state?.zone)?.nom.replace('Zone ', '') ?? 'Cadjehoun';

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-md">
      <div className="w-full max-w-[800px] rounded-2xl bg-surface p-xl shadow-sm md:p-xl">
        {/* Confetti + coche */}
        <div className="relative mx-auto h-[96px] w-[96px]">
          <span className="absolute -left-6 top-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="absolute -top-3 left-10 h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
          <span className="absolute -right-7 top-6 h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
          <span className="absolute -left-9 top-12 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          <span className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-success-light">
            <IconCheck size={40} strokeWidth={2.5} className="text-success" />
          </span>
        </div>

        <h1 className="mt-lg text-center text-h2 text-ink">Commande confirmée !</h1>
        <p className="mt-sm text-center text-[15px] text-ink-2">Votre paiement a été accepté par FedaPay</p>

        <div className="mt-lg flex justify-center">
          <span className="rounded-lg border border-amber/30 bg-amber-light px-lg py-sm text-center font-semibold text-primary-dark">
            #TOK-2847
          </span>
        </div>

        {/* Récapitulatif */}
        <div className="mt-lg rounded-[12px] bg-page p-lg">
          <div className="flex items-center justify-between border-b border-line pb-md">
            <span className="text-[15px] text-ink-2">Total payé</span>
            <span className="price text-[18px]">{formatFCFA(total)}</span>
          </div>
          <div className="space-y-md pt-md">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-ink-2">Zone de livraison</span>
              <span className="text-[15px] font-bold text-ink">{zoneNom}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-ink-2">Arrivée estimée</span>
              <span className="text-[15px] font-bold text-ink">30–45 minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-ink-2">Livreur assigné</span>
              <span className="text-[15px] font-bold italic text-amber-text">En cours d'assignation…</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast('Suivi GPS temps réel — Sprint 3')}
          className="btn btn-primary mt-lg w-full"
        >
          <IconMap size={20} />
          Suivre ma commande
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/catalogue' })}
          className="mt-md w-full rounded-[10px] border border-line bg-card py-[12px] text-[15px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
        >
          Retour au catalogue
        </button>

        <button
          type="button"
          onClick={() => toast('Support — à venir')}
          className="mx-auto mt-lg flex items-center gap-sm text-[15px] text-primary hover:underline"
        >
          <IconHeadset size={18} />
          Besoin d'aide ? Contactez le support
        </button>

        {/* Parrainage */}
        <button
          type="button"
          onClick={() => toast('Parrainage — à venir')}
          className="mt-xl flex w-full items-center justify-between rounded-[12px] border border-amber/30 bg-amber-light p-lg text-left transition-transform active:scale-[0.98]"
        >
          <span>
            <span className="flex items-center gap-sm text-[15px] font-bold text-primary-dark">
              <IconSun size={18} className="text-amber" />
              Partagez TOKPa avec vos amis
            </span>
            <span className="mt-xs block text-[15px] text-amber-text">
              Obtenez 500 FCFA sur votre prochaine commande
            </span>
          </span>
          <IconChevronRight size={20} className="text-amber-text" />
        </button>
      </div>
    </div>
  );
}
