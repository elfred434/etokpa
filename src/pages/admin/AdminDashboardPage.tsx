import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { adminApi } from '../../services/api';
import { unwrap, fmtFcfa } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminDashboardPage() {
  const [dash, setDash] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminApi
      .getDashboard()
      .then((r) => alive && setDash(unwrap(r)))
      .catch((e) => alive && setErr(formatApiError(extractApiError(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const kpis = [
    { icon: 'payments', label: 'GMV (volume total)', value: dash?.gmv ?? dash?.volume_total ?? dash?.ca_total ?? '—' },
    { icon: 'shopping_cart', label: 'Commandes', value: dash?.commandes ?? dash?.total_commandes ?? '—' },
    { icon: 'group', label: 'Nouveaux utilisateurs', value: dash?.nouveaux_utilisateurs ?? dash?.utilisateurs ?? '—' },
    { icon: 'task_alt', label: 'Taux de livraison', value: dash?.taux_livraison ?? dash?.taux_succes ?? '—' },
  ];

  return (
    <AdminLayout currentPath="/admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-h2 font-h2 font-bold">Tableau de bord global</h1>
          <p className="text-text-secondary">Données réelles — GET /admin/dashboard</p>
        </div>

        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}
        {loading && <p className="text-label text-text-secondary">Chargement…</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
              <div className="flex items-center gap-2">
                <MIcon name={k.icon} className="text-primary text-[20px]" />
                <p className="text-label text-text-secondary">{k.label}</p>
              </div>
              <p className="mt-2 text-h1 font-h1 font-bold">
                {typeof k.value === 'number' ? fmtFcfa(k.value) : k.value}
              </p>
            </div>
          ))}
        </div>

        {dash != null && (
          <div className="rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <h2 className="text-h3 font-h3 font-bold">Réponse brute (phase dev)</h2>
            <p className="text-label text-text-secondary">Mapping exact des KPI à caler sur la vraie payload.</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-bg-app p-3 text-micro">{JSON.stringify(dash, null, 2)}</pre>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
