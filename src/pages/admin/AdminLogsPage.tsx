import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import { adminApi } from '../../services/api';
import { unwrap, listOf, dateCourte, metaOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');

  const charger = (page = 1) => {
    setLoading(true);
    setErr(null);
    adminApi
      .getAuditLogs({ page, action: action || undefined })
      .then((r) => {
        setLogs(listOf(unwrap(r)));
        setMeta(metaOf(r));
      })
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout currentPath="/admin/logs">
      <div className="space-y-6">
        <div>
          <h1 className="text-h2 font-h2 font-bold">Logs & Audit</h1>
          <p className="text-text-secondary">Données réelles — GET /admin/audit-logs</p>
        </div>

        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filtrer par action…"
            className="rounded-lg border border-border-default px-3 py-2 text-label"
          />
          <button type="button" className="btn btn-primary" onClick={() => charger(1)}>
            Appliquer
          </button>
          {meta && (
            <p className="ml-auto text-label text-text-secondary">
              Page {meta.page} — {meta.total} entrées
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          {loading && <p className="p-lg text-label text-text-secondary">Chargement…</p>}
          {!loading && logs.length === 0 && <p className="p-lg text-label text-text-secondary">Aucune entrée d’audit.</p>}
          {!loading && logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-label">
                <thead>
                  <tr className="bg-bg-secondary text-left text-text-secondary">
                    <th className="px-lg py-3 font-semibold">Date</th>
                    <th className="px-lg py-3 font-semibold">Utilisateur</th>
                    <th className="px-lg py-3 font-semibold">Action</th>
                    <th className="px-lg py-3 font-semibold">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id} className="border-t border-border-default">
                      <td className="px-lg py-3">{dateCourte(l.created_at)}</td>
                      <td className="px-lg py-3">
                        {l.user?.nom_complet ?? l.user_id ?? '—'}
                      </td>
                      <td className="px-lg py-3">
                        <span className="rounded-full bg-primary-tint px-2.5 py-1 text-overline font-semibold text-primary">
                          {l.action ?? l.description ?? '—'}
                        </span>
                      </td>
                      <td className="px-lg py-3 text-text-secondary">
                        {l.description ?? l.details ?? l.auditable_type ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
