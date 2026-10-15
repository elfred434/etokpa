import { useEffect, useState, type ReactNode } from 'react';
import Pagination from '../shared/Pagination';
import { ModalShell, BandeauFiche, FicheCard, LigneFiche, BoutonFermer } from '../shared/ModalShell';
import { adminApi, catalogApi, managerApi } from '../../services/api';
import { dateCourte, fmtFcfa, listOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { lookupProductName } from '../../utils/lookupProductName';
import { orderLineGivenName, orderLineName, orderLineProductId } from '../../utils/orderLine';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

/* eslint-disable @typescript-eslint/no-explicit-any */

const FILTRES = [
  { label: 'Toutes', statut: '' },
  { label: 'En attente', statut: 'en_attente' },
  { label: 'En préparation', statut: 'en_preparation' },
  { label: 'En livraison', statut: 'en_livraison' },
  { label: 'Livrées', statut: 'livre' },
  { label: 'Annulées', statut: 'annule' },
];

const LIBELLE_STATUT: Record<string, string> = Object.fromEntries(
  FILTRES.filter((f) => f.statut).map((f) => [f.statut, f.label]),
);

const STATUT_CLASS: Record<string, string> = {
  en_attente: 'bg-bg-secondary text-text-secondary',
  en_preparation: 'bg-primary-tint text-primary',
  en_livraison: 'bg-tertiary-container/20 text-tertiary',
  livre: 'bg-success-container text-on-surface',
  annule: 'bg-error-container text-on-error-container',
};

export type PlatformOrder = {
  id: number;
  statut?: string;
  montant_total?: number;
  frais_livraison?: number;
  description_lieu?: string;
  created_at?: string;
  items?: Array<{ id?: number; nom?: string | null; product_id?: number | null; quantite?: number; prix_unitaire?: number }>;
  landmark?: { id?: number; nom?: string; zone_id?: number } | null;
  livreur?: { id?: number; nom_complet?: string; telephone?: string } | null;
  client?: { nom_complet?: string; telephone?: string } | null;
  user?: { nom_complet?: string; telephone?: string } | null;
};

function asOrder(row: any): PlatformOrder {
  const inner = row?.data && typeof row.data === 'object' && 'id' in row.data ? row.data : row;
  return inner as PlatformOrder;
}

type Props = {
  source: 'admin' | 'zone';
  title: string;
  hint?: string;
  reloadKey?: number;
  renderActions?: (order: PlatformOrder) => ReactNode;
};

/** Liste paginée des commandes. `admin` = toute la plateforme. `zone` = ce que GET /manager/orders renvoie. */
export default function PlatformOrdersPanel({ source, title, hint, reloadKey = 0, renderActions }: Props) {
  useLanguage();
  const [statut, setStatut] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [zones, setZones] = useState<Array<{ id: number; nom: string }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlatformOrder | null>(null);

  useEffect(() => {
    if (!selected?.items?.length) return;
    const orderId = selected.id;
    const missing = [...new Set(
      selected.items
        .filter((it) => !orderLineGivenName(it))
        .map((it) => orderLineProductId(it))
        .filter((id): id is number => id != null),
    )];
    if (missing.length === 0) return;
    let alive = true;
    void Promise.all(missing.map(async (id) => [id, await lookupProductName(id)] as const)).then((rows) => {
      if (!alive) return;
      const found = new Map(rows.filter((row): row is readonly [number, string] => row[1].length > 0));
      if (found.size === 0) return;
      setSelected((cur) => {
        if (!cur || cur.id !== orderId || !cur.items) return cur;
        let changed = false;
        const items = cur.items.map((it) => {
          if (orderLineGivenName(it)) return it;
          const id = orderLineProductId(it);
          const nom = id != null ? found.get(id) : undefined;
          if (!nom) return it;
          changed = true;
          return { ...it, nom };
        });
        return changed ? { ...cur, items } : cur;
      });
    });
    return () => { alive = false; };
  }, [selected]);

  useEffect(() => {
    catalogApi.getZones()
      .then((res) => setZones(listOf(res).map((z: any) => ({ id: Number(z.id), nom: String(z.nom ?? '') }))))
      .catch(() => setZones([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statut, zoneId, source]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    const params = {
      page,
      ...(statut ? { statut } : {}),
      ...(source === 'admin' && zoneId ? { zone_id: Number(zoneId) } : {}),
    };
    const call = source === 'admin' ? adminApi.getOrders(params) : managerApi.getOrders(params);
    call
      .then((res) => {
        if (!alive) return;
        setOrders(listOf(res).map(asOrder));
        setLastPage(Number(res?.meta?.last_page ?? res?.last_page ?? 1));
        setTotal(Number(res?.meta?.total ?? res?.total ?? 0));
      })
      .catch((e) => {
        if (!alive) return;
        setOrders([]);
        setErr(formatApiError(extractApiError(e)));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [source, statut, zoneId, page, reloadKey]);

  const zoneNom = (id?: number) => zones.find((z) => z.id === Number(id))?.nom ?? (id ? `#${id}` : '—');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-h2 font-bold">{title}</h1>
        {hint && <p className="text-text-secondary">{hint}</p>}
        <p className="text-label text-text-secondary">{total} {tx("commandes")}</p>
      </div>

      {err && (
        <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container" role="alert">
          <p className="font-bold">{tx("Erreur API")}</p>
          <p>{err}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.statut || 'toutes'}
            type="button"
            onClick={() => setStatut(f.statut)}
            className={`rounded-full border px-3 py-1.5 text-label font-semibold transition ${
              statut === f.statut
                ? 'border-primary bg-primary text-white'
                : 'border-border-default bg-bg-card text-text-secondary hover:border-primary hover:text-primary'
            }`}
          >
            {tx(f.label)}
          </button>
        ))}
        {source === 'admin' && (
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="rounded-lg border border-border-default bg-bg-card px-3 py-2 text-label"
          >
            <option value="">{tx("Toutes les zones")}</option>
            {zones.map((z) => (
              <option key={z.id} value={String(z.id)}>{z.nom}</option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-sm">
        {loading && <p className="p-lg text-label text-text-secondary">{tx("Chargement…")}</p>}
        {!loading && orders.length === 0 && (
          <p className="p-lg text-label text-text-secondary">{tx("Aucune commande.")}</p>
        )}
        {!loading && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-label" data-mobile-detail="native">
              <thead>
                <tr className="bg-bg-secondary text-left text-text-secondary">
                  <th className="px-4 py-3 font-semibold">{tx("Commande")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Client")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Zone")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Livreur")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Montant")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Statut")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const client = o.client ?? o.user;
                  return (
                    <tr key={o.id} className="cursor-pointer border-t border-border-default" onClick={() => setSelected(o)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">#{o.id}</p>
                        <p className="text-text-secondary">{dateCourte(o.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{client?.nom_complet ?? '—'}</p>
                        <p className="text-text-secondary">{client?.telephone ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{zoneNom(o.landmark?.zone_id)}</p>
                        <p className="text-text-secondary">{o.landmark?.nom ?? o.description_lieu ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">{o.livreur?.nom_complet ?? tx("— Non affecté —")}</td>
                      <td className="px-4 py-3 font-semibold">{fmtFcfa(o.montant_total)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[o.statut ?? ''] ?? 'bg-bg-secondary text-text-secondary'}`}>
                          {o.statut ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                          <button type="button" className="text-primary font-bold" onClick={() => setSelected(o)}>
                            {tx("Détail")}
                          </button>
                          {renderActions?.(o)}
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

      {lastPage > 1 && <Pagination page={page} pageCount={lastPage} onChange={setPage} />}

      {selected && (
        <ModalShell
          testId={`order-modal-${selected.id}`}
          icone="receipt_long"
          titre={`${tx("Commande")} #${selected.id}`}
          sousTitre={`${tx("Détail de la commande")}${selected.created_at ? ` · ${dateCourte(selected.created_at)}` : ''}`}
          maxWidth={620}
          onFermer={() => setSelected(null)}
          pied={
            <>
              {renderActions ? <div className="flex items-center gap-2">{renderActions(selected)}</div> : <span />}
              <div className="flex items-center gap-2">
                <BoutonFermer onClick={() => setSelected(null)} />
              </div>
            </>
          }
        >
          {/* Bandeau : identifiant, date, montant, statut */}
          <BandeauFiche
            id={selected.id}
            date={selected.created_at ? dateCourte(selected.created_at) : undefined}
            montant={fmtFcfa(selected.montant_total)}
            statut={
              <span
                className={`px-3 py-1 font-bold rounded-full text-micro whitespace-nowrap ${
                  STATUT_CLASS[selected.statut ?? ''] ?? 'bg-bg-secondary text-text-secondary'
                }`}
              >
                {tx(LIBELLE_STATUT[selected.statut ?? ''] ?? (selected.statut || '—'))}
              </span>
            }
          />

          {/* Client */}
          <FicheCard icone="person" titre={tx("Client")}>
            <LigneFiche icone="badge" etiquette={tx("Nom")}>
              {(selected.client ?? selected.user)?.nom_complet ?? '—'}
            </LigneFiche>
            <LigneFiche icone="call" etiquette={tx("Téléphone")}>
              {(selected.client ?? selected.user)?.telephone ?? '—'}
            </LigneFiche>
          </FicheCard>

          {/* Livraison */}
          <FicheCard icone="local_shipping" titre={tx("Livraison")}>
            <LigneFiche icone="location_on" etiquette={tx("Point de repère")} large>
              {selected.landmark?.nom ?? selected.description_lieu ?? '—'}
            </LigneFiche>
            {selected.description_lieu && selected.landmark?.nom ? (
              <LigneFiche icone="notes" etiquette={tx("Précisions")} large>
                {selected.description_lieu}
              </LigneFiche>
            ) : null}
            <LigneFiche icone="map" etiquette={tx("Zone")}>
              {zoneNom(selected.landmark?.zone_id)}
            </LigneFiche>
            <LigneFiche icone="payments" etiquette={tx("Frais de livraison")}>
              {fmtFcfa(selected.frais_livraison)}
            </LigneFiche>
            <LigneFiche icone="two_wheeler" etiquette={tx("Livreur")} large>
              {selected.livreur?.nom_complet ?? tx("— Non affecté —")}
              {selected.livreur?.telephone && (
                <span className="ml-2 font-normal text-micro text-text-tertiary">{selected.livreur.telephone}</span>
              )}
            </LigneFiche>
          </FicheCard>

          {/* Articles */}
          <FicheCard icone="shopping_bag" titre={tx("Articles")} colonnes={1}>
            {Array.isArray(selected.items) && selected.items.length > 0 ? (
              <>
                {selected.items.map((it) => (
                  <div
                    key={it.id ?? `${it.nom}-${it.quantite}`}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="min-w-0 break-words text-on-surface">
                      {tx(orderLineName(it))}
                      <span className="ml-2 text-micro text-text-secondary">
                        {Number(it.quantite ?? 1)} × {fmtFcfa(it.prix_unitaire)}
                      </span>
                    </span>
                    <span className="font-bold text-on-surface">{fmtFcfa((it.prix_unitaire ?? 0) * (it.quantite ?? 1))}</span>
                  </div>
                ))}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 font-bold text-on-surface">
                  <span>{tx("Total")}</span>
                  <span>{fmtFcfa(selected.montant_total)}</span>
                </div>
              </>
            ) : (
              <span className="text-text-tertiary">{tx("Aucun article rattaché à cette commande.")}</span>
            )}
          </FicheCard>
        </ModalShell>
      )}
    </div>
  );
}
