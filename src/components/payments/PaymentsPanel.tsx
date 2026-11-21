import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { backgroundRefreshActive, silentRefreshActive, useGlobalRefreshTick } from '../../hooks/useRefresh';
import MIcon from '../shared/MIcon';
import { TableSkeleton } from '../shared/Skeleton';
import { adminApi, ordersApi, paymentsApi } from '../../services/api';
import { currentUserId, currentUserName, currentUserPhone, isAdminRole } from '../../routes/authGuard';
import { canDownloadReceipt, type ReceiptClientInput, type ReceiptOrder } from '../../services/receipts/receiptData';
import ReceiptButton from './ReceiptButton';
import { dateCourte, fmtFcfa, listOf, unwrap } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { clearPaymentIntent, paymentIdempotencyKey, rememberPayment } from '../../utils/idempotence';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';
import { downloadCsvFile } from '../../utils/csvExport';
import { safePaymentRedirectUrl } from '../../utils/safeUrl';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type PaymentSource = 'mine' | 'all' | 'own-admin';

type PaymentRow = {
  id: number;
  order_id?: number;
  client_id?: number;
  montant?: number | string;
  methode?: string;
  statut?: string;
  fedapay_ref?: string | null;
  recu_url?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  order?: {
    id?: number;
    statut?: string;
    livreur_id?: number | null;
    livreur?: { id?: number; nom_complet?: string | null; telephone?: string | null } | null;
  } | null;
};

const STATUT_LABEL: Record<string, string> = {
  en_attente: 'Paiement en attente',
  reussi: 'Paiement réussi',
  echoue: 'Paiement échoué',
  rembourse: 'Paiement remboursé',
};

const STATUT_CLASS: Record<string, string> = {
  en_attente: 'bg-bg-secondary text-text-secondary',
  reussi: 'bg-success-container text-on-surface',
  echoue: 'bg-error-container text-on-error-container',
  rembourse: 'bg-primary-tint text-primary',
};

function asPayment(row: any): PaymentRow {
  const inner = row?.data && typeof row.data === 'object' && 'id' in row.data ? row.data : row;
  return inner as PaymentRow;
}

const LOADERS = {
  mine: () => paymentsApi.listMine(),
  all: () => paymentsApi.listAll(),
  'own-admin': () => paymentsApi.listOwnAsAdmin(),
};

