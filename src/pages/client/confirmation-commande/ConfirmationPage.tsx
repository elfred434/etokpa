// Page de retour après paiement FedaPay vérifiant le statut de la transaction.
import { useEffect, useRef, useState } from 'react';
import { useRouterState, useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { catalogApi, ordersApi, paymentsApi } from '../../../services/api';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { alertApiError } from '../../../utils/apiError';
import { useLanguage } from '../../../context/LanguageContext';
import { tx } from '../../../i18n/tx';
import { useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { loadConfirmation, statutFromFedaPayReturn, type ConfirmationMemory } from './confirmationMemory';

interface ConfirmationState {
  orderId?: number;
  total?: number;
  zoneNom?: string;
  landmarkNom?: string;
  nbItems?: number;
  paymentId?: number;
  paymentRef?: string;
  paymentCurrency?: string;
}

const PAY_MSG: Record<string, string> = {
  reussi: 'Votre paiement a été accepté par FedaPay',
  en_attente: 'Paiement en attente de confirmation FedaPay',
  echoue: 'Le paiement FedaPay a échoué',
  rembourse: 'Votre paiement a été remboursé',
};

// Helper asOrder : réalise le traitement métier associé.
function asOrder(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const nested = row.data;
  if (nested && typeof nested === 'object' && 'id' in (nested as object)) return nested as Record<string, unknown>;
  return row;
}

// Composant de la page Confirmation : gère le chargement des données et le rendu.
export default function ConfirmationPage() {
  useLanguage();
  const navigate = useNavigate();
  const { status, id: fedapayId } = useSearch({ from: '/confirmation' });
  const passed = useRouterState({ select: (s) => s.location.state as ConfirmationState | undefined });
  const remembered = !passed?.orderId ? loadConfirmation(fedapayId) : null;
  const [restored, setRestored] = useState<ConfirmationMemory | null>(remembered);
  const refreshTick = useGlobalRefreshTick();
  const state = passed?.orderId ? passed : restored ?? passed;

  // Charge ou synchronise les données depuis l’API au montage ou lors d’un changement de dépendance.
  useEffect(() => {
    if (passed?.orderId || restored?.orderId) return;
    if (!localStorage.getItem('tokpa_token')) return;
    let alive = true;
    (async () => {
      try {
        const listRes = await ordersApi.getOrders(1);
        const raw = (listRes?.data ?? listRes ?? []) as unknown[];
        const first = asOrder(Array.isArray(raw) ? raw[0] : null);
        const orderId = Number(first?.id ?? 0);
        if (!orderId) return;
        const detailRes = await ordersApi.getOrder(orderId);
        const detail = asOrder(detailRes);
        if (!detail || !alive) return;
        const landmark = detail.landmark as { nom?: string; zone_id?: number; zone?: { id?: number; nom?: string } } | undefined;
        const landmarkZoneId = landmark?.zone_id ?? landmark?.zone?.id;
        let zoneNom: string | undefined = typeof landmark?.zone?.nom === 'string' ? landmark.zone.nom : undefined;
        if (!zoneNom && landmarkZoneId) {
          const zonesRes = await catalogApi.getZones();
          const zones = (zonesRes?.data ?? zonesRes ?? []) as unknown[];
          const match = zones.map(asOrder).find((z) => Number(z?.id) === landmarkZoneId);
          zoneNom = typeof match?.nom === 'string' ? match.nom : undefined;
        }
        const payment = detail.payment as { id?: number; fedapay_ref?: string } | undefined;
        setRestored({
          orderId,
          total: Number(detail.montant_total ?? 0),
          zoneNom,
          landmarkNom: landmark?.nom,
          paymentId: payment?.id ? Number(payment.id) : undefined,
          paymentRef: fedapayId ?? payment?.fedapay_ref ?? undefined,
          paymentCurrency: 'XOF',
        });
      } catch (err) {
        alertApiError(err, 'confirmation-order');
      }
    })();
    return () => {
      alive = false;
    };
  }, [passed?.orderId, restored?.orderId, fedapayId, status]);

  const total = state?.total ?? 0;
  const zoneNom = state?.zoneNom ?? '—';
  const landmarkNom = state?.landmarkNom ?? '—';
  const orderNumber = state?.orderId ? `#TOK-${state.orderId}` : null;
  const paymentId = state?.paymentId;
  const paymentRef = state?.paymentRef ?? fedapayId;
  const paymentCurrency = state?.paymentCurrency ?? 'XOF';
  const returnStatut = statutFromFedaPayReturn(status);

  const [payStatut, setPayStatut] = useState<string | null>(null);
  const finalRef = useRef(false);
  // Enregistre les écouteurs d’événements navigateur et les nettoie au démontage.
  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const res = await paymentsApi.getPayment(paymentId);
        const p = (res?.data ?? res) as { statut?: string } | undefined;
        if (!alive) return;
        const st = p?.statut ?? null;
        setPayStatut(st);
        finalRef.current = st !== null && st !== "en_attente";
        if (st === "en_attente" && ++tries < 36) timer = setTimeout(load, 5000);
      } catch (err) {
        alertApiError(err, 'payment-status');
      }
    };
    void load();
    const onFocus = () => {
      if (finalRef.current) return;
      clearTimeout(timer);
      tries = 0;
      void load();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [paymentId, refreshTick]);

  const shownStatut = payStatut && payStatut !== 'en_attente' ? payStatut : (returnStatut ?? payStatut);
  const payMessage = tx((shownStatut && PAY_MSG[shownStatut]) || "Votre commande a bien été enregistrée");
  const totalLabel = shownStatut === "reussi" || shownStatut === "rembourse" ? tx("Total payé") : tx("Total à payer");

  // Retourne le rendu JSX du composant.
  return (
    <div className="bg-bg-app font-body text-text-main flex flex-col min-h-screen">
      <ClientNavbar />

      <main className="flex-grow flex items-center justify-center px-md py-xl mt-[52px] md:mt-[64px] pb-24">
        <div className="flex w-full max-w-[520px] flex-col items-center rounded-xl border border-border-default/50 bg-bg-card p-4 text-center shadow-sm sm:p-lg md:p-xl lg:grid lg:max-w-[1000px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-x-8 lg:gap-y-md lg:p-8">
          <div className="flex w-full flex-col items-center lg:col-start-1 lg:row-start-1">
            <div className="relative mb-lg">
              <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center z-10 relative">
                <MIcon name="check" className="text-[40px] text-success" />
              </div>
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

            <h1 className="font-h1 text-h1 text-text-main mb-sm font-bold">{tx("Commande confirmée !")}</h1>
            <p className={`font-body text-body mb-md ${shownStatut === "echoue" ? 'text-error' : 'text-text-secondary'}`}>
              {payMessage}
            </p>

            {orderNumber && (
              <div className="bg-primary-tint text-primary-dark font-label text-label px-md py-sm rounded-lg mb-lg border border-primary-light font-bold">
                {orderNumber}
              </div>
            )}
          </div>

          <div className="w-full bg-bg-secondary rounded-lg p-md mb-lg space-y-md text-left border border-border-default/50 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:mb-0">
            <div className="flex justify-between items-center">
              <span className="font-body text-text-secondary">{totalLabel}</span>
              <span className="font-price text-price text-primary-container font-bold">
                {total.toLocaleString('fr-FR')} {paymentCurrency}
              </span>
            </div>
            <div className="h-[1px] bg-border-default w-full" />
            {paymentRef && (
              <div className="flex justify-between gap-md">
                <span className="font-body text-text-secondary">{tx("Référence FedaPay")}</span>
                <span className="font-body font-medium text-text-main text-right break-all">{paymentRef}</span>
              </div>
            )}
            {shownStatut && (
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">{tx("Statut du paiement")}</span>
                <span className={`font-body font-bold ${shownStatut === "reussi" ? 'text-success' : shownStatut === "echoue" ? 'text-error' : 'text-amber-text'}`}>
                  {shownStatut}
                </span>
              </div>
            )}
            <div className="space-y-sm">
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">{tx("Zone de livraison")}</span>
                <span className="font-body font-medium text-text-main">{zoneNom}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">{tx("Point de repère")}</span>
                <span className="font-body font-medium text-text-main text-right">{landmarkNom}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">{tx("Arrivée estimée")}</span>
                <span className="font-body font-medium text-text-main">{tx("30–45 minutes")}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-text-secondary">{tx("Livreur assigné")}</span>
                <span className="font-body font-medium text-primary italic">{tx("En cours d'assignation...")}</span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-md lg:col-start-1 lg:row-start-2 lg:self-start">
            <button
              type="button"
              onClick={() =>
                navigate({ to: '/commandes/suivi', search: state?.orderId ? { order: String(state.orderId) } : {} })
              }
              className="w-full bg-primary-container text-white font-label font-bold h-[48px] rounded-lg flex items-center justify-center gap-sm hover:bg-primary-hover active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <MIcon name="map" className="text-[20px]" />
              {tx("Suivre ma commande")}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/catalogue' })}
              className="w-full bg-bg-card border border-border-default text-text-secondary font-label font-bold h-[48px] rounded-lg hover:bg-bg-secondary active:scale-95 transition-all cursor-pointer"
            >
              Retour au catalogue
            </button>
          </div>

          <button
            type="button"
            onClick={() => toast(tx("Support client TOKPa — ouvert 7j/7"))}
            className="mt-lg flex items-center gap-xs font-label text-primary-container font-bold hover:underline transition-all cursor-pointer lg:col-start-1 lg:row-start-3 lg:mt-0"
          >
            <MIcon name="headset_mic" className="text-[18px]" />
            {tx("Besoin d'aide ? Contactez le support")}
          </button>

          <button
            type="button"
            onClick={() => toast.success(tx("Lien de parrainage copié ! Partagez-le avec vos proches."))}
            className="w-full mt-xl bg-primary-tint border border-primary-light rounded-lg p-md flex items-center justify-between text-left hover:bg-primary-light/30 transition-all cursor-pointer lg:col-span-2 lg:row-start-4 lg:mt-0"
          >
            <div className="flex flex-col">
              <span className="font-label text-primary-dark font-bold text-h3 flex items-center gap-1">
                🌟 Partagez TOKPa avec vos amis
              </span>
              <span className="text-micro text-primary">{tx("Obtenez 500 FCFA sur votre prochaine commande")}</span>
            </div>
            <MIcon name="chevron_right" className="text-primary-dark" />
          </button>
        </div>
      </main>

      <ClientBottomNav />
    </div>
  );
}
