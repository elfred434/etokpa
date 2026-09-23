import { useRouterState, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientFooter from '../../../components/layout/client/ClientFooter';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';

/**
 * Données passées par CartPage après POST /api/orders (vraies valeurs backend).
 */
interface ConfirmationState {
  orderId?: number;
  total?: number;
  zoneNom?: string;
  landmarkNom?: string;
  nbItems?: number;
}

/**
 * Page Confirmation de Commande — Reproduction 100% intégrale et fidèle de Stitch HTML `confirmation_de_commande_tokpa/code.html`
 * Les valeurs affichées proviennent de la commande réellement créée (state) ; fallbacks neutres si accès direct.
 */
export default function ConfirmationPage() {
  const navigate = useNavigate();
  const state = useRouterState({ select: (s) => s.location.state as ConfirmationState | undefined });
  const total = state?.total ?? 0;
  const zoneNom = state?.zoneNom ?? '—';
  const landmarkNom = state?.landmarkNom ?? '—';
  const orderNumber = state?.orderId ? `#TOK-${state.orderId}` : null;

  return (
    <div className="bg-bg-app font-body text-text-main flex flex-col min-h-screen">
      <ClientNavbar />

      <main className="flex-grow flex items-center justify-center px-md py-xl mt-[52px] md:mt-[64px] pb-24">
        <div className="w-full max-w-[520px] bg-bg-card rounded-xl p-lg md:p-xl shadow-sm flex flex-col items-center text-center border border-border-default/50">
          {/* Success Animation Container */}
          <div className="relative mb-lg">
            <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center z-10 relative">
              <MIcon name="check" className="text-[40px] text-success" />
            </div>
            {/* Discrete Confetti Dots */}
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"
              style={{ top: '-5px', left: '-10px' }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse"
              style={{ top: '10px', right: '-15px' }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-success animate-pulse"
              style={{ bottom: '-5px', left: '50%' }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"
              style={{ top: '40px', left: '-20px' }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse"
              style={{ top: '-10px', right: '20px' }}
            />
          </div>

          {/* Title & Messaging */}
          <h1 className="font-h1 text-h1 text-text-main mb-sm font-bold">Commande confirmée !</h1>
          <p className="font-body text-body text-text-secondary mb-md">
            Votre commande a bien été enregistrée
          </p>

          {/* Order Number Badge — numéro réel de la commande backend */}
          {orderNumber && (
            <div className="bg-primary-tint text-primary-dark font-label text-label px-md py-sm rounded-lg mb-lg border border-primary-light font-bold">
              {orderNumber}
            </div>
          )}

          {/* Summary Box */}
          <div className="w-full bg-bg-secondary rounded-lg p-md mb-lg space-y-md text-left border border-border-default/50">
            <div className="flex justify-between items-center">
              <span className="font-body text-text-secondary">Total payé</span>
              <span className="font-price text-price text-primary-container font-bold">
                {total.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="h-[1px] bg-border-default w-full" />
            <div className="space-y-sm">
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">Zone de livraison</span>
                <span className="font-body font-medium text-text-main">{zoneNom}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">Point de repère</span>
                <span className="font-body font-medium text-text-main text-right">{landmarkNom}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">Arrivée estimée</span>
                <span className="font-body font-medium text-text-main">30–45 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">Livreur assigné</span>
                <span className="font-body font-medium text-primary italic">En cours d'assignation...</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-md">
            <button
              type="button"
              onClick={() =>
                navigate({ to: '/commandes/suivi', search: state?.orderId ? { order: String(state.orderId) } : {} })
              }
              className="w-full bg-primary-container text-white font-label font-bold h-[48px] rounded-lg flex items-center justify-center gap-sm hover:bg-primary-hover active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <MIcon name="map" className="text-[20px]" />
              Suivre ma commande
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/catalogue' })}
              className="w-full bg-white border border-border-default text-text-secondary font-label font-bold h-[48px] rounded-lg hover:bg-bg-secondary active:scale-95 transition-all cursor-pointer"
            >
              Retour au catalogue
            </button>
          </div>

          {/* Footer Link */}
          <button
            type="button"
            onClick={() => toast('Support client TOKPa — ouvert 7j/7')}
            className="mt-lg flex items-center gap-xs font-label text-primary-container font-bold hover:underline transition-all cursor-pointer"
          >
            <MIcon name="headset_mic" className="text-[18px]" />
            Besoin d'aide ? Contactez le support
          </button>

          {/* Promo Banner */}
          <button
            type="button"
            onClick={() => toast.success('Lien de parrainage copié ! Partagez-le avec vos proches.')}
            className="w-full mt-xl bg-primary-tint border border-primary-light rounded-lg p-md flex items-center justify-between text-left hover:bg-primary-light/30 transition-all cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-label text-primary-dark font-bold text-h3 flex items-center gap-1">
                🌟 Partagez TOKPa avec vos amis
              </span>
              <span className="text-micro text-primary">Obtenez 500 FCFA sur votre prochaine commande</span>
            </div>
            <MIcon name="chevron_right" className="text-primary-dark" />
          </button>
        </div>
      </main>

      <ClientFooter />
      <ClientBottomNav />
    </div>
  );
}