export default function PaymentsPanel({ source, title }: { source: PaymentSource; title: string }) {
  useLanguage();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [repayingOrderId, setRepayingOrderId] = useState<number | null>(null);
  const repayLock = useRef(false);
  // Détail de la commande liée (client, livreur, adresse) — chargé À L'OUVERTURE
  // de la modale : GET /orders/{id} renvoie les relations (OrderResource), ce
  // que la liste des paiements ne fournit pas. Aucune modification backend.
  const [detail, setDetail] = useState<ReceiptOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Annuaire id → coordonnées client (nom + téléphone). Nécessaire car GET /orders/{id}
  // ne renvoie PAS le client (OrderController ne charge pas la relation) : sans cet
  // annuaire, la modale et le reçu ne pouvaient afficher que « #20 ». Réservé à la vue
  // administration (route /admin/users) — le client n'en a pas besoin.
  type ClientDirectoryEntry = { nom: string; telephone: string | null };
  const [annuaire, setAnnuaire] = useState<Record<number, ClientDirectoryEntry>>({});

  // Actualisation globale (bouton / silencieuse) : recharge les paiements sans squelette.
  const tick = useGlobalRefreshTick();
  const navigate = useNavigate();

  useEffect(() => {
    // Vue administration uniquement, et seulement pour un admin : la route
    // /admin/users est protégée côté backend ; on ne la sollicite pas depuis
    // la vue clientèle (qui n'a pas besoin des données des autres comptes).
    if (source !== 'all' || !isAdminRole()) return;
    let alive = true;
    type UserRow = { id?: number; nom_complet?: string; prenom?: string; nom?: string; telephone?: string | null };
    const collect = (res: unknown, map: Record<number, ClientDirectoryEntry>) => {
      for (const u of listOf(unwrap(res)) as UserRow[]) {
        const nom = u?.nom_complet ?? [u?.prenom, u?.nom].filter(Boolean).join(' ');
        const telephone = typeof u?.telephone === 'string' && u.telephone.trim() ? u.telephone.trim() : null;
        if (u?.id != null && (nom || telephone)) {
          map[Number(u.id)] = { nom: nom || `#${u.id}`, telephone };
        }
      }
    };
    (async () => {
      try {
        const first = await adminApi.getUsers({ per_page: 200 });
        if (!alive) return;
        const map: Record<number, ClientDirectoryEntry> = {};
        collect(first, map);
        const body = (first as { data?: { meta?: { last_page?: number } }; meta?: { last_page?: number } })?.data ?? first;
        const lastPage = Math.min(Number((body as { meta?: { last_page?: number } })?.meta?.last_page ?? 1) || 1, 20);
        for (let page = 2; page <= lastPage; page += 1) {
          const next = await adminApi.getUsers({ page, per_page: 200 });
          if (!alive) return;
          collect(next, map);
        }
        setAnnuaire(map);
      } catch {
        /* repli silencieux sur l'identifiant */
      }
    })();
    return () => {
      alive = false;
    };
  }, [source, tick]);

  useEffect(() => {
    const orderId = selected ? selected.order?.id ?? selected.order_id : null;
    if (!selected || !orderId) {
      setDetail(null);
      return;
    }
    let alive = true;
    if (!silentRefreshActive()) setDetailLoading(true);
    ordersApi
      .getOrder(orderId)
      .then((res) => {
        if (!alive) return;
        setDetail((((res as { data?: ReceiptOrder })?.data ?? res) as ReceiptOrder) ?? null);
      })
      .catch(() => {
        // Conserver le dernier détail affiché pendant une actualisation sans réseau.
      })
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [selected, tick]);

  const resolveClientForRow = (row: PaymentRow, orderDetail?: ReceiptOrder | null): ReceiptClientInput | null => {
    const detailNom = orderDetail?.client?.nom_complet?.trim() || null;
    const detailTel = orderDetail?.client?.telephone?.trim() || null;
    if (source === 'all') {
      const entry = row.client_id ? annuaire[Number(row.client_id)] : undefined;
      const nom = detailNom || entry?.nom || null;
      const telephone = detailTel || entry?.telephone || null;
      return nom || telephone ? { nom_complet: nom, telephone } : null;
    }
    if (row.client_id == null || row.client_id === currentUserId()) {
      const nom = detailNom || currentUserName();
      const telephone = detailTel || currentUserPhone();
      return nom || telephone ? { nom_complet: nom, telephone } : null;
    }
    return detailNom || detailTel ? { nom_complet: detailNom, telephone: detailTel } : null;
  };

  /**
   * Nom affiché pour « Client ».
   * - Vue administration : détail de la commande, sinon annuaire (/admin/users).
   * - Vue clientèle : le nom de la session, et UNIQUEMENT si la ligne appartient
   *   à l'utilisateur connecté — sinon l'identifiant, pour ne jamais exposer le
   *   nom d'un autre compte.
   */
  const selectedClientInfo = selected ? resolveClientForRow(selected, detail) : null;
  const nomClientAffiche = !selected
    ? '—'
    : selectedClientInfo?.nom_complet ||
      (selected.client_id ? `#${selected.client_id}` : '—');

  /** Ouvre la commande liée au paiement (suivi côté client, liste côté admin). */
  const ouvrirCommande = (orderId: number) => {
    setSelected(null);
    if (source === 'all' || source === 'own-admin') {
      void navigate({ to: '/admin/commandes' });
    } else {
      void navigate({ to: '/commandes/suivi', search: { order: String(orderId) } });
    }
  };

  useEffect(() => {
    let alive = true;
    const background = backgroundRefreshActive();
    if (!silentRefreshActive()) setLoading(true);
    if (!background) setErr(null);
    LOADERS[source]()
      .then((res) => {
        if (!alive) return;
        setRows(listOf(unwrap(res)).map(asPayment).filter((p) => p?.id != null));
        setErr(null);
      })
      .catch((e) => {
        if (!alive || background) return;
        setErr(formatApiError(extractApiError(e)));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [source, tick]);

  const hasOrderSucceeded = (orderId?: number | null) =>
    Boolean(orderId && rows.some((r) => (r.order?.id ?? r.order_id) === orderId && r.statut === 'reussi'));

  const canRepayPayment = (p: PaymentRow, orderStatut?: string) => {
    if (source !== 'mine') return false;
    const orderId = p.order?.id ?? p.order_id;
    if (!orderId || p.statut !== 'echoue') return false;
    if ((orderStatut ?? p.order?.statut) === 'annule') return false;
    return !hasOrderSucceeded(orderId);
  };

  const handleRepayer = async (orderId: number) => {
    if (repayLock.current || repayingOrderId !== null) return;
    clearPaymentIntent(orderId);
    repayLock.current = true;
    setRepayingOrderId(orderId);
    try {
      const result = await paymentsApi.initPayment({ order_id: orderId }, paymentIdempotencyKey(orderId));
      const payload = result?.data ?? result;
      const paymentRow = payload?.payment as PaymentRow | undefined;
      const redirectUrl = payload?.redirect_url as string | undefined;
      rememberPayment({
        orderId,
        paymentId: Number(paymentRow?.id ?? payload?.id) || undefined,
        paymentRef: paymentRow?.fedapay_ref ?? payload?.fedapay_ref,
        redirectUrl,
        currency: payload?.currency,
      });
      if (paymentRow?.id) {
        setRows((prev) => [asPayment(paymentRow), ...prev]);
      }
      const safeRedirect = safePaymentRedirectUrl(redirectUrl);
      if (safeRedirect) {
        window.location.assign(safeRedirect);
      } else {
        toast.success(tx("Paiement initialisé."));
      }
    } catch (e) {
      toast.error(formatApiError(extractApiError(e)));
    } finally {
      repayLock.current = false;
      setRepayingOrderId(null);
    }
  };

  const exportPaymentsCsv = () => {
    downloadCsvFile(
      `paiements-tokpa-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        tx('Paiement'),
        tx('Commande'),
        ...(source === 'all' ? [tx('Client')] : []),
        tx('Montant (FCFA)'),
        tx('Méthode'),
        tx('Statut'),
        tx('Référence'),
        tx('Payé le'),
      ],
      rows.map((p) => {
        const orderId = p.order?.id ?? p.order_id;
        return [
          `#${p.id}`,
          orderId ? `#${orderId}` : '—',
          ...(source === 'all' ? [p.client_id ? annuaire[Number(p.client_id)]?.nom ?? `#${p.client_id}` : '—'] : []),
          Number(p.montant ?? 0),
          p.methode || '—',
          tx(STATUT_LABEL[p.statut ?? ''] ?? (p.statut || '—')),
          p.fedapay_ref || '—',
          p.paid_at ? dateCourte(p.paid_at) : '—',
        ];
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-h2 font-h2 font-bold">{title}</h1>
          <p className="text-label text-text-secondary">{rows.length} {tx("Paiements")}</p>
        </div>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={exportPaymentsCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-card px-3 py-1.5 text-label font-semibold text-on-surface hover:bg-bg-secondary cursor-pointer"
          >
            <MIcon name="download" className="text-[16px]" />
            {tx("Exporter CSV")}
          </button>
        )}
      </div>
      {err && (
        <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container" role="alert">
          <p className="font-bold">{tx("Erreur API")}</p>
          <p>{err}</p>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-sm">
        {loading && <TableSkeleton rows={6} cols={source === 'all' ? 6 : 5} label={tx("Chargement des paiements…")} className="border-0 rounded-none" />}
        {!loading && rows.length === 0 && !err && (
          <p className="p-lg text-label text-text-secondary">{tx("Aucun paiement.")}</p>
        )}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-label" data-mobile-detail="native">
              <thead>
                <tr className="bg-bg-secondary text-left text-text-secondary">
                  <th className="px-4 py-3 font-semibold">{tx("Paiement")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Commande")}</th>
                  {source === 'all' && <th className="px-4 py-3 font-semibold">{tx("Client")}</th>}
                  <th className="px-4 py-3 font-semibold">{tx("Montant")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Statut")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Référence")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const statut = p.statut ?? '';
                  const orderId = p.order?.id ?? p.order_id;
                  return (
                    <tr key={p.id} className="cursor-pointer border-t border-border-default" onClick={() => { setDetail(null); setSelected(p); }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">#{p.id}</p>
                        <p className="text-text-secondary">{p.methode || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{orderId ? `#${orderId}` : '—'}</p>
                        <p className="text-text-secondary">{p.order?.statut ?? ''}</p>
                      </td>
                      {source === 'all' && (
                        <td className="px-4 py-3">
                          {p.client_id ? annuaire[Number(p.client_id)]?.nom ?? `#${p.client_id}` : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-semibold">{fmtFcfa(p.montant)}</p>
                        <p className="text-text-secondary">{p.paid_at ? `${tx("Payé le")} ${dateCourte(p.paid_at)}` : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[statut] ?? 'bg-bg-secondary text-text-secondary'}`}>
                          {tx(STATUT_LABEL[statut] ?? (statut || '—'))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p>{p.fedapay_ref || '—'}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {canDownloadReceipt(p.order) ? (
                            <ReceiptButton
                              payment={p}
                              client={resolveClientForRow(p)}
                              allowSessionFallback={source !== 'all'}
                              testId={`receipt-payment-${p.id}`}
                              stopPropagation
                            />
                          ) : null}
                          {canRepayPayment(p) && orderId && (
                            <button
                              type="button"
                              disabled={repayingOrderId !== null}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRepayer(Number(orderId));
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-container text-white text-micro font-bold hover:bg-primary-hover active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                            >
                              <MIcon
                                name={repayingOrderId === Number(orderId) ? 'sync' : 'payments'}
                                className={`text-[14px] ${repayingOrderId === Number(orderId) ? 'animate-spin' : ''}`}
                              />
                              {tr('Repayer', 'Pay again')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-bg-card rounded-xl shadow-2xl border border-border-default w-full max-w-[620px] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            {/* En-tête */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-container-low shrink-0">
              <div className="flex items-center gap-2">
                <MIcon name="payments" className="text-primary text-xl" />
                <div>
                  <h3 className="font-h2 text-h3 font-bold text-on-surface">
                    {tx("Paiement")} #{selected.id}
                  </h3>
                  <p className="font-secondary text-micro text-text-secondary">
                    {tx("Détail du paiement et de la commande associée")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={tx("Fermer le modal")}
                onClick={() => setSelected(null)}
                className="p-1.5 text-text-secondary hover:text-on-surface hover:bg-black/5 rounded-full transition-colors cursor-pointer"
              >
                <MIcon name="close" className="text-xl" />
              </button>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Bandeau : identifiant, montant, statut */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-default">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-label text-primary bg-primary-light/40 px-2 py-0.5 rounded">
                      #{selected.id}
                    </span>
                    {selected.created_at && (
                      <span className="text-micro text-text-secondary font-medium">
                        {dateCourte(selected.created_at)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-h2 font-bold text-on-surface">{fmtFcfa(selected.montant)}</h4>
                </div>
                <span
                  className={`px-3 py-1 font-bold rounded-full text-micro ${
                    STATUT_CLASS[selected.statut ?? ''] ?? 'bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {tx(STATUT_LABEL[selected.statut ?? ''] ?? (selected.statut || '—'))}
                </span>
              </div>

              {/* Informations de paiement */}
              <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-default space-y-2">
                <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
                  <MIcon name="credit_card" className="text-sm" />
                  {tx("Informations de paiement")}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-label pt-1">
                  <div className="flex items-center gap-2">
                    <MIcon name="payments" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Méthode")} :</span>
                    <span className="font-bold text-on-surface">{selected.methode || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MIcon name="schedule" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Payé le")} :</span>
                    <span className="font-bold text-on-surface">
                      {selected.paid_at ? dateCourte(selected.paid_at) : '—'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MIcon name="receipt_long" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Référence")} :</span>
                    <span className="font-mono break-all font-bold text-on-surface">
                      {selected.fedapay_ref || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MIcon name="person" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Client")} :</span>
                    <span className="font-bold text-on-surface">{nomClientAffiche}</span>
                    {selectedClientInfo?.telephone && (
                      <span className="text-micro text-text-tertiary">{selectedClientInfo.telephone}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Commande associée */}
              <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-default space-y-2">
                <span className="text-micro uppercase tracking-wider text-text-tertiary font-bold flex items-center gap-1">
                  <MIcon name="receipt_long" className="text-sm" />
                  {tx("Commande associée")}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-label pt-1">
                  <div className="flex items-center gap-2">
                    <MIcon name="shopping_bag" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Commande")} :</span>
                    <span className="font-bold text-on-surface">
                      {(selected.order?.id ?? selected.order_id) ? `#${selected.order?.id ?? selected.order_id}` : '—'}
                    </span>
                  </div>
                  {(detail?.statut ?? selected.order?.statut) && (
                    <div className="flex items-center gap-2">
                      <MIcon name="local_shipping" className="text-text-tertiary text-base" />
                      <span className="text-text-secondary">{tx("Statut")} :</span>
                      <span className="font-bold text-on-surface">{detail?.statut ?? selected.order?.statut}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MIcon name="two_wheeler" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Livreur")} :</span>
                    {detailLoading && !detail ? (
                      <span className="text-micro text-text-tertiary">{tx("Chargement…")}</span>
                    ) : (
                      <>
                        <span className="font-bold text-on-surface">
                          {detail?.livreur?.nom_complet || '—'}
                        </span>
                        {detail?.livreur?.telephone && (
                          <span className="text-micro text-text-tertiary">{detail.livreur.telephone}</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MIcon name="location_on" className="text-text-tertiary text-base" />
                    <span className="text-text-secondary">{tx("Adresse de livraison")} :</span>
                    {detailLoading && !detail ? (
                      <span className="text-micro text-text-tertiary">{tx("Chargement…")}</span>
                    ) : (
                      <span className="font-bold text-on-surface">
                        {[detail?.landmark?.nom, detail?.description_lieu].filter(Boolean).join(' — ') || '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de modale */}
            <div className="px-6 py-4 bg-bg-secondary border-t border-border-default flex flex-wrap items-center justify-between gap-3 shrink-0">
              {!detailLoading && canDownloadReceipt(detail ?? selected.order) ? (
                <ReceiptButton
                  payment={selected}
                  order={detail}
                  client={selectedClientInfo}
                  allowSessionFallback={source !== 'all'}
                  variant="button"
                  testId={`receipt-payment-${selected.id}-detail`}
                />
              ) : (
                <span className="text-micro text-text-secondary">
                  {detailLoading
                    ? tx('Chargement…')
                    : tr(
                        'Reçu disponible après assignation du livreur et lancement de la livraison.',
                        'Receipt available once a courier is assigned and delivery starts.',
                      )}
                </span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-label font-medium text-text-secondary hover:bg-border-default/40 rounded-lg transition-colors cursor-pointer"
                >
                  {tx("Fermer")}
                </button>
                {canRepayPayment(selected, detail?.statut ?? undefined) && (selected.order?.id ?? selected.order_id) ? (
                  <button
                    type="button"
                    disabled={repayingOrderId !== null}
                    onClick={() => void handleRepayer(Number(selected.order?.id ?? selected.order_id))}
                    className="px-4 py-2 text-label font-bold text-white bg-primary-container hover:bg-primary-hover rounded-lg transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <MIcon
                      name={repayingOrderId === Number(selected.order?.id ?? selected.order_id) ? 'sync' : 'payments'}
                      className={`text-base ${repayingOrderId === Number(selected.order?.id ?? selected.order_id) ? 'animate-spin' : ''}`}
                    />
                    <span>{tr('Repayer', 'Pay again')}</span>
                  </button>
                ) : null}
                {(selected.order?.id ?? selected.order_id) ? (
                  <button
                    type="button"
                    onClick={() => ouvrirCommande(Number(selected.order?.id ?? selected.order_id))}
                    className={
                      canRepayPayment(selected, detail?.statut ?? undefined)
                        ? 'px-4 py-2 text-label font-semibold text-text-main border border-border-default hover:bg-border-default/40 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer'
                        : 'px-4 py-2 text-label font-bold text-white bg-primary-container hover:bg-primary-hover rounded-lg transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer'
                    }
                  >
                    <MIcon name="open_in_new" className="text-base" />
                    <span>{tx("Voir la commande")}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
