import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import { adminApi } from '../../services/api';
import { unwrap, listOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<any | null>(null);
  const [form, setForm] = useState({ nom: '', description: '' });

  const charger = () => {
    setLoading(true);
    setErr(null);
    adminApi
      .getCategories()
      .then((r) => setCats(listOf(unwrap(r))))
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cliquerLigne = (c: any) => {
    setSelection(c);
    setForm({ nom: c.nom ?? '', description: c.description ?? '' });
  };

  const enregistrer = async () => {
    setErr(null);
    setInfo(null);
    try {
      if (selection?.id) {
        await adminApi.updateCategory(selection.id, form);
        setInfo(`Catégorie « ${form.nom} » mise à jour.`);
      } else {
        await adminApi.createCategory(form);
        setInfo(`Catégorie « ${form.nom} » créée.`);
      }
      setSelection(null);
      setForm({ nom: '', description: '' });
      charger();
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  const supprimer = async () => {
    if (!selection?.id) return;
    setErr(null);
    setInfo(null);
    try {
      await adminApi.deleteCategory(selection.id);
      setInfo(`Catégorie #${selection.id} supprimée.`);
      setSelection(null);
      charger();
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  return (
    <AdminLayout currentPath="/admin/categories" mainClassName="ml-64 h-screen pt-[52px] flex overflow-hidden">
      <section className="flex-1 overflow-y-auto p-lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-h2 font-h2 font-bold">Gestion des Catégories</h1>
              <p className="text-text-secondary">Données réelles — /admin/categories (CRUD) · Cliquez une ligne pour l’éditer</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelection({});
                setForm({ nom: '', description: '' });
              }}
            >
              Nouvelle catégorie
            </button>
          </div>

          {err && (
            <div className="rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
              <p className="font-bold">Erreur API</p>
              <p>{err}</p>
            </div>
          )}
          {info && <div className="rounded-lg border border-success bg-success-container p-4 text-label">{info}</div>}

          <div className="overflow-hidden rounded-lg border border-border-default bg-white shadow-sm">
            {loading && <p className="p-lg text-label text-text-secondary">Chargement…</p>}
            {!loading && cats.length === 0 && <p className="p-lg text-label text-text-secondary">Aucune catégorie.</p>}
            {!loading && cats.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-label">
                  <thead>
                    <tr className="bg-bg-secondary text-left text-text-secondary">
                      <th className="px-lg py-3 font-semibold">Catégorie</th>
                      <th className="px-lg py-3 font-semibold">Slug</th>
                      <th className="px-lg py-3 font-semibold">Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map((c: any) => (
                      <tr
                        key={c.id}
                        onClick={() => cliquerLigne(c)}
                        className={`cursor-pointer border-t border-border-default hover:bg-primary-tint/50 ${
                          selection?.id === c.id ? 'bg-primary-tint' : ''
                        }`}
                      >
                        <td className="px-lg py-3 font-semibold">{c.nom}</td>
                        <td className="px-lg py-3 text-text-secondary">{c.slug ?? ''}</td>
                        <td className="px-lg py-3">{c.parent?.nom ?? c.parent_id ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="w-96 overflow-y-auto border-l border-border-default bg-white p-lg">
        <h3 className="text-h2 font-h2 font-bold">{selection?.id ? 'Éditer Catégorie' : 'Nouvelle Catégorie'}</h3>
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-label text-text-secondary">Nom de la catégorie</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-label"
            />
          </div>
          <div className="space-y-1">
            <label className="text-label text-text-secondary">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-label"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-primary flex-1" onClick={enregistrer}>
              Enregistrer
            </button>
            {selection?.id && (
              <button type="button" className="btn btn-ghost text-error" onClick={supprimer}>
                Supprimer
              </button>
            )}
          </div>
        </div>
      </aside>
    </AdminLayout>
  );
}
