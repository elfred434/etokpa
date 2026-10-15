import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import EmptyState from '../../../components/shared/EmptyState';
import Pagination from '../../../components/shared/Pagination';
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
import { tx } from '../../../i18n/tx';
import { orderLineName } from '../../../utils/orderLine';
import { isCancelledStatut } from '../../../utils/orderStatus';
import { loadPayment, paymentIdempotencyKey, rememberPayment } from '../../../utils/idempotence';

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

  // Actualisation globale (bouton / silencieuse) : rejoue la liste sans squelette.
  const tick = useGlobalRefreshTick();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!silentRefreshActive()) setLoading(true);
    setError(null);
    ordersApi
      .getOrders(page, statusFilter)
      .then((res) => {
        const raw = (res?.data ?? res ?? []) as Array<Record<string, unknown> & { data?: ApiOrder }>;
        const list: ApiOrder[] = (Array.isArray(raw) ? raw : []).map((o) => (o.data ?? o) as ApiOrder);
        setOrders(statusFilter ? list.filter((o) => o.statut === statusFilter) : list);
        setLastPage(Number(res?.meta?.last_page ?? res?.last_page ?? 1));
        setTotal(Number(res?.meta?.total ?? res?.total ?? list.length));
      })
      .catch((err) => {
        setError(alertApiError(err, 'orders-list'));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, page, statusFilter, tick]);

  const payLock = useRef(false);
  const handlePayer = async (order: ApiOrder) => {
    if (payLock.current || paying) return;
    if (order.payment?.statut === 'reussi') {
      toast.success(tx("Cette commande est déjà payée."));
      return;
    }
    const saved = loadPayment(order.id);
    if (saved?.redirectUrl && order.payment?.statut !== 'echoue') {
      toast.success(tx("Ce paiement est déjà lancé. On rouvre le même lien."));
      window.location.assign(saved.redirectUrl);
      return;
    }
    payLock.current = true;
    setPaying(true);
    try {
      const result = await paymentsApi.initPayment({ order_id: order.id }, paymentIdempotencyKey(order.id));
      const payment = result?.data ?? result;
      const redirectUrl = payment?.redirect_url as string | undefined;
      rememberPayment({
        orderId: order.id,
        paymentId: Number(payment?.payment?.id ?? payment?.id) || undefined,
        paymentRef: payment?.payment?.fedapay_ref ?? payment?.fedapay_ref,
        redirectUrl,
        currency: payment?.currency,
      });
      if (redirectUrl) window.location.assign(redirectUrl);
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
    if (!confirm(isFr ? `Annuler la commande #TOK-${o.id} ?` : `Cancel order #TOK-${o.id}?`)) return;
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
        console.warn(`[anti-IDOR] ?detail=${id} refusé (commande absente de GET /orders)`);
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
      <div className="bg-bg-app min-h-screen flex items-center justify-center font-body text-text-main">
        <MIcon name="sync" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');
  const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');
  const money = (n?: number) => `${Number(n ?? 0).toLocaleString('fr-FR')} ${selected?.devise ?? 'FCFA'}`;
  /** Devise de la commande ouverte (les montants de la modale restent homogènes). */
  const devise = selected?.devise ?? 'FCFA';

  return (
    <div className="bg-bg-app font-body text-on-surface antialiased min-h-screen flex flex-col">
      <ClientNavbar />

      <main className="flex-grow px-4 py-xl pb-[80px] pt-[52px] sm:px-lg md:pb-0">
        <div className="max-w-[1000px] mx-auto">
          {/* En-tête */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-lg">
            <h1 className="font-h1 text-h1 text-on-surface">{isFr ? tx("Mes commandes") : 'My orders'}</h1>
            <span className="text-micro text-text-secondary bg-bg-card border border-border-default rounded-lg px-3 py-1.5">
              {total} {isFr ? tx("commande(s)") : 'order(s)'}
            </span>
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
            <div className="py-2xl flex justify-center bg-bg-card rounded-lg border border-border-default">
              <MIcon name="sync" className="text-primary text-3xl animate-spin" />
            </div>
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
                                const full = (res?.data ?? res) as ApiOrder;
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
                            <span
                              className={`inline-flex items-center gap-xs px-md py-xs rounded-full text-micro font-bold border whitespace-nowrap ${
                                STATUT_BADGE[o.statut] ?? 'bg-bg-secondary text-text-secondary border-border-default'
                              }`}
                            >
                              {isFr ? label.fr : label.en}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-md py-sm text-text-secondary">
                            {o.livreur?.nom_complet ?? '—'}
                          </td>
                          <td className="hidden px-md py-sm text-right md:table-cell">
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
                {!selected.payment && selected.statut !== 'annule' && (
                  <BoutonPrincipal onClick={() => handlePayer(selected)} icone={paying ? 'sync' : 'payments'} disabled={paying}>
                    {tx("Payer")}
                  </BoutonPrincipal>
                )}
                {!isCancelledStatut(selected.statut) && (
                  selected.payment || selected.statut === 'annule' ? (
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
                  {selected.payment.statut}
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
