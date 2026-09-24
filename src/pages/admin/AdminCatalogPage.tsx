import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { adminApi } from '../../services/api';
import { unwrap, listOf, fmtFcfa, metaOf } from '../../services/api/unwrap';
import { extractApiError, formatApiError } from '../../utils/apiError';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminCatalogPage() {
  const [produits, setProduits] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState<any | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', prix: '', stock: '' });

  const charger = (page = 1) => {
    setLoading(true);
    setErr(null);
    adminApi
      .getProducts(page)
      .then((r) => {
        setProduits(listOf(unwrap(r)));
        setMeta(metaOf(r));
      })
      .catch((e) => setErr(formatApiError(extractApiError(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ouvrirEdition = (p: any | null) => {
    setEdition(p ?? {});
    setForm({
      nom: p?.nom ?? '',
      description: p?.description ?? '',
      prix: p?.prix != null ? String(p.prix) : '',
      stock: p?.stock != null ? String(p.stock) : '',
    });
  };

  const enregistrer = async () => {
    setErr(null);
    setInfo(null);
    const payload = {
      nom: form.nom,
      description: form.description,
      prix: Number(form.prix),
      stock: Number(form.stock),
    };
    try {
      if (edition?.id) {
        await adminApi.updateProduct(edition.id, payload);
        setInfo(`Produit #${edition.id} mis à jour.`);
      } else {
        await adminApi.createProduct(payload);
        setInfo('Produit créé.');
      }
      setEdition(null);
      charger(1);
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  const supprimer = async (id: number) => {
    setErr(null);
    setInfo(null);
    try {
      await adminApi.deleteProduct(id);
      setInfo(`Produit #${id} supprimé.`);
      charger(1);
    } catch (e) {
      setErr(formatApiError(extractApiError(e)));
    }
  };

  return (
    <AdminLayout currentPath="/admin/catalogue">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 font-h2 font-bold">Gestion du Catalogue</h1>
            <p className="text-text-secondary">Données réelles — /admin/products (CRUD)</p>
          </div>
          <button type="button" className="btn btn-primary gap-2" onClick={() => ouvrirEdition(null)}>
            <MIcon name="add" className="text-[18px]" />
            Nouveau produit
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
          <div className="flex items-center justify-between border-b border-border-default px-lg py-4">
            <h2 className="text-h3 font-h3 font-bold">Produits</h2>
            {meta && (
              <p className="text-label text-text-secondary">
                {meta.total} produits
              </p>
            )}
          </div>
          {loading && <p className="p-lg text-label text-text-secondary">Chargement…</p>}
          {!loading && produits.length === 0 && <p className="p-lg text-label text-text-secondary">Aucun produit.</p>}
          {!loading && produits.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-label">
                <thead>
                  <tr className="bg-bg-secondary text-left text-text-secondary">
                    <th className="px-lg py-3 font-semibold">Nom</th>
                    <th className="px-lg py-3 font-semibold">Catégorie</th>
                    <th className="px-lg py-3 font-semibold">Prix</th>
                    <th className="px-lg py-3 font-semibold">Stock</th>
                    <th className="px-lg py-3 font-semibold">Disponible</th>
                    <th className="px-lg py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((p: any) => (
                    <tr key={p.id} className="border-t border-border-default">
                      <td className="px-lg py-3 font-semibold">{p.nom}</td>
                      <td className="px-lg py-3">{p.categorie?.nom ?? '—'}</td>
                      <td className="px-lg py-3">{fmtFcfa(p.prix)}</td>
                      <td className="px-lg py-3">{p.stock ?? '—'}</td>
                      <td className="px-lg py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-overline font-semibold ${
                            p.disponible ? 'bg-success-container text-on-surface' : 'bg-bg-secondary text-text-secondary'
                          }`}
                        >
                          {p.disponible ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-lg py-3">
                        <div className="flex gap-2">
                          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => ouvrirEdition(p)}>
                            Modifier
                          </button>
                          <button type="button" className="font-semibold text-error hover:underline" onClick={() => supprimer(p.id)}>
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

      {edition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEdition(null)}>
          <div
            className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">{edition.id ? `Modifier — ${edition.nom}` : 'Nouveau produit'}</h3>
              <button type="button" onClick={() => setEdition(null)} className="p-1 text-text-secondary hover:text-on-surface">
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {[
                { k: 'nom' as const, label: 'Nom' },
                { k: 'description' as const, label: 'Description' },
                { k: 'prix' as const, label: 'Prix (FCFA)' },
                { k: 'stock' as const, label: 'Stock' },
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
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setEdition(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={enregistrer}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
