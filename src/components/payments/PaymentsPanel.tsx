import { useEffect, useState } from 'react';
import MIcon from '../shared/MIcon';
import { paymentsApi } from '../../services/api';
import { dateCourte, fmtFcfa, listOf, unwrap } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';
import { useLanguage } from '../../context/LanguageContext';
import { tx } from '../../i18n/tx';

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
  order?: { id?: number; statut?: string } | null;
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

function receiptHref(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    LOADERS[source]()
      .then((res) => {
        if (!alive) return;
        setRows(listOf(unwrap(res)).map(asPayment).filter((p) => p?.id != null));
      })
      .catch((e) => {
        if (!alive) return;
        setRows([]);
        setErr(formatApiError(extractApiError(e)));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [source]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-h2 font-bold">{title}</h1>
        <p className="text-label text-text-secondary">{rows.length} {tx("Paiements")}</p>
      </div>
      {err && (
        <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container" role="alert">
          <p className="font-bold">{tx("Erreur API")}</p>
          <p>{err}</p>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
        {loading && <p className="p-lg text-label text-text-secondary">{tx("Chargement…")}</p>}
        {!loading && rows.length === 0 && !err && (
          <p className="p-lg text-label text-text-secondary">{tx("Aucun paiement.")}</p>
        )}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-label">
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
                  const receipt = receiptHref(p.recu_url);
                  const orderId = p.order?.id ?? p.order_id;
                  return (
                    <tr key={p.id} className="border-t border-border-default">
                      <td className="px-4 py-3">
                        <p className="font-semibold">#{p.id}</p>
                        <p className="text-text-secondary">{p.methode || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{orderId ? `#${orderId}` : '—'}</p>
                        <p className="text-text-secondary">{p.order?.statut ?? ''}</p>
                      </td>
                      {source === 'all' && <td className="px-4 py-3">{p.client_id ? `#${p.client_id}` : '—'}</td>}
                      <td className="px-4 py-3">
                        <p className="font-semibold">{fmtFcfa(p.montant)}</p>
                        <p className="text-text-secondary">{p.paid_at ? `${tx("Payé le")} ${dateCourte(p.paid_at)}` : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${STATUT_CLASS[statut] ?? 'bg-bg-secondary text-text-secondary'}`}>
                          {tx(STATUT_LABEL[statut] ?? statut || '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p>{p.fedapay_ref || '—'}</p>
                        {receipt && (
                          <a href={receipt} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                            <MIcon name="receipt" className="text-[16px]" />
                            {tx("Reçu")}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
