import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import EmptyState from '../../../components/shared/EmptyState';
import LoadingState from '../../../components/shared/LoadingState';
import Pagination from '../../../components/shared/Pagination';
import TableRowActions from '../../../components/shared/TableRowActions';
import { adminDialogs } from '../../../components/shared/AdminActionDialogs';
import {
  ModalShell,
  BandeauFiche,
  FicheCard,
  LigneFiche,
  BoutonPrincipal,
  BoutonFermer,
} from '../../../components/shared/ModalShell';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { silentRefreshActive, useGlobalRefreshTick } from '../../../hooks/useRefresh';
import { ordersApi, paymentsApi } from '../../../services/api';
import { isOwnOrder } from '../../../utils/ownOrder';
import { alertApiError, extractApiError, formatApiError } from '../../../utils/apiError';
import { tr, tx } from '../../../i18n/tx';
import { orderLineName } from '../../../utils/orderLine';
import { isCancelledStatut } from '../../../utils/orderStatus';
import { clearPaymentIntent, loadPayment, paymentIdempotencyKey, rememberPayment } from '../../../utils/idempotence';
import { indexEffectivePayments, resolveOrderPayment, type OrderPaymentSummary } from '../../../utils/paymentSummary';
import { captureFrontendError } from '../../../services/errors/frontendErrorReporter';
import { downloadCsvFile } from '../../../utils/csvExport';
import { safePaymentRedirectUrl } from '../../../utils/safeUrl';

interface ApiOrderItem {
  id: number;
  product_id?: number | null;
  nom?: string;
  quantite: number;
  prix_unitaire: number;
}

/** Commande — exactement `OrderResource::$data` (GET /orders, GET /orders/{id}). */
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
  livreur?: { id: number; nom_complet: string; telephone?: string } | null;
  payment?: { id: number; montant: number; statut: string; methode: string } | null;
}

const STATUT_LABELS: Record<string, { fr: string; en: string }> = {
  en_attente: { fr: 'En attente', en: 'Pending' },
  en_preparation: { fr: 'En préparation', en: 'Preparing' },
  en_livraison: { fr: 'En livraison', en: 'Out for delivery' },
  livre: { fr: 'Livrée', en: 'Delivered' },
  annule: { fr: 'Annulée', en: 'Cancelled' },
};

/** Pastilles de statut — design de base (comme Profil / commandes récentes). */
const STATUT_BADGE: Record<string, string> = {
  en_attente: 'bg-amber-light text-amber-text border-amber',
  en_preparation: 'bg-primary-tint text-primary-dark border-primary-light',
  en_livraison: 'bg-primary-tint text-primary-dark border-primary-light',
  livre: 'bg-success-light text-success-dark border-success-light',
  annule: 'bg-error-light text-error-dark border-error/20',
};

/** Pastilles `.status-*` du thème — uniquement dans la modale (validée en l'état). */
const STATUT_CLASS: Record<string, string> = {
  en_attente: 'status-pending',
  en_preparation: 'status-preparing',
  en_livraison: 'status-shipping',
  livre: 'status-delivered',
  annule: 'status-cancelled',
};

/** Libellé traduit d'un statut de commande (les 5 langues via tx). */
const libelleStatut = (statut: string) => {
  const l = STATUT_LABELS[statut];
  return l ? tx(l.fr) : statut;
};

const articlesCount = (o: ApiOrder) => (o.items ?? []).reduce((s, it) => s + Number(it.quantite ?? 0), 0);

/**
 * OrdersListPage — Mes commandes (route /commandes) :
 *   - GET /api/orders?page={n}  → tableau paginé (OrderResource, paginate(15))
 *   - clic sur une ligne        → modale détails complète (items, totaux, livraison, livreur, paiement)
 *   - bouton « Suivre »         → /commandes/suivi?order={id}
 *   - bouton « Annuler »        → DELETE /api/orders/{id} (modale, statut en_attente uniquement — F-13)
 */
