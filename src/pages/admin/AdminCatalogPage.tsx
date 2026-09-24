import { useState } from 'react';
import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows } from '../../services/api/useLiveRows';
import { unwrap, listOf, fmtFcfa } from '../../services/api/unwrap';
import DESIGN_SCRIPT from './_scripts/AdminCatalogPage';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';

const DESIGN_CSS = `
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
        .sidebar-item-active { @apply bg-secondary-container text-on-secondary-container rounded-lg font-bold; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e0c0b1; border-radius: 10px; }
    `;

/**
 * AdminCatalogPage — copie conforme statique du design Stitch (code.html).
 * Interactions : script du design exécuté via useDesignScript (comportement copié).
 */
export default function AdminCatalogPage() {
  useDesignScript(DESIGN_SCRIPT);
  const { rows: produits, err, loading, reload } = useLiveRows(() => adminApi.getProducts(1));
  const [cats, setCats] = useState<any[]>([]);
  const [edition, setEdition] = useState<any | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', prix: '', prix_minimum: '', stock: '', categorie_id: '' });
  useState(() => {
    adminApi.getCategories().then((r: any) => setCats(listOf(unwrap(r)))).catch(() => setCats([]));
    return null;
  });
  const ouvrir = (pr: any) => {
    setEdition(pr ?? {});
    setForm({ nom: pr?.nom ?? '', description: pr?.description ?? '', prix: String(pr?.prix ?? ''), prix_minimum: String(pr?.prix_minimum ?? ''), stock: String(pr?.stock ?? ''), categorie_id: String(pr?.categorie?.id ?? '') });
  };
  const enregistrer = async () => {
    try {
      const payload = { nom: form.nom, description: form.description, prix: Number(form.prix), prix_minimum: Number(form.prix_minimum), stock: Number(form.stock), categorie_id: Number(form.categorie_id) };
      if (edition?.id) await adminApi.updateProduct(edition.id, payload);
      else await adminApi.createProduct(payload);
      setEdition(null); reload();
    } catch (e: any) { window.alert(String(e?.message ?? e)); }
  };
  const supprimer = async (id: number) => {
    try { await adminApi.deleteProduct(id); reload(); } catch (e: any) { window.alert(String(e?.message ?? e)); }
  };

  return (
    <AdminLayout currentPath="/admin/catalogue">
      {err && (
        <div className="m-lg rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
          <p className="font-bold">Erreur API</p>
          <p>{err}</p>
        </div>
      )}
      {loading && <p className="m-lg text-label text-text-secondary">Chargement des données réelles…</p>}
      <div className="m-lg">
        <button type="button" className="btn btn-primary" onClick={() => ouvrir(null)}>+ Nouveau produit (réel)</button>
      </div>
      <style>{DESIGN_CSS}</style>
  <header className="h-16 flex justify-between items-center px-lg bg-white sticky top-0 z-40 border-b border-border-default"> <div className="flex items-center gap-4"> <span className="font-h2 text-h2 font-bold text-primary">Gestion du catalogue</span> </div> <div className="flex items-center gap-6"> <div className="relative hidden lg:block"> <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /> <input className="pl-10 pr-4 py-2 bg-bg-secondary border border-border-default rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-64" placeholder="Rechercher un produit..." type="text" /> </div> <div className="flex items-center gap-4 border-l border-border-default pl-6">  </div> </div> </header>  <div className="p-lg space-y-lg">  <div className="flex flex-col md:flex-row md:items-center justify-between gap-md"> <div className="flex gap-lg border-b border-border-default w-full md:w-auto"> <button className="pb-3 px-2 font-h3 text-h3 text-primary border-b-2 border-primary transition-all">Produits (148)</button> <button className="pb-3 px-2 font-h3 text-h3 text-text-tertiary hover:text-on-surface-variant transition-all">Catégories (8)</button> <button className="pb-3 px-2 font-h3 text-h3 text-text-tertiary hover:text-on-surface-variant transition-all">Packs (12)</button> </div> <button className="flex items-center gap-2 bg-primary-container hover:bg-primary-hover text-white px-md py-2.5 rounded-lg font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95" data-onclick="document.getElementById('editModal').classList.remove('hidden')"> <MIcon name="add" />
                    Nouveau produit
                </button> </div>  <div className="bg-white p-md rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-border-default"> <div className="flex-1 min-w-[200px]"> <div className="relative"> <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm" /> <input className="w-full pl-9 pr-4 py-2 text-label bg-white border border-border-default rounded-lg focus:ring-1 focus:ring-primary outline-none" placeholder="Nom, SKU ou ID..." type="text" /> </div> </div> <select className="px-md py-2 text-label bg-white border border-border-default rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[140px]"> <option>Catégorie: Tout</option> <option>Légumes</option> <option>Viandes &amp; Poissons</option> <option>Épicerie</option> </select> <select className="px-md py-2 text-label bg-white border border-border-default rounded-lg focus:ring-1 focus:ring-primary outline-none"> <option>Disponibilité</option> <option>En stock</option> <option>Rupture</option> </select> <div className="flex border border-border-default rounded-lg overflow-hidden"> <button className="p-2 bg-bg-secondary text-primary"><MIcon name="format_list_bulleted" /></button> <button className="p-2 hover:bg-bg-secondary text-text-tertiary"><MIcon name="grid_view" /></button> </div> </div>  <div className="bg-white rounded-lg shadow-sm border border-border-default overflow-hidden"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-bg-secondary border-b border-border-default"> <th className="py-md px-lg w-10"> <input checked={true} className="rounded border-border-default text-primary focus:ring-primary" type="checkbox" /> </th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">Produit</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">Catégorie</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">Prix</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">Statut</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider text-right">Actions</th> </tr> </thead> <tbody>
                {produits.map((pr: any) => (
                  <tr key={pr.id} className="border-t border-border-default text-label">
                    <td className="px-lg py-3 font-semibold">{pr.nom}</td>
                    <td className="px-lg py-3">{pr.categorie?.nom ?? '—'}</td>
                    <td className="px-lg py-3">{fmtFcfa(pr.prix)}</td>
                    <td className="px-lg py-3">
                      <span className={`rounded-full px-2.5 py-1 text-overline font-semibold ${pr.disponible ? 'bg-success-container text-on-surface' : 'bg-bg-secondary text-text-secondary'}`}>{pr.disponible ? 'Oui' : 'Non'}</span>
                    </td>
                    <td className="px-lg py-3">
                      <div className="flex gap-2">
                        <button type="button" className="font-semibold text-primary hover:underline" onClick={() => ouvrir(pr)}>Modifier</button>
                        <button type="button" className="font-semibold text-error hover:underline" onClick={() => supprimer(pr.id)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody> </table>  <div className="py-md px-lg flex items-center justify-between border-t border-border-default bg-bg-secondary/30"> <span className="text-label text-text-secondary">Affichage de 1 à 8 sur 148 produits</span> <div className="flex items-center gap-2"> <button className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-tertiary hover:bg-bg-secondary"><MIcon name="chevron_left" className="text-sm" /></button> <button className="w-8 h-8 flex items-center justify-center rounded border border-primary bg-primary-tint text-primary font-bold">1</button> <button className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-secondary hover:bg-bg-secondary transition-colors">2</button> <button className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-secondary hover:bg-bg-secondary transition-colors">3</button> <span className="px-1 text-text-tertiary">...</span> <button className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-secondary hover:bg-bg-secondary transition-colors">19</button> <button className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-tertiary hover:bg-bg-secondary"><MIcon name="chevron_right" className="text-sm" /></button> </div> </div> </div> </div>  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 -ml-32 lg:ml-0 bg-[#111827] text-white px-lg py-3 rounded-full shadow-2xl flex items-center gap-6 z-[60] border border-white/10 animate-bounce-subtle" id="batchActions"> <span className="text-label font-bold border-r border-white/20 pr-6">8 sélectionnés</span> <div className="flex items-center gap-4"> <button className="flex items-center gap-2 hover:text-secondary-container transition-colors font-medium"> <MIcon name="block" className="text-[20px]" />
                    Désactiver
                </button> <button className="flex items-center gap-2 hover:text-error transition-colors font-medium"> <MIcon name="delete" className="text-[20px]" />
                    Supprimer
                </button> <button className="flex items-center gap-2 hover:text-primary-light transition-colors font-medium"> <MIcon name="ios_share" className="text-[20px]" />
                    Exporter
                </button> </div> <button className="ml-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"> <MIcon name="close" className="text-[16px]" /> </button> </div>  <div className="fixed inset-0 bg-on-surface/60 backdrop-blur-sm z-[100] flex items-center justify-center px-4 hidden" id="editModal"> <div className="bg-white w-full max-w-[560px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"> <div className="p-lg border-b border-border-default flex justify-between items-center bg-bg-secondary/30"> <h3 className="font-h2 text-h2">Modifier le produit</h3> <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" data-onclick="document.getElementById('editModal').classList.add('hidden')"> <MIcon name="close" /> </button> </div> <div className="p-lg custom-scrollbar max-h-[716px] overflow-y-auto space-y-lg"> <div className="grid grid-cols-2 gap-md"> <div className="col-span-2"> <label className="block text-label mb-2 text-text-secondary">Nom du produit</label> <input className="w-full px-md py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none" type="text" value="Tomates Fraîches" /> </div> <div> <label className="block text-label mb-2 text-text-secondary">Catégorie</label> <select className="w-full px-md py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"> <option>Légumes</option> <option>Fruits</option> <option>Viandes</option> </select> </div> <div> <label className="block text-label mb-2 text-text-secondary">Prix (FCFA)</label> <div className="relative"> <input className="w-full px-md py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none" type="number" value="1500" /> <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary text-xs font-bold">FCFA</span> </div> </div> <div> <label className="block text-label mb-2 text-text-secondary">Stock actuel</label> <input className="w-full px-md py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none" type="number" value="85" /> </div> <div> <label className="block text-label mb-2 text-text-secondary">Unité</label> <input className="w-full px-md py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none" type="text" value="Kilogramme (kg)" /> </div> </div> <div> <label className="block text-label mb-2 text-text-secondary">Description</label> <textarea className="w-full px-md py-2.5 rounded-lg border border-border-default focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none resize-none" rows={3}>Tomates fraîches récoltées localement, idéales pour vos sauces et salades.</textarea> </div> <div> <label className="block text-label mb-2 text-text-secondary">Image du produit</label> <div className="border-2 border-dashed border-outline-variant/50 rounded-lg p-lg text-center bg-bg-secondary hover:bg-bg-secondary/80 transition-colors cursor-pointer group"> <MIcon name="cloud_upload" className="text-primary text-3xl mb-2 group-hover:scale-110 transition-transform" /> <p className="text-body font-medium">Cliquez pour remplacer l'image</p> <p className="text-xs text-text-tertiary mt-1">PNG, JPG ou WEBP (Max. 2Mo)</p> </div> </div> <div className="flex items-center justify-between py-2 px-md bg-primary-tint/50 rounded-lg border border-primary/10"> <div className="flex items-center gap-3"> <MIcon name="check_circle" className="text-primary" /> <div> <p className="text-body font-bold text-on-surface">Disponible à la vente</p> <p className="text-xs text-text-secondary">Afficher ce produit dans le catalogue public</p> </div> </div> <label className="relative inline-flex items-center cursor-pointer"> <input checked={true} className="sr-only peer" type="checkbox" /> <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div> </label> </div> </div> <div className="p-lg border-t border-border-default flex items-center justify-end gap-md bg-white"> <button className="px-md py-2.5 rounded-lg border border-border-default text-on-surface font-medium hover:bg-gray-50 transition-all" data-onclick="document.getElementById('editModal').classList.add('hidden')">Annuler</button> <button className="px-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary-hover text-white font-bold transition-all transform active:scale-95 shadow-lg shadow-primary/20">Enregistrer les modifications</button> </div> </div> </div> 
      {edition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEdition(null)}>
          <div className="w-full max-w-[600px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl" onClick={(e: any) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">{edition.id ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button type="button" onClick={() => setEdition(null)}>Fermer</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-label">
              <div><p className="text-text-secondary">Nom</p><input value={form.nom} onChange={(e: any) => setForm({ ...form, nom: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Description</p><textarea rows={2} value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Prix (FCFA)</p><input value={form.prix} onChange={(e: any) => setForm({ ...form, prix: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Prix minimum (FCFA) — obligatoire</p><input value={form.prix_minimum} onChange={(e: any) => setForm({ ...form, prix_minimum: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Stock</p><input value={form.stock} onChange={(e: any) => setForm({ ...form, stock: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Catégorie — obligatoire</p>
                <select value={form.categorie_id} onChange={(e: any) => setForm({ ...form, categorie_id: e.target.value })} className="w-full rounded-lg border border-border-default bg-white px-3 py-2">
                  <option value="">— Choisir —</option>
                  {cats.map((c: any) => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={() => setEdition(null)}>Annuler</button>
              <button type="button" className="btn btn-primary" onClick={enregistrer}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
