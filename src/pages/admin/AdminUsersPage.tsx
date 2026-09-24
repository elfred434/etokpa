import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { adminApi } from '../../services/api';
import { unwrap, listOf, dateCourte, metaOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = ['Tous les rôles', 'client', 'livreur', 'manager', 'admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(ROLES[0]);
  const [nouveau, setNouveau] = useState<any | null>(null);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', role: 'client' });

  const charger = (page = 1) => {
    setLoading(true);
    setErr(null);
    adminApi
      .getUsers({ role: role === ROLES[0] ? undefined : role, page })
      .then((r) => {
        setUsers(listOf(unwrap(r)));
        setMeta(metaOf(r));
      })
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const creer = async () => {
    setErr(null);
    setInfo(null);
    try {
      await adminApi.createUser(form);
      setInfo('Utilisateur créé.');
      setNouveau(null);
      charger(1);
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  const supprimer = async (id: number) => {
    setErr(null);
    setInfo(null);
    try {
      await adminApi.deleteUser(id);
      setInfo(`Utilisateur #${id} supprimé.`);
      charger(1);
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  return (
    <AdminLayout currentPath="/admin/utilisateurs">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 font-h2 font-bold">Gestion des Utilisateurs</h1>
            <p className="text-text-secondary">Données réelles — /admin/users (CRUD)</p>
          </div>
          <button
            type="button"
            className="btn btn-primary gap-2"
            onClick={() => {
              setNouveau({});
              setForm({ prenom: '', nom: '', email: '', telephone: '', role: 'client' });
            }}
          >
            <MIcon name="person_add" className="text-[18px]" />
            Nouvel utilisateur
          </button>
        </div>

        {err && (
          <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
            <p className="font-bold">Erreur API</p>
            <p>{err}</p>
          </div>
        )}
        {info && <div className="rounded-lg border border-success bg-success-container p-4 text-label">{info}</div>}

        <div className="flex flex-wrap items-center gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full border px-3 py-1.5 text-label font-semibold transition ${
                role === r
                  ? 'border-primary bg-primary text-white'
                  : 'border-border-default bg-white text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              {r}
            </button>
          ))}
          {meta && <p className="ml-auto text-label text-text-secondary">{meta.total} utilisateurs</p>}
        </div>

        <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
          {loading && <p className="p-lg text-label text-text-secondary">Chargement…</p>}
          {!loading && users.length === 0 && <p className="p-lg text-label text-text-secondary">Aucun utilisateur.</p>}
          {!loading && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-label">
                <thead>
                  <tr className="bg-bg-secondary text-left text-text-secondary">
                    <th className="px-lg py-3 font-semibold">Nom</th>
                    <th className="px-lg py-3 font-semibold">Email</th>
                    <th className="px-lg py-3 font-semibold">Téléphone</th>
                    <th className="px-lg py-3 font-semibold">Rôle</th>
                    <th className="px-lg py-3 font-semibold">Statut</th>
                    <th className="px-lg py-3 font-semibold">Inscrit</th>
                    <th className="px-lg py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-t border-border-default">
                      <td className="px-lg py-3 font-semibold">{u.nom_complet ?? `${u.prenom ?? ''} ${u.nom ?? ''}`}</td>
                      <td className="px-lg py-3">{u.email}</td>
                      <td className="px-lg py-3">{u.telephone ?? '—'}</td>
                      <td className="px-lg py-3">
                        <span className="rounded-full bg-primary-tint px-2.5 py-1 text-overline font-semibold text-primary">
                          {typeof u.role === 'object' ? u.role?.nom : u.role}
                        </span>
                      </td>
                      <td className="px-lg py-3">{u.statut ?? '—'}</td>
                      <td className="px-lg py-3">{dateCourte(u.created_at)}</td>
                      <td className="px-lg py-3">
                        <div className="flex gap-2">
                          <Link
                            to="/admin/utilisateurs/detail"
                            search={{ id: u.id }}
                            className="font-semibold text-primary hover:underline"
                          >
                            Détails
                          </Link>
                          <button type="button" className="font-semibold text-error hover:underline" onClick={() => supprimer(u.id)}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {nouveau && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNouveau(null)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">Nouvel utilisateur</h3>
              <button type="button" onClick={() => setNouveau(null)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {[
                { k: 'prenom' as const, label: 'Prénom' },
                { k: 'nom' as const, label: 'Nom' },
                { k: 'email' as const, label: 'Email' },
                { k: 'telephone' as const, label: 'Téléphone (+229…)' },
              ].map((f) => (
                <div key={f.k} className="space-y-1">
                  <label className="text-label text-text-secondary">{f.label}</label>
                  <input
                    type="text"
                    value={form[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className="w-full rounded-lg border border-border-default px-3 py-2 text-label"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-label text-text-secondary">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-label"
                >
                  {ROLES.slice(1).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setNouveau(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={creer}>
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
