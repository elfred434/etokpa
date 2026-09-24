import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import { adminApi } from '../../services/api';
import { unwrap, listOf, dateCourte } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminLivreursPage() {
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<any | null>(null);

  useEffect(() => {
    let alive = true;
    adminApi
      .getUsers({ role: 'livreur' })
      .then((r) => alive && setLivreurs(listOf(unwrap(r))))
      .catch((e) => alive && setErr(formatApiError(extractApiError(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AdminLayout currentPath="/admin/livreurs" mainClassName="ml-64 h-screen pt-[52px] p-lg flex gap-lg overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
        <div className="border-b border-border-default px-lg py-4">
          <h1 className="text-h2 font-h2 font-bold">Gestion des Livreurs</h1>
          <p className="text-label text-text-secondary">
            Données réelles — GET /admin/users?role=livreur · Cliquez une ligne pour les détails
          </p>
        </div>
        {err && (
          <div className="m-lg rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-lg text-label text-text-secondary">Chargement…</p>}
          {!loading && livreurs.length === 0 && <p className="p-lg text-label text-text-secondary">Aucun livreur.</p>}
          {!loading && livreurs.length > 0 && (
            <table className="w-full text-label">
              <thead>
                <tr className="bg-bg-secondary text-left text-text-secondary">
                  <th className="px-lg py-3 font-semibold">Nom</th>
                  <th className="px-lg py-3 font-semibold">Téléphone</th>
                  <th className="px-lg py-3 font-semibold">Statut</th>
                  <th className="px-lg py-3 font-semibold">Inscrit</th>
                </tr>
              </thead>
              <tbody>
                {livreurs.map((l: any) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelection(l)}
                    className={`cursor-pointer border-t border-border-default hover:bg-primary-tint/50 ${
                      selection?.id === l.id ? 'bg-primary-tint' : ''
                    }`}
                  >
                    <td className="px-lg py-3 font-semibold">{l.nom_complet ?? `${l.prenom ?? ''} ${l.nom ?? ''}`}</td>
                    <td className="px-lg py-3">{l.telephone ?? '—'}</td>
                    <td className="px-lg py-3">{l.statut ?? '—'}</td>
                    <td className="px-lg py-3">{dateCourte(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <aside className="w-80 shrink-0 overflow-y-auto rounded-lg border border-border-default bg-white p-lg">
        <h3 className="text-h2 font-h2 font-bold text-primary">Détails du Livreur</h3>
        {!selection && <p className="mt-4 text-label text-text-secondary">Sélectionnez une ligne du tableau.</p>}
        {selection && (
          <div className="mt-4 space-y-3 text-label">
            <div>
              <p className="text-text-secondary">Nom complet</p>
              <p className="font-semibold">{selection.nom_complet ?? `${selection.prenom ?? ''} ${selection.nom ?? ''}`}</p>
            </div>
            <div>
              <p className="text-text-secondary">ID</p>
              <p className="font-semibold">ID: {selection.id}</p>
            </div>
            <div>
              <p className="text-text-secondary">Email</p>
              <p className="font-semibold">{selection.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Téléphone</p>
              <p className="font-semibold">{selection.telephone ?? '—'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Statut</p>
              <p className="font-semibold">{selection.statut ?? '—'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Inscrit le</p>
              <p className="font-semibold">{dateCourte(selection.created_at)}</p>
            </div>
            {selection.telephone && (
              <a
                href={`tel:${String(selection.telephone).replace(/\s/g, '')}`}
                className="mt-2 block rounded-lg bg-primary-tint px-3 py-2 text-center font-semibold text-primary"
              >
                Appeler
              </a>
            )}
          </div>
        )}
      </aside>
    </AdminLayout>
  );
}
