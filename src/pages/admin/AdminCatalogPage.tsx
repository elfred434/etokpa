import { useRef, useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useDesignScript } from '../../utils/designRuntime';
import { adminApi } from '../../services/api';
import { useLiveRows } from '../../services/api/useLiveRows';
import { unwrap, listOf, fmtFcfa } from '../../services/api/unwrap';
import { absImageUrl } from '../../utils/imageUrl';
import { fichierEnWebp, ImageWebpError } from '../../utils/toWebp';
import { extractApiError, formatApiError, messageRefusSuppression } from '../../utils/apiError';
import DESIGN_SCRIPT from './_scripts/AdminCatalogPage';
import AdminLayout from '../../components/layout/admin/AdminLayout';
import MIcon from '../../components/shared/MIcon';
import { useLanguage } from '../../context/LanguageContext';
import { tr, tx } from '../../i18n/tx';


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
const PER_PAGE = 8;

export default function AdminCatalogPage() {
  useLanguage();
  useDesignScript(DESIGN_SCRIPT);
  // Tous les produits (100 par page, au plus 10 pages) : filtres et pagination portent sur le catalogue entier
  const { rows: produits, err, loading, reload } = useLiveRows(async () => {
    const acc: any[] = [];
    for (let page = 1; page <= 10; page++) {
      const res: any = await adminApi.getProducts({ per_page: 100, page });
      acc.push(...listOf(res));
      if (page >= Number(res?.meta?.last_page ?? 1)) break;
    }
    return { data: acc };
  });
  const [cats, setCats] = useState<any[]>([]);
  const [tab, setTab] = useState<'produits' | 'categories'>('produits');
  const [q, setQ] = useState('');
  const [catF, setCatF] = useState('');
  const [dispoF, setDispoF] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [tab, q, catF, dispoF]); // nouveau filtre → première page
  const [edition, setEdition] = useState<any | null>(null);
  const [detail, setDetail] = useState<{ kind: 'produit' | 'categorie'; item: any } | null>(null);
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);
  const [form, setForm] = useState({ nom: '', description: '', prix: '', prix_minimum: '', stock: '', categorie_id: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const revokeObjectUrl = () => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
  };
  const alerteImage = (e: unknown) => {
    const code = e instanceof ImageWebpError ? e.code : 'webp';
    const msg = code === 'format'
      ? tx("Format non pris en charge : PNG, JPG ou WEBP uniquement.")
      : code === 'taille'
        ? tx("Image trop lourde : maximum 4 Mo.")
        : code === 'lourde' || code === 'lecture'
          ? tx("Image trop lourde pour être lue dans le navigateur.")
          : tx("Impossible de convertir cette image en WebP.");
    window.alert(msg);
  };
  const pickImage = async (f?: File | null) => {
    if (!f) return;
    setImageBusy(true);
    try {
      const webp = await fichierEnWebp(f);
      revokeObjectUrl();
      objectUrlRef.current = URL.createObjectURL(webp);
      setImageFile(webp);
      setImagePreview(objectUrlRef.current);
    } catch (e) {
      alerteImage(e);
    } finally {
      setImageBusy(false);
    }
  };
  const clearImage = () => {
    revokeObjectUrl();
    setImageFile(null);
    setImagePreview(absImageUrl(edition?.image_url ?? edition?.img_url));
  };
  const loadCats = () => adminApi.getCategories().then((r: any) => setCats(listOf(unwrap(r)))).catch(() => setCats([]));
  useState(() => {
    loadCats();
    return null;
  });
  const ouvrir = (pr: any) => {
    revokeObjectUrl();
    setEdition(pr ?? {});
    setImageFile(null);
    setImagePreview(absImageUrl(pr?.image_url ?? pr?.img_url));
    setForm({ nom: pr?.nom ?? '', description: pr?.description ?? '', prix: String(pr?.prix ?? ''), prix_minimum: String(pr?.prix_minimum ?? ''), stock: String(pr?.stock ?? ''), categorie_id: String(pr?.categorie?.id ?? '') });
  };
  const fermer = () => { revokeObjectUrl(); setImageFile(null); setEdition(null); };
  const enregistrer = async () => {
    try {
      const champs = { nom: form.nom, description: form.description, prix: Number(form.prix), prix_minimum: Number(form.prix_minimum), stock: Number(form.stock), categorie_id: Number(form.categorie_id) };
      if (imageFile) {
        // Multipart uniquement si fichier : champs en string (validations Laravel OK) + image.
        const fd = new FormData();
        Object.entries(champs).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('image', imageFile);
        if (edition?.id) await adminApi.updateProduct(edition.id, fd);
        else await adminApi.createProduct(fd);
      } else if (edition?.id) await adminApi.updateProduct(edition.id, champs);
      else await adminApi.createProduct(champs);
      fermer(); reload();
    } catch (e: any) { window.alert(formatApiError(extractApiError(e))); }
  };
  const modifierDepuisDetail = () => {
    if (!detail) return;
    const { kind, item } = detail;
    setDetail(null);
    if (kind === 'produit') ouvrir(item);
  };
  const supprimer = async (id: number) => {
    try { await adminApi.deleteProduct(id); reload(); } catch (e: any) { window.alert(formatApiError(extractApiError(e))); }
  };
  const supprimerCat = async (c: any) => {
    if (!window.confirm(tr(`Supprimer la catégorie « ${c.nom} » ?`, `Delete category “${c.nom}”?`))) return;
    try { await adminApi.deleteCategory(c.id); loadCats(); reload(); } catch (e: any) { window.alert(messageRefusSuppression(e, 'categorie')); }
  };
  const qMin = q.trim().toLowerCase();
  const produitsF = produits.filter((p: any) => {
    const hit = !qMin || String(p.nom ?? '').toLowerCase().includes(qMin) || String(p.id).includes(qMin);
    const cok = !catF || String(p.categorie?.id ?? p.categorie_id ?? '') === catF;
    const dispo = p.disponible !== false && Number(p.stock) > 0;
    const dok = !dispoF || (dispoF === 'stock' ? dispo : !dispo);
    return hit && cok && dok;
  });
  const catsF = cats.filter((c: any) => !qMin || String(c.nom ?? '').toLowerCase().includes(qMin) || String(c.id).includes(qMin));
  // Pagination réelle (8 lignes, comme la maquette), sur l'onglet affiché
  const tabList: any[] = tab === 'produits' ? produitsF : catsF;
  const tabNoun = tab === 'produits' ? 'produits' : tx("catégories");
  const pages = Math.max(1, Math.ceil(tabList.length / PER_PAGE));
  const current = Math.min(page, pages);
  const slicePage = (l: any[]) => l.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <AdminLayout currentPath="/admin/catalogue">
      {err && (
        <div className="m-lg rounded-lg border border-error bg-error-container p-4 text-label text-on-error-container">
          <p className="font-bold">{tx("Erreur API")}</p>
          <p>{err}</p>
        </div>
      )}
      {loading && <p className="m-lg text-label text-text-secondary">{tx("Chargement des données réelles…")}</p>}
      <div className="m-lg">
        <button type="button" className="btn btn-primary" onClick={() => ouvrir(null)}>
          + Nouveau produit (réel)
        </button>
      </div>
      <style>{DESIGN_CSS}</style>
  <header className="h-16 flex justify-between items-center px-lg bg-white sticky top-0 z-40 border-b border-border-default"> <div className="flex items-center gap-4"> <span className="font-h2 text-h2 font-bold text-primary">{tx("Gestion du catalogue")}</span> </div> <div className="flex items-center gap-6"> <div className="relative hidden lg:block"> <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /> <input className="pl-10 pr-4 py-2 bg-bg-secondary border border-border-default rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-64" placeholder={tx("Rechercher un produit...")} type="text" value={q} onChange={(e) => setQ(e.target.value)} /> </div> <div className="flex items-center gap-4 border-l border-border-default pl-6">  </div> </div> </header>  <div className="p-lg space-y-lg">  <div className="flex flex-col md:flex-row md:items-center justify-between gap-md"> <div className="flex gap-lg border-b border-border-default w-full md:w-auto"> {([['produits', `Produits (${produitsF.length})`], ['categories', `Catégories (${catsF.length})`]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`pb-3 px-2 font-h3 text-h3 transition-all ${tab === k ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary hover:text-on-surface-variant'}`}>{label}</button>
              ))} </div> <button className="flex items-center gap-2 bg-primary-container hover:bg-primary-hover text-white px-md py-2.5 rounded-lg font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95" type="button" onClick={() => ouvrir(null)}> <MIcon name="add" />
                    {tx("Nouveau produit")}
                </button> </div>  <div className="bg-white p-md rounded-lg shadow-sm flex flex-wrap items-center gap-4 border border-border-default"> <div className="flex-1 min-w-[200px]"> <div className="relative"> <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm" /> <input className="w-full pl-9 pr-4 py-2 text-label bg-white border border-border-default rounded-lg focus:ring-1 focus:ring-primary outline-none" placeholder="Nom, SKU ou ID..." type="text" value={q} onChange={(e) => setQ(e.target.value)} /> </div> </div> <select className="px-md py-2 text-label bg-white border border-border-default rounded-lg focus:ring-1 focus:ring-primary outline-none min-w-[140px]" value={catF} onChange={(e) => setCatF(e.target.value)}> <option value="">{tx("Catégorie: Tout")}</option>
                {cats.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.nom}</option>
                ))}
              </select> <select className="px-md py-2 text-label bg-white border border-border-default rounded-lg focus:ring-1 focus:ring-primary outline-none" value={dispoF} onChange={(e) => setDispoF(e.target.value)}> <option value="">{tx("Disponibilité")}</option> <option value="stock">{tx("En stock")}</option> <option value="rupture">{tx("Rupture")}</option> </select> <div className="flex border border-border-default rounded-lg overflow-hidden"> <button className="p-2 bg-bg-secondary text-primary"><MIcon name="format_list_bulleted" /></button> <button className="p-2 hover:bg-bg-secondary text-text-tertiary"><MIcon name="grid_view" /></button> </div> </div>  <div className="bg-white rounded-lg shadow-sm border border-border-default overflow-hidden"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-bg-secondary border-b border-border-default"> <th className="py-md px-lg w-10"> <input className="rounded border-border-default text-primary focus:ring-primary" type="checkbox" /> </th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">{tx("Produit")}</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">{tx("Catégorie")}</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">{tx("Prix")}</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider">{tx("Statut")}</th> <th className="py-md px-md font-label text-label text-text-tertiary uppercase tracking-wider text-right">Actions</th> </tr> </thead> <tbody>
                {tab === 'produits' && slicePage(produitsF).map((pr: any) => (
                  <tr key={pr.id} tabIndex={0} title={tx("Voir le détail")} className="cursor-pointer hover:bg-bg-secondary/50 transition-colors" onClick={() => setDetail({ kind: 'produit', item: pr })} onKeyDown={(e) => { if (e.key === 'Enter') setDetail({ kind: 'produit', item: pr }); }}>
                    <td className="py-4 px-lg" onClick={(e) => e.stopPropagation()}><input className="rounded border-border-default text-primary focus:ring-primary" type="checkbox" /></td>
                    <td className="py-4 px-md"> <div className="flex items-center gap-3"> {pr.image_url ? (
                      <img src={absImageUrl(pr.image_url) ?? undefined} alt="" className="h-10 w-10 rounded-lg bg-bg-secondary object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-primary"><MIcon name="inventory_2" className="text-[20px]" /></div>
                    )} <span className="font-body font-semibold">{pr.nom}</span> </div> </td>
                    <td className="py-4 px-md text-text-secondary">{pr.categorie?.nom ?? '—'}</td>
                    <td className="py-4 px-md font-price text-primary">{fmtFcfa(pr.prix)}</td>
                    <td className="py-4 px-md"> <span className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit ${pr.disponible !== false && Number(pr.stock) > 0 ? 'bg-success-light text-success-dark' : 'bg-bg-secondary text-text-secondary'}`}> <span className={`w-1.5 h-1.5 rounded-full ${pr.disponible !== false && Number(pr.stock) > 0 ? 'bg-success' : 'bg-text-tertiary'}`}></span> {pr.disponible !== false && Number(pr.stock) > 0 ? tx("Disponible") : 'Rupture'} </span> </td>
                    <td className="py-4 px-md text-right" onClick={(e) => e.stopPropagation()}> <div className="flex gap-2 justify-end"> <button type="button" className="font-semibold text-primary hover:underline" onClick={() => ouvrir(pr)}>{tx("Modifier")}</button> <button type="button" className="font-semibold text-error hover:underline" onClick={() => void supprimer(pr.id)}>{tx("Supprimer")}</button> </div> </td>
                  </tr>
                ))}
                {tab === 'categories' && slicePage(catsF).map((c: any) => (
                  <tr key={c.id} tabIndex={0} title={tx("Voir le détail")} className="cursor-pointer hover:bg-bg-secondary/50 transition-colors" onClick={() => setDetail({ kind: 'categorie', item: c })} onKeyDown={(e) => { if (e.key === 'Enter') setDetail({ kind: 'categorie', item: c }); }}>
                    <td className="py-4 px-lg" onClick={(e) => e.stopPropagation()}><input className="rounded border-border-default text-primary focus:ring-primary" type="checkbox" /></td>
                    <td className="py-4 px-md"> <div className="flex items-center gap-3"> <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-text"><MIcon name="category" className="text-[20px]" /></div> <span className="font-body font-semibold">{c.nom}</span> </div> </td>
                    <td className="py-4 px-md text-text-secondary">{c.description ?? '—'}</td>
                    <td className="py-4 px-md font-price text-primary">—</td>
                    <td className="py-4 px-md text-text-secondary">—</td>
                    <td className="py-4 px-md text-right" onClick={(e) => e.stopPropagation()}> <div className="flex gap-2 justify-end"> <Link to="/admin/categories" className="font-semibold text-primary hover:underline">{tx("Éditer")}</Link> <button type="button" className="font-semibold text-error hover:underline" onClick={() => void supprimerCat(c)}>{tx("Supprimer")}</button> </div> </td>
                  </tr>
                ))}
                {((tab === 'produits' && produitsF.length === 0) || (tab === 'categories' && catsF.length === 0)) && (
                  <tr><td className="py-6 px-lg text-text-secondary" colSpan={6}>{tx("Aucun résultat pour ces filtres.")}</td></tr>
                )}
              </tbody> </table>  <div className="py-md px-lg flex items-center justify-between border-t border-border-default bg-bg-secondary/30"> <span className="text-label text-text-secondary">{tabList.length === 0 ? `Aucun résultat` : `Affichage de ${(current - 1) * PER_PAGE + 1} à ${Math.min(current * PER_PAGE, tabList.length)} sur ${tabList.length} ${tabNoun}`}</span> <div className="flex items-center gap-2"> <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-tertiary hover:bg-bg-secondary disabled:opacity-40"><MIcon name="chevron_left" className="text-[18px]" /></button> {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1).map((n) => (<button key={n} type="button" onClick={() => setPage(n)} className={n === current ? 'w-8 h-8 flex items-center justify-center rounded bg-primary-container text-white font-bold' : 'w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white hover:bg-bg-secondary'}>{n}</button>))} <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="w-8 h-8 flex items-center justify-center rounded border border-border-default bg-white text-text-tertiary hover:bg-bg-secondary disabled:opacity-40"><MIcon name="chevron_right" className="text-[18px]" /></button> </div> </div> </div> </div> 
      {detail && (
        <CatalogueDetailModal
          detail={detail}
          cats={cats}
          onClose={() => setDetail(null)}
          onEdit={modifierDepuisDetail}
        />
      )}
      {edition && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={fermer}>
          <div className="flex max-h-[85vh] w-[min(92vw,600px)] shrink-0 flex-col rounded-2xl bg-white shadow-2xl" onClick={(e: any) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-h3 font-h3 font-bold">
                {edition.id ? tx("Modifier le produit") : tx("Nouveau produit")}
              </h3>
              <button type="button" onClick={fermer}>{tx("Fermer")}</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-label">
              <>
              <div><p className="text-text-secondary">{tx("Nom")}</p><input value={form.nom} onChange={(e: any) => setForm({ ...form, nom: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Description</p><textarea rows={2} value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">{tx("Prix (FCFA)")}</p><input value={form.prix} onChange={(e: any) => setForm({ ...form, prix: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Prix minimum (FCFA) — obligatoire</p><input value={form.prix_minimum} onChange={(e: any) => setForm({ ...form, prix_minimum: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">Stock</p><input value={form.stock} onChange={(e: any) => setForm({ ...form, stock: e.target.value })} className="w-full rounded-lg border border-border-default px-3 py-2" /></div>
              <div><p className="text-text-secondary">{tx("Catégorie — obligatoire")}</p>
                <select value={form.categorie_id} onChange={(e: any) => setForm({ ...form, categorie_id: e.target.value })} className="w-full rounded-lg border border-border-default bg-white px-3 py-2">
                  <option value="">{tx("— Choisir —")}</option>
                  {cats.map((c: any) => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <p className="text-text-secondary">{tx("Image du produit")}</p>
                <div
                  className={`mt-1 group rounded-lg border-2 border-dashed border-outline-variant/50 bg-bg-secondary p-4 text-center transition-colors hover:bg-bg-secondary/80 ${imageBusy ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                  onClick={() => { if (!imageBusy) imageInputRef.current?.click(); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (!imageBusy) void pickImage(e.dataTransfer.files?.[0]); }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="mx-auto max-h-36 rounded-lg object-contain" />
                  ) : (
                    <MIcon name="cloud_upload" className="mb-2 text-3xl text-primary transition-transform group-hover:scale-110" />
                  )}
                  <p className="font-medium">{imageBusy ? tx("Conversion en WebP…") : imagePreview ? tx("Changer l'image") : tx("Cliquez pour choisir une image")}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{tx("PNG ou JPG, converti en WebP avant l'envoi (max. 4 Mo)")}</p>
                  {imageFile && <p className="mt-1 text-xs font-semibold text-primary">{imageFile.name} · {Math.max(1, Math.round(imageFile.size / 1024))} Ko</p>}
                </div>
                {imagePreview && (
                  <button type="button" className="mt-1 text-xs text-text-secondary underline" onClick={clearImage}>
                    {imageFile ? tx("Retirer l'image choisie") : tx("Retirer l'image")}
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ''; }}
                />
              </div>
              </>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-default p-4">
              <button type="button" className="btn btn-ghost" onClick={fermer}>{tx("Annuler")}</button>
              <button type="button" className="btn btn-primary" disabled={imageBusy} onClick={enregistrer}>{tx("Enregistrer")}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function FicheLigne({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-border-default/70 py-2 text-label">
      <span className="text-text-secondary">{label}</span>
      <span className="whitespace-pre-wrap break-words font-medium text-text-main">{value === null || value === undefined || value === '' ? '—' : value}</span>
    </div>
  );
}

function CatalogueDetailModal({
  detail,
  cats,
  onClose,
  onEdit,
}: {
  detail: { kind: 'produit' | 'categorie'; item: any };
  cats: any[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const item = detail.item;
  const image = absImageUrl(item.image_url ?? item.img_url);
  const titre = detail.kind === 'categorie' ? tx("Détails de la catégorie") : tx("Détails du produit");
  const dispo = detail.kind === 'categorie' ? null : item.disponible !== false && Number(item.stock) > 0;
  const enfants: any[] = Array.isArray(item.children) ? item.children : [];
  const parent = item.parent?.nom
    ?? cats.find((c: any) => String(c.id) === String(item.parent_id))?.nom;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalogue-detail-title"
        className="flex max-h-[85vh] w-[min(92vw,640px)] shrink-0 flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-default p-4">
          <div className="min-w-0">
            <p className="text-label text-text-secondary">{titre}</p>
            <h3 id="catalogue-detail-title" className="truncate text-h3 font-h3 font-bold">{item.nom || '—'}</h3>
          </div>
          <button type="button" className="text-text-secondary hover:text-text-main" onClick={onClose}>{tx("Fermer")}</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {image && (
            <img src={image} alt="" className="mx-auto max-h-48 rounded-lg bg-bg-secondary object-contain" />
          )}
          <FicheLigne label={tx("Identifiant")} value={item.id} />
          <FicheLigne label={tx("Nom")} value={item.nom} />
          <FicheLigne label={tx("Description")} value={item.description || tx("Aucune description.")} />
          {detail.kind === 'produit' && (
            <>
              <FicheLigne label={tx("Catégorie")} value={item.categorie?.nom} />
              <FicheLigne label={tx("Prix")} value={fmtFcfa(item.prix)} />
              <FicheLigne label={tx("Prix minimum")} value={fmtFcfa(item.prix_minimum)} />
              <FicheLigne label={tx("Devise")} value={item.devise || 'XOF'} />
              <FicheLigne label={tx("Stock")} value={item.stock ?? 0} />
            </>
          )}
          {detail.kind === 'categorie' && (
            <>
              <FicheLigne label={tx("Slug")} value={item.slug} />
              <FicheLigne label={tx("Parent")} value={parent} />
              <FicheLigne
                label={tx("Sous-catégories")}
                value={enfants.length === 0 ? '—' : enfants.map((c) => c.nom).filter(Boolean).join(', ')}
              />
            </>
          )}
          {dispo !== null && (
            <FicheLigne label={tx("Statut")} value={dispo ? tx("Disponible") : tx("Rupture")} />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border-default p-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{tx("Fermer")}</button>
          {detail.kind === 'categorie' ? (
            <Link to="/admin/categories" className="btn btn-primary">{tx("Éditer")}</Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onEdit}>{tx("Modifier")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
