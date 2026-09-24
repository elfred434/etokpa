import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { adminApi } from '../../services/api';
import { unwrap, listOf, fmtFcfa, dateCourte, metaOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminValidationsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<any | null>(null);
  const [reponse, setReponse] = useState('');

  const charger = (page = 1) => {
    setLoading(true);
    setErr(null);
    adminApi
      .getProposals({ page })
      .then((r) => {
        setProposals(listOf(unwrap(r)));
        setMeta(metaOf(r));
      })
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const envoyerDecision = async (d: 'accepte' | 'refuse') => {
    if (!decision) return;
    setErr(null);
    setInfo(null);
    try {
      await adminApi.respondProposal(decision.id, { decision: d, admin_response: reponse || undefined });
      setInfo(`Proposition #${decision.id} ${d === 'accepte' ? 'acceptée' : 'refusée'} (PUT delete+recreate côté backend).`);
      setDecision(null);
      setReponse('');
      charger(1);
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  return (
    <AdminLayout currentPath="/admin/validations">
      <div className="space-y-6">
        <div>
          <h1 className="text-h2 font-h2 font-bold">Validation des Budgets</h1>
          <p className="text-text-secondary">Données réelles — GET /admin/budget-proposals · PATCH decision</p>
        </div>

        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}
        {info && <div className="rounded-lg border border-success bg-success-container p-4 text-label">{info}</div>}

        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border-default px-lg py-4">
            <h2 className="text-h3 font-h3 font-bold">Propositions de budget</h2>
            {meta && (
              <p className="text-label text-text-secondary">
                Page {meta.page} — {meta.total} au total
              </p>
            )}
          </div>
          {loading && <p className="p-lg text-label text-text-secondary">Chargement…</p>}
          {!loading && proposals.length === 0 && (
            <p className="p-lg text-label text-text-secondary">Aucune proposition.</p>
          )}
          {!loading && proposals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-label">
                <thead>
                  <tr className="bg-bg-secondary text-left text-text-secondary">
                    <th className="px-lg py-3 font-semibold">#</th>
                    <th className="px-lg py-3 font-semibold">Commande</th>
                    <th className="px-lg py-3 font-semibold">Montant proposé</th>
                    <th className="px-lg py-3 font-semibold">Statut</th>
                    <th className="px-lg py-3 font-semibold">Date</th>
                    <th className="px-lg py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p: any) => (
                    <tr key={p.id} className="border-t border-border-default">
                      <td className="px-lg py-3 font-semibold">#{p.id}</td>
                      <td className="px-lg py-3">{p.order_id ?? p.commande_id ?? '—'}</td>
                      <td className="px-lg py-3 font-semibold">{fmtFcfa(p.montant_propose ?? p.montant ?? p.proposed_price)}</td>
                      <td className="px-lg py-3">
                        <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-overline font-semibold">
                          {p.statut ?? p.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-lg py-3">{dateCourte(p.created_at)}</td>
                      <td className="px-lg py-3">
                        {(p.statut ?? p.status) === 'en_attente' && (
                          <button type="button" className="btn btn-primary px-3 py-1.5 text-label" onClick={() => setDecision(p)}>
                            Décider
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {decision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDecision(null)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">Décision — proposition #{decision.id}</h3>
              <button type="button" onClick={() => setDecision(null)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <label className="text-label text-text-secondary">Réponse admin (optionnelle)</label>
              <textarea
                rows={3}
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-label"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => envoyerDecision('refuse')}>
                Refuser
              </button>
              <button type="button" className="btn btn-primary" onClick={() => envoyerDecision('accepte')}>
                Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
