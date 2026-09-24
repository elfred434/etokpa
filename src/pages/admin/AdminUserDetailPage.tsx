import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import { adminApi } from '../../services/api';
import { unwrap, listOf, dateCourte } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminUserDetailPage() {
  const search = useSearch({ strict: false }) as { id?: string | number };
  const id = search.id != null ? Number(search.id) : null;
  const [user, setUser] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    // Pas de GET /admin/users/{id} (apiResource except show) → recherche paginée.
    (async () => {
      try {
        let found: any = null;
        for (let page = 1; page <= 10 && !found; page += 1) {
          const r = await adminApi.getUsers({ page });
          const list = listOf(unwrap(r));
          if (list.length === 0) break;
          found = list.find((u: any) => Number(u.id) === id);
          if (list.length < 10) break;
        }
        if (!alive) return;
        if (found) {
          setUser(found);
        } else {
          setErr(`[HTTP 404] Utilisateur #${id} introuvable sur les 10 premières pages (endpoint GET /admin/users/{id} absent — B-16).`);
        }
      } catch (e) {
        if (alive) setErr(formatApiError(extractApiError(e)));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <AdminLayout currentPath="/admin/utilisateurs">
      <div className="space-y-6">
        <div>
          <h1 className="text-h2 font-h2 font-bold">Fiche utilisateur {id != null ? `#${id}` : ''}</h1>
          <p className="text-text-secondary">Données réelles — GET /admin/users (recherche paginée)</p>
        </div>

        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}
        {loading && <p className="text-label text-text-secondary">Chargement…</p>}

        {user && (
          <div className="max-w-[600px] rounded-lg border border-border-default bg-white p-lg shadow-sm">
            <div className="space-y-3 text-label">
              {[
                ['Nom complet', user.nom_complet ?? `${user.prenom ?? ''} ${user.nom ?? ''}`],
                ['Email', user.email],
                ['Téléphone', user.telephone ?? '—'],
                ['Rôle', typeof user.role === 'object' ? user.role?.nom : user.role],
                ['Statut', user.statut ?? '—'],
                ['Vérifié', user.is_verified ? 'Oui' : 'Non'],
                ['Commandes', user.nombre_commandes ?? user.commandes_count ?? '—'],
                ['Inscrit le', dateCourte(user.created_at)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between border-t border-border-default pt-2 first:border-t-0 first:pt-0">
                  <p className="text-text-secondary">{k}</p>
                  <p className="font-semibold">{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