export default function OrdersListPage() {
  const { isFr } = useLanguage();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthGuard('/connexion');

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [lastPage, setLastPage] = useState(1);
  const [paying, setPaying] = useState(false);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ApiOrder | null>(null);
  const paymentMapRef = useRef<Map<number, OrderPaymentSummary>>(new Map());

  // Actualisation globale (bouton / silencieuse) : rejoue la liste sans squelette.
  const tick = useGlobalRefreshTick();

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    if (!silentRefreshActive()) setLoading(true);
    setError(null);
    const paymentsPromise =
      typeof paymentsApi.listMine === 'function'
        ? paymentsApi.listMine().catch(() => null)
        : Promise.resolve(null);
    const normalizeOrders = (res: unknown, paymentMap: Map<number, OrderPaymentSummary>): ApiOrder[] => {
      const r = res as { data?: unknown } | unknown[];
      const raw = ((Array.isArray(r) ? r : r?.data) ?? []) as Array<Record<string, unknown> & { data?: ApiOrder }>;
      return (Array.isArray(raw) ? raw : []).map((o) => {
        const order = (o.data ?? o) as ApiOrder;
        const resolvedPayment = resolveOrderPayment(order.id, order.payment, paymentMap);
        return resolvedPayment ? { ...order, payment: resolvedPayment } : order;
      });
    };
    void (async () => {
      const [firstRes, paymentsRes] = await Promise.all([
        ordersApi.getOrders(statusFilter ? 1 : page, statusFilter || undefined),
        paymentsPromise,
      ]);
      if (!alive) return;
      const paymentMap = indexEffectivePayments(paymentsRes);
      paymentMapRef.current = paymentMap;
      if (!statusFilter) {
        const list = normalizeOrders(firstRes, paymentMap);
        setOrders(list);
        setLastPage(Number(firstRes?.meta?.last_page ?? firstRes?.last_page ?? 1));
        setTotal(Number(firstRes?.meta?.total ?? firstRes?.total ?? list.length));
        return;
      }
      const all = normalizeOrders(firstRes, paymentMap);
      const totalPages = Math.min(25, Math.max(1, Number(firstRes?.meta?.last_page ?? firstRes?.last_page ?? 1)));
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => ordersApi.getOrders(i + 2, statusFilter)),
        );
        if (!alive) return;
        rest.forEach((res) => all.push(...normalizeOrders(res, paymentMap)));
      }
      const filtered = all.filter((o) => o.statut === statusFilter);
      const perPage = 15;
      setOrders(filtered.slice((page - 1) * perPage, page * perPage));
      setLastPage(Math.max(1, Math.ceil(filtered.length / perPage)));
      setTotal(filtered.length);
    })()
      .catch((err) => {
        if (alive) setError(alertApiError(err, 'orders-list'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [isAuthenticated, page, statusFilter, tick]);

  // Si la fiche d'une commande est ouverte pendant le refresh, relire aussi son détail complet.
  useEffect(() => {
    const id = selected?.id;
    if (!isAuthenticated || !id || tick === 0) return;
    let alive = true;
    ordersApi
      .getOrder(id)
      .then((res) => {
        if (!alive) return;
        const rawFull = (res?.data ?? res) as ApiOrder;
        const resolvedPayment = resolveOrderPayment(rawFull.id, rawFull.payment, paymentMapRef.current);
        const full = resolvedPayment ? { ...rawFull, payment: resolvedPayment } : rawFull;
        setSelected((current) => current?.id === id ? full : current);
      })
      .catch((err) => {
        if (alive) alertApiError(err, 'order-detail');
      });
    return () => { alive = false; };
  }, [isAuthenticated, selected?.id, tick]);

  const payLock = useRef(false);
  const handlePayer = async (order: ApiOrder) => {
    if (payLock.current || paying) return;
    if (order.payment?.statut === 'reussi') {
      toast.success(tx("Cette commande est déjà payée."));
      return;
    }
    const isRetry = order.payment?.statut === 'echoue';
    if (isRetry) {
      clearPaymentIntent(order.id);
    } else {
      const saved = loadPayment(order.id);
      const safeSavedRedirect = safePaymentRedirectUrl(saved?.redirectUrl);
      if (safeSavedRedirect) {
        toast.success(tx("Ce paiement est déjà lancé. On rouvre le même lien."));
        window.location.assign(safeSavedRedirect);
        return;
      }
    }
    payLock.current = true;
    setPaying(true);
    try {
      const result = await paymentsApi.initPayment({ order_id: order.id }, paymentIdempotencyKey(order.id));
      const payment = result?.data ?? result;
      const paymentRow = payment?.payment as { id?: number; montant?: number; statut?: string; methode?: string; fedapay_ref?: string } | undefined;
      const redirectUrl = payment?.redirect_url as string | undefined;
      rememberPayment({
        orderId: order.id,
        paymentId: Number(paymentRow?.id ?? payment?.id) || undefined,
        paymentRef: paymentRow?.fedapay_ref ?? payment?.fedapay_ref,
        redirectUrl,
        currency: payment?.currency,
      });
      if (paymentRow?.id) {
        const nextPayment = {
          id: Number(paymentRow.id),
          montant: Number(paymentRow.montant ?? order.montant_total ?? 0),
          statut: String(paymentRow.statut ?? 'en_attente'),
          methode: String(paymentRow.methode ?? 'fedapay'),
        };
        setOrders((prev) => prev.map((x) => (x.id === order.id ? { ...x, payment: nextPayment } : x)));
        setSelected((cur) => (cur && cur.id === order.id ? { ...cur, payment: nextPayment } : cur));
      }
      const safeRedirect = safePaymentRedirectUrl(redirectUrl);
      if (safeRedirect) window.location.assign(safeRedirect);
      else toast.success(isFr ? tx("Paiement initialisé.") : 'Payment initialized.');
    } catch (err) {
      toast.error(formatApiError(extractApiError(err)));
    } finally {
      payLock.current = false;
      setPaying(false);
    }
  };

  const search = useSearch({ from: '/commandes' }) as unknown as { detail?: string };

  const handleSuivre = (id: number) => {
    navigate({ to: '/commandes/suivi', search: { order: String(id) } });
  };

  // Annulation client — DELETE /api/orders/{id}. Le backend n'accepte que le statut
  // en_attente (sinon 422 « Seule une commande en attente peut être annulée. »).
  const [cancelling, setCancelling] = useState(false);
  const handleAnnuler = async (o: ApiOrder) => {
    if (cancelling) return;
    const confirme = await adminDialogs.confirm(
      tr(`Annuler définitivement la commande #TOK-${o.id} ?`, `Cancel order #TOK-${o.id}?`),
      { title: tx('Confirmer l’annulation'), confirmLabel: tx('Annuler la commande'), danger: true },
    );
    if (!confirme) return;
    setCancelling(true);
    try {
      await ordersApi.cancelOrder(o.id);
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, statut: 'annule' } : x)));
      setSelected((s) => (s && s.id === o.id ? { ...s, statut: 'annule' } : s));
      toast.success(isFr ? tx("Commande annulée") : 'Order cancelled');
    } catch (err) {
      toast.error(formatApiError(extractApiError(err)));
    } finally {
      setCancelling(false);
    }
  };

  // Ouverture de la modale via ?detail={id} (profil → « Détails ») — garde-fou anti-IDOR
  useEffect(() => {
    const raw = search.detail;
    if (!raw || !isAuthenticated || loading) return;
    const id = Number(raw);
    if (!Number.isFinite(id)) return;
    let alive = true;
    (async () => {
      const inList = orders.some((o) => Number(o.id) === id);
      if (!inList && !(await isOwnOrder(id))) {
        captureFrontendError(new Error('Order ownership check denied detail access'), {
          source: 'security-guard',
          status: 403,
        });
        return;
      }
      try {
        const res = await ordersApi.getOrder(id);
        if (alive) setSelected((res?.data ?? res) as ApiOrder);
      } catch (err) {
        if (alive) alertApiError(err, 'order-detail');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.detail, isAuthenticated, loading]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="bg-bg-app min-h-screen pb-24 font-body text-text-main">
        <ClientNavbar />
        <main className="mx-auto w-full max-w-[1100px] px-md pt-[76px]">
          <LoadingState variant="orders-table" count={5} label={tx('Chargement de vos commandes…')} />
        </main>
        <ClientBottomNav />
      </div>
    );
  }

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');
  const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');
  const money = (n?: number) => `${Number(n ?? 0).toLocaleString('fr-FR')} ${selected?.devise ?? 'FCFA'}`;
  /** Devise de la commande ouverte (les montants de la modale restent homogènes). */
  const devise = selected?.devise ?? 'FCFA';

  const exportOrdersCsv = () => {
    downloadCsvFile(
      `commandes-tokpa-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        tx('Référence'),
        tx('Date'),
        tx('Articles'),
        tx('Total (FCFA)'),
        tx('Statut'),
        tx('Livreur'),
        tx('Lieu'),
      ],
      orders.map((o) => [
        `#${o.id}`,
        fmtDate(o.created_at),
        articlesCount(o),
        Number(o.montant_total ?? 0),
        libelleStatut(o.statut),
        o.livreur?.nom_complet ?? '—',
        [o.landmark?.nom, o.description_lieu].filter(Boolean).join(' — ') || '—',
      ]),
    );
  };

  return (
    <div className="bg-bg-app font-body text-on-surface antialiased min-h-screen flex flex-col">
      <ClientNavbar />

      <main className="flex-grow px-4 py-xl pb-[80px] pt-[52px] sm:px-lg lg:pb-0">
        <div className="mx-auto w-full max-w-[1200px]">
          {/* En-tête */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-lg">
            <h1 className="font-h1 text-h1 text-on-surface">{isFr ? tx("Mes commandes") : 'My orders'}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={exportOrdersCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-card px-3 py-1.5 text-micro font-semibold text-on-surface hover:bg-bg-secondary cursor-pointer"
                >
                  <MIcon name="download" className="text-[16px]" />
                  {tx("Exporter CSV")}
                </button>
              )}
              <span className="text-micro text-text-secondary bg-bg-card border border-border-default rounded-lg px-3 py-1.5">
                {total} {isFr ? tx("commande(s)") : 'order(s)'}
              </span>
            </div>
          </div>

          <div className="mb-lg flex flex-wrap items-center gap-2">
            <label htmlFor="order-status" className="text-micro font-bold text-text-secondary">{isFr ? tx("Filtrer par statut") : 'Filter by status'}</label>
            <select id="order-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-border-default bg-bg-card px-3 py-2 text-label">
              <option value="">{isFr ? tx("Tous les statuts") : 'All statuses'}</option>
              {Object.entries(STATUT_LABELS).map(([value, label]) => <option key={value} value={value}>{isFr ? label.fr : label.en}</option>)}
            </select>
          </div>

          {error && (
            <div className="mb-lg p-3 bg-error-light border border-error/20 rounded-lg text-xs font-semibold text-error-dark leading-relaxed">
              {error}
            </div>
          )}

          {loading ? (
            <LoadingState variant="orders-table" count={5} label={tx('Chargement de vos commandes…')} />
          ) : orders.length === 0 ? (
            <div className="py-xl bg-bg-card rounded-lg border border-border-default">
              <EmptyState
                icon={<MIcon name="receipt_long" className="text-4xl text-primary" />}
                title={isFr ? tx("Aucune commande") : 'No orders yet'}
                description={isFr ? tx("Vos commandes apparaîtront ici.") : 'Your orders will appear here.'}
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
          ) : (
            /* Tableau — design de base (sans barre de défilement : colonnes responsives + scrollbar masquée) */
            <div className="bg-bg-card rounded-lg border border-border-default overflow-hidden">
              <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary text-micro font-bold text-text-secondary uppercase">
                      <th className="px-md py-sm">{tx("Réf")}</th>
                      <th className="hidden px-md py-sm md:table-cell">{isFr ? 'Date' : 'Date'}</th>
                      <th className="hidden px-md py-sm md:table-cell">{isFr ? tx("Articles") : 'Items'}</th>
                      <th className="hidden px-md py-sm md:table-cell">{isFr ? 'Total' : 'Total'}</th>
                      <th className="px-md py-sm">{isFr ? 'Statut' : 'Status'}</th>
                      <th className="hidden px-md py-sm lg:table-cell">{isFr ? tx("Livreur") : 'Rider'}</th>
                      <th className="hidden px-md py-sm text-right md:table-cell">{isFr ? 'Actions' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const label = STATUT_LABELS[o.statut] ?? { fr: o.statut, en: o.statut };
                      return (
                        <tr
                          key={o.id}
                          onClick={() => {
                            setSelected(o);
                            // recharge la version COMPLÈTE (payment chargé par show()) sans fermer la modale
                            ordersApi
                              .getOrder(o.id)
                              .then((res) => {
                                const rawFull = (res?.data ?? res) as ApiOrder;
                                const resolvedPayment = resolveOrderPayment(rawFull.id, rawFull.payment, paymentMapRef.current);
                                const full = resolvedPayment ? { ...rawFull, payment: resolvedPayment } : rawFull;
                                setOrders((prev) => prev.map((x) => (x.id === full.id ? full : x)));
                                setSelected((cur) => (cur?.id === full.id ? full : cur));
                              })
                              .catch(() => {});
                          }}
                          className="border-b border-border-default/60 last:border-0 hover:bg-bg-secondary cursor-pointer transition-colors"
                        >
                          <td className="px-md py-sm font-bold text-text-main">#{o.id}</td>
                          <td className="hidden px-md py-sm text-text-secondary md:table-cell">
                            {fmtDate(o.created_at)}
                          </td>
                          <td className="hidden px-md py-sm text-text-secondary md:table-cell">{articlesCount(o)}</td>
                          <td className="hidden px-md py-sm font-price text-text-main whitespace-nowrap md:table-cell">
                            {Number(o.montant_total ?? 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="px-md py-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-xs px-md py-xs rounded-full text-micro font-bold border whitespace-nowrap ${
                                  STATUT_BADGE[o.statut] ?? 'bg-bg-secondary text-text-secondary border-border-default'
                                }`}
                              >
                                {isFr ? label.fr : label.en}
                              </span>
                              {o.payment?.statut === 'echoue' && !isCancelledStatut(o.statut) && (
                                <button
                                  type="button"
                                  disabled={paying}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handlePayer(o);
                                  }}
                                  className="md:hidden inline-flex items-center gap-xs px-sm py-xs rounded-lg bg-primary-container text-white text-micro font-bold hover:bg-primary-hover active:scale-95 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                                >
                                  <MIcon name={paying ? 'sync' : 'payments'} className={`text-[14px] ${paying ? 'animate-spin' : ''}`} />
                                  {tr('Repayer', 'Pay again')}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-md py-sm text-text-secondary">
                            {o.livreur?.nom_complet ?? '—'}
                          </td>
                          <td className="hidden px-md py-sm text-right md:table-cell">
                            <TableRowActions>
                              {o.payment?.statut === 'echoue' && !isCancelledStatut(o.statut) && (
                                <button
                                  type="button"
                                  disabled={paying}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handlePayer(o);
                                  }}
                                  className="inline-flex items-center gap-xs px-md py-xs rounded-lg bg-primary-container text-white text-micro font-bold hover:bg-primary-hover active:scale-95 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                                >
                                  <MIcon name={paying ? 'sync' : 'payments'} className={`text-[14px] ${paying ? 'animate-spin' : ''}`} />
                                  {tr('Repayer', 'Pay again')}
                                </button>
                              )}
                              {!isCancelledStatut(o.statut) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSuivre(o.id);
                                  }}
                                  className="inline-flex items-center gap-xs px-md py-xs rounded-lg bg-primary-tint border border-primary-light text-primary-container text-micro font-bold hover:bg-primary-lighter active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <MIcon name="near_me" className="text-[14px]" />
                                  {isFr ? tx("Suivre") : 'Track'}
                                </button>
                              )}
                            </TableRowActions>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination — MÊME composant que Notifications / Profil (carrés 40px, page active orange) */}
          {lastPage > 1 && <Pagination page={page} pageCount={lastPage} onChange={setPage} className="mt-8" />}
        </div>
      </main>

      {/* MODALE DÉTAILS COMMANDE — gabarit commun (ModalShell), identique à la modale de
          paiement : en-tête icône + titre + sous-titre, bandeau #id / date / montant /
          statut, cartes de section sur fond bg-bg-secondary, pied d'actions. */}
      {selected && (
        <ModalShell
          testId={`order-modal-${selected.id}`}
          icone="shopping_bag"
          titre={`${tx("Commande")} #${selected.id}`}
          sousTitre={fmtDateTime(selected.created_at)}
          maxWidth={620}
          onFermer={() => setSelected(null)}
          pied={
            <>
              <div className="flex items-center gap-2 text-micro text-text-secondary">
                <MIcon name="credit_card" className="text-base text-text-tertiary" />
                {selected.payment
                  ? `${selected.payment.methode} · ${Number(selected.payment.montant).toLocaleString('fr-FR')} FCFA`
                  : tx("Paiement non initialisé")}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selected.statut === 'en_attente' && (
                  <button
                    type="button"
                    onClick={() => handleAnnuler(selected)}
                    disabled={cancelling}
                    className="px-4 py-2 text-label font-medium text-error hover:bg-error-light rounded-lg transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                  >
                    <MIcon name={cancelling ? 'sync' : 'cancel'} className={cancelling ? 'animate-spin' : undefined} />
                    {tx("Annuler")}
                  </button>
                )}
                {(!selected.payment || selected.payment.statut === 'echoue') && !isCancelledStatut(selected.statut) && (
                  <BoutonPrincipal onClick={() => handlePayer(selected)} icone={paying ? 'sync' : 'payments'} disabled={paying}>
                    {selected.payment?.statut === 'echoue' ? tr('Repayer', 'Pay again') : tx("Payer")}
                  </BoutonPrincipal>
                )}
                {!isCancelledStatut(selected.statut) && (
                  selected.payment && selected.payment.statut !== 'echoue' ? (
                    <BoutonPrincipal onClick={() => handleSuivre(selected.id)} icone="near_me">
                      {tx("Suivre cette commande")}
                    </BoutonPrincipal>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSuivre(selected.id)}
                      className="px-4 py-2 text-label font-medium text-text-secondary hover:bg-border-default/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <MIcon name="near_me" className="text-base" />
                      {tx("Suivre cette commande")}
                    </button>
                  )
                )}
                <BoutonFermer onClick={() => setSelected(null)} />
              </div>
            </>
          }
        >
          {/* Bandeau : identifiant, date, montant, statut */}
          <BandeauFiche
            id={selected.id}
            date={fmtDateTime(selected.created_at)}
            montant={money(selected.montant_total)}
            statut={
              <span className={`status ${STATUT_CLASS[selected.statut] ?? ''} whitespace-nowrap`}>
                {libelleStatut(selected.statut)}
              </span>
            }
          />

          {/* Articles */}
          <FicheCard icone="shopping_bag" titre={tx("Articles")} colonnes={1}>
            {(selected.items ?? []).length > 0 ? (
              <>
                {(selected.items ?? []).map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="min-w-0 break-words text-on-surface">
                      {tx(orderLineName(it))}
                      <span className="ml-2 text-micro text-text-secondary">
                        {Number(it.quantite).toLocaleString('fr-FR')} × {Number(it.prix_unitaire).toLocaleString('fr-FR')}{' '}
                        {devise}
                      </span>
                    </span>
                    <span className="font-bold text-on-surface">
                      {(Number(it.prix_unitaire) * Number(it.quantite)).toLocaleString('fr-FR')} {devise}
                    </span>
                  </div>
                ))}
                <div className="mt-1 space-y-1 border-t border-border-default pt-2">
                  <div className="flex flex-wrap justify-between gap-2 text-text-secondary">
                    <span>{tx("Sous-total produits")}</span>
                    <span>
                      {(selected.items ?? [])
                        .reduce((somme, it) => somme + Number(it.prix_unitaire) * Number(it.quantite), 0)
                        .toLocaleString('fr-FR')}{' '}
                      {devise}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-text-secondary">
                    <span>{tx("Frais de livraison")}</span>
                    <span>
                      {Number(selected.frais_livraison ?? 0).toLocaleString('fr-FR')} {devise}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 font-bold text-on-surface">
                    <span>{tx("Total")}</span>
                    <span>{money(selected.montant_total)}</span>
                  </div>
                </div>
              </>
            ) : (
              <span className="text-text-tertiary">{tx("Aucun article rattaché à cette commande.")}</span>
            )}
          </FicheCard>

          {/* Livraison */}
          <FicheCard icone="local_shipping" titre={tx("Livraison")}>
            <LigneFiche icone="location_on" etiquette={tx("Point de repère")} large>
              {selected.landmark?.nom ?? '—'}
            </LigneFiche>
            {selected.description_lieu && (
              <LigneFiche icone="notes" etiquette={tx("Précisions")} large>
                {selected.description_lieu}
              </LigneFiche>
            )}
            <LigneFiche icone="two_wheeler" etiquette={tx("Livreur")} large>
              {selected.livreur ? (
                <>
                  {selected.livreur.nom_complet}
                  {selected.livreur.telephone && (
                    <a
                      href={`tel:${selected.livreur.telephone.replace(/\s/g, '')}`}
                      className="ml-2 text-primary font-bold hover:underline"
                    >
                      {selected.livreur.telephone}
                    </a>
                  )}
                </>
              ) : (
                <span className="font-normal text-text-secondary">{tx("Livreur en cours d’assignation…")}</span>
              )}
            </LigneFiche>
          </FicheCard>

          {/* Paiement */}
          <FicheCard icone="credit_card" titre={tx("Paiement")}>
            {selected.payment ? (
              <>
                <LigneFiche icone="payments" etiquette={tx("Méthode")}>
                  {selected.payment.methode}
                </LigneFiche>
                <LigneFiche icone="schedule" etiquette={tx("Statut")}>
                  {selected.payment.statut === 'echoue' ? (
                    <span className="font-bold text-error">{tx("Paiement échoué")}</span>
                  ) : (
                    selected.payment.statut
                  )}
                </LigneFiche>
                <LigneFiche icone="receipt_long" etiquette={tx("Montant")} large>
                  {Number(selected.payment.montant).toLocaleString('fr-FR')} {devise}
                </LigneFiche>
              </>
            ) : (
              <span className="text-text-secondary">{tx("Paiement non initialisé")}</span>
            )}
          </FicheCard>
        </ModalShell>
      )}

      <ClientBottomNav />
    </div>
  );
}
