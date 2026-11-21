import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import EmptyState from '../../../components/shared/EmptyState';
import { TrackingSkeleton } from '../../../components/shared/Skeleton';
import RealBeninMap from '../../../components/client/commandes/RealBeninMap';
import ReceiptButton from '../../../components/payments/ReceiptButton';
import { canDownloadReceipt } from '../../../services/receipts/receiptData';
import { useRiderLocation } from '../../../hooks/useRiderLocation';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { subscribeRealtimeRefresh } from '../../../hooks/useRealtimeNotifications';
import { silentRefreshActive, useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { catalogApi, ordersApi, paymentsApi } from '../../../services/api';
import { extractOrdersPage, isOwnOrder, parseOrderIdParam } from '../../../utils/ownOrder';
import { alertApiError, extractApiError, formatApiError } from '../../../utils/apiError';
import { tr, tx } from '../../../i18n/tx';
import { captureFrontendError } from '../../../services/errors/frontendErrorReporter';
import { clearPaymentIntent, paymentIdempotencyKey, rememberPayment } from '../../../utils/idempotence';
import { indexEffectivePayments, resolveOrderPayment } from '../../../utils/paymentSummary';

interface ApiRider {
  id: number;
  nom_complet: string;
  telephone?: string;
}

/** Un item de commande — exactement `OrderResource::$items`. */
interface ApiOrderItem {
  id: number;
  product_id?: number | null;
  nom?: string;
  quantite: number;
  prix_unitaire: number;
}

/** Commande — exactement `OrderResource::$data` (GET /orders et GET /orders/{id}). */
interface ApiOrder {
  id: number;
  montant_total?: number;
  frais_livraison?: number;
  devise?: string;
  statut: string;
  description_lieu?: string;
  created_at?: string;
  items?: ApiOrderItem[];
  landmark?: { id: number; nom: string; zone_id?: number } | null;
  livreur?: ApiRider | null;
  payment?: { id: number; montant: number; statut: string; methode: string } | null;
}

/** Position GPS — modèle `SuiviLivraison` sérialisé (decimal:7 → parfois string). */
interface TrackingPosition {
  latitude: number | string;
  longitude: number | string;
  horodatage?: string;
  livreur_id?: number;
  statut?: string;
}

/** GET /orders/{id}/tracking — exactement `TrackingController::show`. */
interface TrackingInfo {
  order_id?: number;
  statut?: string;
  position?: TrackingPosition | null;
  distance_km?: number | string | null;
}

/** Ordre du stepper d'après la machine à états du backend (Commande::STATUT_*). */
const STATUT_FLOW: Record<string, number> = {
  en_attente: 0,
  en_preparation: 1,
  en_livraison: 2,
  livre: 3,
};

/** Libellés FR des statuts réels (dont `annule`). */

/**
 * OrderTrackingPage — Suivi de commande avec GPS temps réel (route protégée).
 * - `?order={id}` (liens Confirmation / Panier) ; sinon liste des commandes + plus récente par défaut.
 * - GET /api/orders/{id}           → statut, montant, livreur assigné (nom + téléphone réels)
 * - GET /api/orders/{id}/tracking  → position + distance restante
 * - Reverb tracking.{id}           → livreur.position.updated (hook useRiderLocation)
 * - Reverb notifications.{userId}  → order.status.changed → rechargement du statut
 */
export default function OrderTrackingPage() {
  const { isFr } = useLanguage();
  const { isAuthenticated, isLoading } = useAuthGuard('/connexion');
  const navigate = useNavigate();
  const search = useSearch({ from: '/commandes/suivi' }) as unknown as { order?: unknown; simu?: string };
  const refreshTick = useGlobalRefreshTick();

  const requestedOrderId = parseOrderIdParam(search.order);
  const hasInvalidOrderParam =
    search.order !== undefined &&
    String(search.order).trim() !== '' &&
    requestedOrderId === null;

  const [allOrders, setAllOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(requestedOrderId);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(Boolean(requestedOrderId));
  const [verifiedOrderId, setVerifiedOrderId] = useState<number | null>(null);
  const [deniedOrderId, setDeniedOrderId] = useState<number | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [paying, setPaying] = useState(false);
  const payLock = useRef(false);
  const prevSelectedIdRef = useRef<number | null>(requestedOrderId);
  const ordersPage1Ref = useRef<{
    tick: number;
    promise: Promise<{ list: ApiOrder[]; lastPage: number; error: unknown | null }>;
  } | null>(null);

  const handleRepayer = async (target: ApiOrder) => {
    if (payLock.current || paying) return;
    clearPaymentIntent(target.id);
    payLock.current = true;
    setPaying(true);
    try {
      const result = await paymentsApi.initPayment({ order_id: target.id }, paymentIdempotencyKey(target.id));
      const payment = result?.data ?? result;
      const paymentRow = payment?.payment as { id?: number; montant?: number; statut?: string; methode?: string; fedapay_ref?: string } | undefined;
      const redirectUrl = payment?.redirect_url as string | undefined;
      rememberPayment({
        orderId: target.id,
        paymentId: Number(paymentRow?.id ?? payment?.id) || undefined,
        paymentRef: paymentRow?.fedapay_ref ?? payment?.fedapay_ref,
        redirectUrl,
        currency: payment?.currency,
      });
      if (paymentRow?.id) {
        setOrder((cur) =>
          cur && cur.id === target.id
            ? {
                ...cur,
                payment: {
                  id: Number(paymentRow.id),
                  montant: Number(paymentRow.montant ?? cur.montant_total ?? 0),
                  statut: String(paymentRow.statut ?? 'en_attente'),
                  methode: String(paymentRow.methode ?? 'fedapay'),
                },
              }
            : cur,
        );
      }
      if (redirectUrl) window.location.assign(redirectUrl);
      else toast.success(isFr ? tx("Paiement initialisé.") : 'Payment initialized.');
    } catch (err) {
      toast.error(formatApiError(extractApiError(err)));
    } finally {
      payLock.current = false;
      setPaying(false);
    }
  };

  // Chargement de la liste (pour le sélecteur quand pas de ?order=, et page 1 partagée avec la vérif d'appartenance)
  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    const promise = ordersApi
      .getOrders()
      .then((res) => {
        const { list, lastPage } = extractOrdersPage(res);
        return { list: list as unknown as ApiOrder[], lastPage, error: null as unknown | null };
      })
      .catch((err) => ({ list: [] as ApiOrder[], lastPage: 1, error: err as unknown }));
    ordersPage1Ref.current = { tick: refreshTick, promise };

    promise
      .then(({ list, error }) => {
        if (!alive) return;
        if (error) {
          setOrdersError(alertApiError(error, 'tracking-orders'));
          return;
        }
        setAllOrders(list);
        setOrdersError(null);
        if (!selectedId && !hasInvalidOrderParam && list.length > 0) {
          // sans ?order= : seulement une commande encore en cours. Une commande annulée n'est pas suivie.
          const active = list.find((o) => ['en_attente', 'en_preparation', 'en_livraison'].includes(o.statut));
          if (active) setSelectedId(active.id);
        }
      })
      .finally(() => {
        if (alive) setOrdersLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, refreshTick]);

  // Sync URL (?order=) → sélection (édition manuelle de l'URL et ?order=%2256%22 inclus)
  useEffect(() => {
    if (requestedOrderId !== null) {
      setSelectedId(requestedOrderId);
    }
  }, [requestedOrderId]);

  // Chargement commande + tracking — UNIQUEMENT si la commande figure dans MES commandes
  // (anti-IDOR côté UI : aucune donnée d'une commande étrangère n'est jamais affichée, y compris session admin/manager)
  useEffect(() => {
    if (!isAuthenticated || !selectedId) return;

    const isNewSelection = prevSelectedIdRef.current !== selectedId;
    prevSelectedIdRef.current = selectedId;

    // Si cette commande a déjà été refusée, ne jamais réinitialiser deniedOrderId sur un refreshTick
    // (évite de flasher brièvement des infos avant de réafficher l'erreur toutes les 30s).
    if (!isNewSelection && deniedOrderId === selectedId) {
      return;
    }

    let alive = true;
    const silent = !isNewSelection && silentRefreshActive() && verifiedOrderId === selectedId;
    if (!silent) {
      setOrder(null);
      setTracking(null);
      setVerifiedOrderId(null);
      setDeniedOrderId(null);
      setDetailError(null);
      setDetailLoading(true);
    }

    (async () => {
      try {
        let mine = false;
        const page1Holder = ordersPage1Ref.current;
        if (page1Holder && page1Holder.tick === refreshTick) {
          const page1 = await page1Holder.promise;
          if (!alive) return;
          if (page1.error) {
            if (!silent) {
              setDetailError(alertApiError(page1.error, 'tracking-orders'));
            }
            setDetailLoading(false);
            return;
          }
          mine = page1.list.some((o) => Number(o.id) === Number(selectedId));
          if (!mine && page1.lastPage > 1) {
            mine = await isOwnOrder(selectedId, 2);
          }
        } else {
          mine = await isOwnOrder(selectedId);
        }
        if (!alive) return;
        if (!mine) {
          captureFrontendError(new Error('Order ownership check denied detail access'), {
            source: 'security-guard',
            status: 403,
          });
          setOrder(null);
          setTracking(null);
          setVerifiedOrderId(null);
          setDetailError(null);
          setDeniedOrderId(selectedId);
          setDetailLoading(false);
          return;
        }

        const paymentsPromise =
          typeof paymentsApi.listMine === 'function'
            ? paymentsApi.listMine().catch(() => null)
            : Promise.resolve(null);
        const [res, paymentsRes] = await Promise.all([ordersApi.getOrder(selectedId), paymentsPromise]);
        if (!alive) return;
        const rawFull = (res?.data ?? res) as ApiOrder;
        const resolvedPayment = resolveOrderPayment(rawFull.id, rawFull.payment, indexEffectivePayments(paymentsRes));
        const full = resolvedPayment ? { ...rawFull, payment: resolvedPayment } : rawFull;
        setOrder(full);
        setVerifiedOrderId(selectedId);
        setDeniedOrderId(null);
        setDetailError(null);
        setDetailLoading(false);
        if (full.statut === 'annule') return;
        try {
          const t = await ordersApi.getTracking(selectedId);
          if (alive) setTracking(t as TrackingInfo);
        } catch {
          /* Le endpoint /tracking est optionnel tant qu'aucune position GPS n'est disponible. */
        }
      } catch (err) {
        if (!alive) return;
        const status = (err as { response?: { status?: number } } | null)?.response?.status;
        if (status === 403 || status === 404) {
          setOrder(null);
          setTracking(null);
          setVerifiedOrderId(null);
          setDetailError(null);
          setDeniedOrderId(selectedId);
          setDetailLoading(false);
          return;
        }
        if (!silent) {
          setOrder(null);
          setTracking(null);
          setVerifiedOrderId(null);
        }
        setDetailError(alertApiError(err, 'tracking-detail'));
        setDetailLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedId, refreshTick]);

  // Destination RÉELLE de la commande : landmark (point_reperes) → GPS via GET /zones.points_repere
  useEffect(() => {
    const lmId = order?.landmark?.id;
    if (!lmId || verifiedOrderId !== selectedId) {
      setDestCoords(null);
      return;
    }
    let alive = true;
    catalogApi
      .getZones()
      .then((res) => {
        const list = (res?.data ?? res ?? []) as Array<{
          points_repere?: Array<{ id: number; latitude?: number | string; longitude?: number | string }>;
        }>;
        for (const z of Array.isArray(list) ? list : []) {
          for (const p of z.points_repere ?? []) {
            if (Number(p.id) === Number(lmId)) {
              const lat = Number(p.latitude);
              const lng = Number(p.longitude);
              if (alive && Number.isFinite(lat) && Number.isFinite(lng)) setDestCoords([lat, lng]);
              return;
            }
          }
        }
      })
      .catch(() => {
        /* zones indisponibles → pas de marqueur destination (honnête) */
      });
    return () => {
      alive = false;
    };
  }, [order?.landmark?.id, verifiedOrderId, selectedId]);

  const accessDenied = hasInvalidOrderParam || (!!selectedId && deniedOrderId === selectedId);
  const isVerifiedOrder = !!selectedId && verifiedOrderId === selectedId && !!order && !accessDenied;

  // Rafraîchissement temps réel sur les événements de statut (notifications.{userId})
  useEffect(() => {
    if (!isAuthenticated || !isVerifiedOrder || !selectedId) return;
    return subscribeRealtimeRefresh(['orders'], (e) => {
      if (e.scope === 'orders') {
        ordersApi.getOrder(selectedId).then((res) => setOrder((res?.data ?? res) as ApiOrder)).catch(() => {});
        ordersApi.getTracking(selectedId).then((t) => setTracking(t as TrackingInfo)).catch(() => {});
      }
    });
  }, [isAuthenticated, isVerifiedOrder, selectedId]);

  // Position GPS réelle (GET /orders/{id}/tracking → position) : priorité sur la simulation
  const realPosition = useMemo<[number, number] | null>(() => {
    const p = tracking?.position;
    if (!p) return null;
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  }, [tracking]);

  const { riderCoords, estimatedMinutes, source } = useRiderLocation({
    orderId: isVerifiedOrder && selectedId ? String(selectedId) : undefined,
    enabled: isAuthenticated && isVerifiedOrder && order?.statut !== 'annule',
    realPosition,
    destinationCoords: destCoords ?? undefined, // ETA vers la destination RÉELLE de la commande
    allowSimulation: search.simu === '1', // démo opt-in uniquement : sans ça, aucune position inventée
    simulatedSpeedMs: 2500,
  });

  const distanceKm = useMemo(() => {
    const d = tracking?.distance_km;
    if (d === undefined || d === null) return null;
    return Number(d);
  }, [tracking]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="bg-bg-app min-h-screen flex flex-col font-body text-text-main">
        <ClientNavbar />
        <main className="mx-auto w-full max-w-[1200px] px-md pt-[68px] pb-[96px]">
          <TrackingSkeleton label={tx('Chargement du suivi…')} />
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  const stepIndex = order ? (STATUT_FLOW[order.statut] ?? 0) : 0;
  const isDelivered = order?.statut === 'livre';
  const isCancelled = order?.statut === 'annule';
  const articlesCount = (order?.items ?? []).reduce((sum, it) => sum + Number(it.quantite ?? 0), 0);
  const rider = order?.livreur ?? null;
  const showDetailSpinner =
    !accessDenied &&
    !detailError &&
    !!selectedId &&
    (detailLoading || verifiedOrderId !== selectedId || !order);
  const showSpinner = ordersLoading || showDetailSpinner;
  const showEmpty =
    !showSpinner &&
    !accessDenied &&
    !detailError &&
    (!selectedId || (allOrders.length === 0 && !order));
  const showOrderContent = !showSpinner && !accessDenied && !showEmpty && isVerifiedOrder;
  const fetchError = accessDenied ? null : (detailError ?? (showOrderContent ? null : ordersError));
  const hideMapLayout = !showOrderContent || isCancelled;

  return (
    <div className="bg-bg-app font-body text-on-surface antialiased min-h-screen flex flex-col">
      <ClientNavbar />

      <main className="relative flex flex-grow flex-col overflow-hidden pt-[52px] pb-[80px] lg:pb-0 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:items-stretch lg:gap-lg lg:px-lg lg:pb-lg">
        {/* Pas de carte ni de suivi GPS si accès refusé, chargement ou commande annulée. */}
        {!hideMapLayout && (
          <section className="relative h-[420px] w-full overflow-hidden bg-info-light sm:h-[520px] lg:h-auto lg:min-h-[620px] lg:rounded-[20px]">
            <RealBeninMap
              riderCoords={riderCoords}
              riderName={rider?.nom_complet}
              destinationCoords={destCoords}
              destinationLabel={[order?.landmark?.nom, order?.description_lieu].filter(Boolean).join(' — ')}
            />
          </section>
        )}

        {/* STATUS PANEL (Floating Bottom Sheet) */}
        <section className={`relative z-40 ${hideMapLayout ? 'mt-md' : '-mt-8'} flex-grow overflow-y-auto rounded-t-[20px] bg-bg-card px-lg pt-lg pb-xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] mx-auto w-full max-w-[800px] lg:mt-0 lg:rounded-[20px] lg:shadow-sm ${hideMapLayout ? 'lg:col-span-2 lg:max-w-[920px] lg:justify-self-center' : 'lg:max-w-none lg:px-xl lg:pt-xl lg:pb-xl'}`}>
          <div className="w-12 h-1.5 bg-border-default rounded-full mx-auto mb-lg" />

          {fetchError && (
            <div className="mb-lg p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark leading-relaxed">
              {fetchError}
            </div>
          )}

          {showSpinner ? (
            <TrackingSkeleton label={tx('Chargement du suivi de la commande…')} />
          ) : showEmpty ? (
            <div className="py-xl">
              <EmptyState
                icon={<MIcon name="local_shipping" className="text-4xl text-primary" />}
                title={isFr ? tx("Aucune commande à suivre") : 'No orders to track'}
                description={isFr ? tx("Vos commandes en cours apparaîtront ici.") : 'Your ongoing orders will appear here.'}
                action={
                  <button
                    type="button"
                    className="px-lg py-3 bg-primary-container text-white rounded-lg font-bold cursor-pointer"
                    onClick={() => navigate({ to: '/catalogue' })}
                  >
                    {isFr ? tx("Explorer le marché") : 'Browse the market'}
                  </button>
                }
              />
            </div>
          ) : accessDenied ? (
            <div className="py-xl">
              <EmptyState
                icon={<MIcon name="lock" className="text-4xl text-error-dark" />}
                title={isFr ? tx("Commande introuvable") : 'Order not found'}
                description={
                  isFr
                    ? 'Cette commande n’existe pas sur votre compte : elle ne peut pas être suivue ici.'
                    : 'This order does not exist on your account: it cannot be tracked here.'
                }
                action={
                  <button
                    type="button"
                    className="px-lg py-3 bg-primary-container text-white rounded-lg font-bold cursor-pointer"
                    onClick={() => navigate({ to: '/commandes' })}
                  >
                    {isFr ? tx("Mes commandes") : 'My orders'}
                  </button>
                }
              />
            </div>
          ) : !showOrderContent ? null : (
            <>
              {/* Commande suivie — EN LECTURE SEULE (aucune sélection de statut : réservée au livreur assigné) */}
              <div className="flex justify-between items-center mb-md">
                <span className="font-label text-label text-text-secondary">
                  {isFr ? tx("Commande") : 'Order'} #{selectedId}
                </span>
                <Link to="/commandes" className="text-label text-primary-container font-bold hover:underline">
                  {isFr ? tx("Toutes mes commandes") : 'All my orders'}
                </Link>
              </div>

              {/* Header Status with Live GPS Badge */}
              <div className="flex flex-wrap justify-between items-start mb-lg gap-2">
                <div>
                  <div
                    className={`inline-flex items-center gap-xs px-md py-xs rounded-full mb-sm border ${
                      isDelivered
                        ? 'bg-success-light text-success-dark border-success-light'
                        : isCancelled
                          ? 'bg-error-light text-error-dark border-error/20'
                          : 'bg-primary-tint text-primary-dark border-primary-light'
                    }`}
                  >
                    {!isDelivered && !isCancelled && <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping inline-block" />}
                    {(isDelivered || isCancelled) && <MIcon name={isCancelled ? 'cancel' : 'check'} className="text-[14px]" />}
                    <span className="text-label font-bold">
                      {isDelivered
                        ? isFr ? tx("Commande livrée") : 'Order delivered'
                        : isCancelled
                          ? isFr ? tx("Commande annulée") : 'Order cancelled'
                          : isFr ? 'Suivi en direct' : 'Live tracking'}
                    </span>
                  </div>
                  {!isDelivered && !isCancelled && (
                    <div className="flex items-center gap-sm text-primary-container">
                      <MIcon name="schedule" />
                      <span className="font-h3 font-bold">
                        {estimatedMinutes === null
                          ? isFr
                            ? tx("Arrivée estimée : dès la première position GPS")
                            : 'Estimated arrival: awaiting first GPS fix'
                          : isFr
                            ? `Arrivée estimée : ~${estimatedMinutes} min${
                                distanceKm !== null ? ` (${distanceKm.toFixed(1)} km restant)` : ''
                              }`
                            : `Estimated arrival: ~${estimatedMinutes} min${
                                distanceKm !== null ? ` (${distanceKm.toFixed(1)} km remaining)` : ''
                              }`}
                      </span>
                    </div>
                  )}
                </div>

                {!isCancelled && (
                <div className="text-micro bg-bg-secondary px-3 py-1.5 rounded-lg border border-border-default font-mono text-text-secondary">
                  {riderCoords ? (
                    <>
                      GPS: {riderCoords[0].toFixed(4)}, {riderCoords[1].toFixed(4)}
                      {source === 'websocket'
                        ? ' (WebSocket Reverb)'
                        : source === 'api'
                          ? ' (GPS API /orders/{id}/tracking)'
                          : ' (simulation ?simu=1)'}
                    </>
                  ) : isFr ? (
                    'Position du livreur non encore disponible'
                  ) : (
                    'Rider position not available yet'
                  )}
                </div>
                )}
              </div>

              {/* Progress Stepper — pas de suivi si la commande est annulée */}
              {!isCancelled && (
              <div className="relative flex justify-between items-center mb-xl px-sm">
                <div className="absolute left-md right-md h-[3px] bg-border-default top-1/2 -translate-y-1/2 z-0" />
                <div
                  className="absolute left-md h-[3px] bg-primary-container top-1/2 -translate-y-1/2 z-0 transition-all duration-700"
                  style={{ width: `${(stepIndex / 3) * 100}%` }}
                />

                {[
                  { labelFr: tx("Marché Dantokpa"), labelEn: 'Dantokpa Market', icon: 'store' },
                  { labelFr: tx("Préparation"), labelEn: 'Preparing', icon: 'inventory_2' },
                  { labelFr: 'En cours de route', labelEn: 'In transit', icon: 'local_shipping' },
                  { labelFr: tx("Livrée"), labelEn: 'Delivered', icon: 'check_circle' },
                ].map((step, i) => {
                  const done = i < stepIndex || isDelivered;
                  const active = i === stepIndex && !isDelivered;
                  return (
                    <div key={step.labelFr} className="relative z-10 flex w-[23%] flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                          done
                            ? 'bg-success text-white'
                            : active
                              ? 'bg-primary-container text-white animate-bounce'
                              : 'bg-bg-card border-2 border-border-default text-border-default'
                        }`}
                      >
                        <MIcon name={done ? 'check' : (step.icon as string)} className="text-[16px]" />
                      </div>
                      <span
                        className={`mt-sm max-w-[76px] text-center text-[10px] leading-tight sm:max-w-none sm:text-micro ${
                          active ? 'text-primary-container font-bold' : 'text-text-secondary'
                        }`}
                      >
                        {isFr ? step.labelFr : step.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Rider Info Card — pas de suivi livreur si la commande est annulée */}
              {!isCancelled && (
              <div className="mb-lg flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-secondary p-md">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center text-white font-bold text-h3">
                    {rider
                      ? rider.nom_complet
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'TK'}
                  </div>
                  <div>
                    <h4 className="font-label text-body text-text-main font-bold">
                      {rider ? rider.nom_complet : isFr ? 'Livreur en cours d’assignation…' : 'Rider being assigned…'}
                    </h4>
                    <p className="text-secondary text-text-secondary">
                      {rider
                        ? isFr
                          ? `Livreur TOKPa (zone Cotonou)`
                          : 'TOKPa rider (Cotonou zone)'
                        : isFr
                          ? 'Assignation par la supervision'
                          : 'Assigned by the supervisor'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-sm">
                  {rider?.telephone && (
                    <a
                      href={`tel:${rider.telephone.replace(/\s/g, '')}`}
                      className="w-10 h-10 bg-bg-card border border-border-default rounded-lg flex items-center justify-center text-primary-container active:scale-95 transition-transform"
                      title={isFr ? 'Appeler le livreur' : 'Call rider'}
                    >
                      <MIcon name="call" />
                    </a>
                  )}
                  <Link
                    to="/messagerie"
                    className="w-10 h-10 bg-bg-card border border-border-default rounded-lg flex items-center justify-center text-primary-container active:scale-95 transition-transform"
                    title={isFr ? tx("Discuter") : 'Chat'}
                  >
                    <MIcon name="chat" />
                  </Link>
                </div>
              </div>
              )}

              {/* Order Summary Card — données réelles */}
              {order && (
                <div className="border border-border-default rounded-lg p-md">
                  <div className="flex justify-between items-center mb-xs">
                    <span className="text-label font-bold text-text-main">
                      {isFr ? tx("Commande") : 'Order'} #{order.id}
                    </span>
                    <Link
                      to="/messagerie"
                      className="text-label text-primary-container font-bold hover:underline"
                    >
                      {isFr ? tx("Contacter le support") : 'Contact support'}
                    </Link>
                  </div>
                  <div className="flex justify-between text-body">
                    <span className="text-text-secondary">
                      {articlesCount} {isFr ? 'article(s)' : 'item(s)'}
                      {order.created_at ? ` · ${new Date(order.created_at).toLocaleDateString('fr-FR')}` : ''}
                    </span>
                    <span className="font-price text-text-main">
                      {Number(order.montant_total ?? 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {(order.landmark?.nom || order.description_lieu) && (
                    <p className="mt-sm text-micro text-text-tertiary">
                      {isFr ? tx("Livraison") : 'Delivery'} : {order.landmark?.nom ?? '—'}
                      {order.description_lieu ? ` — ${order.description_lieu}` : ''}
                    </p>
                  )}
                  {/* Reçu de paiement — uniquement lorsque la livraison est lancée/livrée
                      avec un livreur assigné + bouton Repayer si le paiement a échoué */}
                  {((order.payment?.id && (!isCancelled || canDownloadReceipt(order))) ||
                    (!isCancelled && order.payment?.statut === 'echoue')) ? (
                    <div className="mt-sm border-t border-border-default pt-sm flex flex-wrap items-center justify-between gap-2">
                      {order.payment?.id && canDownloadReceipt(order) ? (
                        <ReceiptButton
                          payment={order.payment}
                          order={order}
                          testId={`receipt-order-${order.id}`}
                        />
                      ) : order.payment?.id && !isCancelled ? (
                        <span className="text-micro text-text-secondary">
                          {tr(
                            'Le reçu sera disponible dès la prise en charge par un livreur.',
                            'The receipt will be available once a courier is assigned.',
                          )}
                        </span>
                      ) : <span />}
                      {!isCancelled && order.payment?.statut === 'echoue' && (
                        <button
                          type="button"
                          disabled={paying}
                          onClick={() => void handleRepayer(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-white text-label font-bold hover:bg-primary-hover active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                        >
                          <MIcon name={paying ? 'sync' : 'payments'} className={`text-base ${paying ? 'animate-spin' : ''}`} />
                          {tr('Repayer', 'Pay again')}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <ClientBottomNav />
    </div>
  );
}
