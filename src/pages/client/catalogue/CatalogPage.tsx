import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientBottomNav from '../../../components/layout/client/ClientBottomNav';
import MIcon from '../../../components/shared/MIcon';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';
import type { CategoryId, Product } from '../../../types/models';
import { catalogApi, type ApiProduct } from '../../../services/api';

/* ---- Données exactes du code.html « catalogue_tokpa » ---- */

type CatFilter = 'all' | CategoryId;

const CATEGORIES: { id: CatFilter; icon: string; nom: string }[] = [
  { id: 'all', icon: 'grid_view', nom: 'Tous les produits' },
  { id: 'vegetable', icon: 'eco', nom: 'Légumes & Fruits' },
  { id: 'fish', icon: 'restaurant', nom: 'Poissons & Viandes' },
  { id: 'grain', icon: 'grain', nom: 'Céréales & Graines' },
  { id: 'spice', icon: 'soup_kitchen', nom: 'Épices & Condiments' },
  { id: 'pack', icon: 'shopping_basket', nom: 'Packs & Bundles' },
];

const ZONES = [
  { id: 'dantokpa', nom: 'Marché Dantokpa' },
  { id: 'ganhi', nom: 'Marché Ganhi' },
  { id: 'missebo', nom: 'Marché Missèbo' },
  { id: 'gbegamey', nom: 'Gbégamey' },
];

interface CatalogProduct {
  id: string;
  nom: string;
  zoneId: string;
  meta: string;
  quantite: string;
  prix: number;
  prixLabel: string;
  prixAncienLabel?: string;
  promo?: string;
  stock: 'available' | 'low' | 'none';
  icon: string;
  cat: CategoryId;
}

const INITIAL_PRODUCTS: CatalogProduct[] = [
  { id: 'c1', nom: 'Tomates fraîches (Local)', zoneId: 'dantokpa', meta: 'Marché Dantokpa · 1kg', quantite: '1kg', prix: 450, prixLabel: '450 FCFA', stock: 'available', icon: 'eco', cat: 'vegetable' },
  { id: 'c2', nom: 'Oignons violets', zoneId: 'ganhi', meta: 'Marché Ganhi · 2kg', quantite: '2kg', prix: 800, prixLabel: '800 FCFA', prixAncienLabel: '1 000 FCFA', promo: 'Promo −20%', stock: 'available', icon: 'nutrition', cat: 'vegetable' },
  { id: 'c3', nom: 'Poivrons verts', zoneId: 'missebo', meta: 'Marché Missèbo · 500g', quantite: '500g', prix: 600, prixLabel: '600 FCFA', stock: 'low', icon: 'eco', cat: 'vegetable' },
  { id: 'c4', nom: 'Carottes bio', zoneId: 'gbegamey', meta: 'Marché Gbégamey · 1kg', quantite: '1kg', prix: 350, prixLabel: '350 FCFA', stock: 'none', icon: 'restaurant', cat: 'vegetable' },
  { id: 'c5', nom: 'Pommes de terre', zoneId: 'dantokpa', meta: 'Dantokpa · Filet 2kg', quantite: 'Filet 2kg', prix: 1200, prixLabel: '1 200 FCFA', stock: 'none', icon: 'lunch_dining', cat: 'grain' },
  { id: 'c6', nom: 'Chou vert blanc', zoneId: 'ganhi', meta: 'Marché Ganhi · Pièce', quantite: 'Pièce', prix: 400, prixLabel: '400 FCFA', stock: 'none', icon: 'local_florist', cat: 'vegetable' },
  { id: 'c7', nom: 'Concombres frais', zoneId: 'dantokpa', meta: 'Marché Dantokpa · Lot de 3', quantite: 'Lot de 3', prix: 300, prixLabel: '300 FCFA', stock: 'none', icon: 'eco', cat: 'vegetable' },
  { id: 'c8', nom: 'Gombo frais', zoneId: 'missebo', meta: 'Marché Missèbo · 500g', quantite: '500g', prix: 250, prixLabel: '250 FCFA', stock: 'none', icon: 'nutrition', cat: 'vegetable' },
  { id: 'c9', nom: 'Ail violet local', zoneId: 'dantokpa', meta: 'Dantokpa · 250g', quantite: '250g', prix: 500, prixLabel: '500 FCFA', stock: 'none', icon: 'spa', cat: 'spice' },
];

const CAT_TITLES: Record<CatFilter, string> = {
  all: 'Légumes frais',
  vegetable: 'Légumes & Fruits',
  fish: 'Poissons & Viandes',
  grain: 'Céréales & Graines',
  spice: 'Épices & Condiments',
  pack: 'Packs & Bundles',
};

const PER_PAGE = 9;

/** Catégorie réelle (ProductResource.categorie) -> CatFilter Stitch. */
function mapApiCategory(categorie?: ApiProduct['categorie']): CategoryId {
  const s = `${categorie?.slug ?? ''} ${categorie?.nom ?? ''}`.toLowerCase();
  if (/poisson|viande|chair|boeuf|porc|poulet/.test(s)) return 'fish';
  if (/c.r.al|graine|riz|ma.s|bl.|haricot/.test(s)) return 'grain';
  if (/.pice|condiment|aromate|ail|piment/.test(s)) return 'spice';
  if (/pack|bundle|lot/.test(s)) return 'pack';
  return 'vegetable';
}

/** Catalogue — Copie conforme Stitch + Intégration API Backend Laravel */
export default function CatalogPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const q = useRouterState({ select: (s) => (s.location.search as { q?: string }).q ?? '' });

  const [productsList, setProductsList] = useState<CatalogProduct[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState(q);
  const [cat, setCat] = useState<CatFilter>('all');
  const [zones, setZones] = useState<string[]>(['dantokpa']);
  const [maxPrice, setMaxPrice] = useState(7500);
  const [dispoOnly, setDispoOnly] = useState(true);
  const [touched, setTouched] = useState(false);
  const [sort, setSort] = useState('pop');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Connection API Backend GET /api/products
  useEffect(() => {
    catalogApi.getProducts({ q: search })
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const fetched: CatalogProduct[] = res.data.map((p: ApiProduct) => ({
            id: String(p.id),
            nom: p.nom,
            zoneId: 'dantokpa',
            meta: p.categorie?.nom ? `${p.categorie.nom} · Marché Dantokpa` : 'Marché Dantokpa',
            quantite: p.stock > 0 ? `Stock : ${p.stock}` : 'Rupture',
            prix: p.prix,
            prixLabel: `${p.prix.toLocaleString('fr-FR')} FCFA`,
            prixAncienLabel: undefined,
            promo: undefined,
            stock: p.disponible === false ? 'none' : p.stock > 5 ? 'available' : p.stock > 0 ? 'low' : 'none',
            icon: 'shopping_bag',
            cat: mapApiCategory(p.categorie),
          }));
          setProductsList(fetched);
        }
      })
      .catch((err) => {
        console.warn('API Catalog offline, using Stitch mock catalog:', err);
      });
  }, [search]);

  const touch = () => setTouched(true);

  const filtered = useMemo(() => {
    let items = [...productsList];
    const needle = search.trim().toLowerCase();
    if (needle) items = items.filter((p) => p.nom.toLowerCase().includes(needle) || p.meta.toLowerCase().includes(needle));
    if (touched) {
      if (cat !== 'all') items = items.filter((p) => p.cat === cat);
      if (zones.length > 0) items = items.filter((p) => zones.includes(p.zoneId));
      items = items.filter((p) => p.prix <= maxPrice);
      if (dispoOnly) items = items.filter((p) => p.stock === 'available');
    }
    if (sort === 'asc') items.sort((a, b) => a.prix - b.prix);
    if (sort === 'desc') items.sort((a, b) => b.prix - a.prix);
    if (sort === 'new') items.reverse();
    return items;
  }, [search, touched, cat, zones, maxPrice, dispoOnly, sort, productsList]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const resetFilters = () => {
    setCat('all');
    setZones(['dantokpa']);
    setMaxPrice(7500);
    setDispoOnly(true);
    setTouched(false);
    setSearch('');
    setSort('pop');
    setPage(1);
    if (q) navigate({ to: '/catalogue', search: {} });
  };

  const toggleZone = (zoneId: string) => {
    touch();
    setZones((z) => (z.includes(zoneId) ? z.filter((id) => id !== zoneId) : [...z, zoneId]));
    setPage(1);
  };

  const addToCart = (p: CatalogProduct) => {
    const product: Product = {
      id: p.id,
      nom: p.nom,
      origine: ZONES.find((z) => z.id === p.zoneId)?.nom ?? p.zoneId,
      quantite: p.quantite,
      prix: p.prix,
      prixMinimum: Math.round(p.prix * 0.8),
      categorie: p.cat,
      stock: p.stock === 'none' ? 'out' : p.stock === 'low' ? 'low' : 'available',
      badges: p.promo ? ['promo'] : [],
      negotiated: p.prixAncienLabel ? { oldPrice: 1000 } : undefined,
    };
    dispatch(add({ product }));
    toast.success(`${p.nom} ajouté au panier`);
  };

  const openProduct = () => navigate({ to: '/produit/$productId', params: { productId: 'p1' } });

  const badges = (p: CatalogProduct) => (
    <div className="absolute left-2 top-2 flex flex-col gap-1">
      {p.stock === 'available' && (
        <span className="flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" /> Disponible
        </span>
      )}
      {p.promo && <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white">{p.promo}</span>}
      {p.stock === 'low' && (
        <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" /> Stock faible
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-page pt-[52px] font-body text-on-surface">
      <ClientNavbar
        search={search}
        onSearch={(v) => {
          touch();
          setSearch(v);
          setPage(1);
        }}
      />

      <main className="mx-auto flex w-full max-w-[1200px] gap-4 px-4 py-lg">
        {/* ---- Sidebar Filters ---- */}
        <aside className="hidden w-[260px] flex-shrink-0 space-y-md md:block">
          <div className="rounded-xl border-[0.5px] border-line bg-white p-md shadow-sm">
            <h3 className="mb-md font-h3 text-h3">Catégories</h3>
            <nav className="space-y-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    touch();
                    setCat(c.id);
                    setPage(1);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                    cat === c.id && touched
                      ? 'bg-primary-lighter font-semibold text-primary'
                      : 'text-on-surface-variant hover:bg-primary-lighter hover:text-primary',
                    cat === c.id && !touched && 'bg-primary-lighter font-semibold text-primary',
                  )}
                >
                  <MIcon name={c.icon} className="text-[20px]" />
                  <span className="text-label">{c.nom}</span>
                </button>
              ))}
            </nav>

            <div className="mt-8 border-t border-line pt-6">
              <h3 className="mb-md font-h3 text-h3">Zone du marché</h3>
              <div className="space-y-3">
                {ZONES.map((z) => (
                  <label key={z.id} className="group flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={zones.includes(z.id)}
                      onChange={() => toggleZone(z.id)}
                      className="h-4 w-4 rounded border-line accent-primary"
                    />
                    <span className="text-label text-on-surface-variant group-hover:text-on-surface">{z.nom}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-h3 text-h3">Prix (FCFA)</h3>
                <span className="text-micro font-bold text-primary">10 000 max</span>
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={50}
                value={maxPrice}
                onChange={(e) => {
                  touch();
                  setMaxPrice(Number(e.target.value));
                  setPage(1);
                }}
                className="range-tokpa h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-warm-container accent-primary"
              />
              <div className="mt-2 flex justify-between text-micro text-ink-3">
                <span>0</span>
                <span>10k</span>
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <div className="flex items-center justify-between">
                <span className="text-label font-semibold">Disponible uniquement</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dispoOnly}
                  onClick={() => {
                    touch();
                    setDispoOnly((v) => !v);
                    setPage(1);
                  }}
                  className={clsx(
                    'relative h-5 w-10 rounded-full shadow-inner transition-all',
                    dispoOnly ? 'bg-primary' : 'bg-ink-3',
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow',
                      dispoOnly ? 'right-0.5' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-8 w-full rounded-lg py-2 text-label font-semibold text-primary transition-colors hover:bg-primary-lighter active:scale-95"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </aside>

        {/* ---- Mobile Filter Drawer ---- */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/50 md:hidden">
            <div className="mt-auto max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-lg shadow-xl">
              <div className="mb-md flex items-center justify-between border-b border-line pb-sm">
                <h3 className="font-h2 text-h2 text-on-surface">Filtres du catalogue</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-full p-2 text-ink-2 hover:bg-page"
                >
                  <MIcon name="close" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="mb-sm font-h3 text-h3 text-on-surface">Catégories</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          touch();
                          setCat(c.id);
                          setPage(1);
                        }}
                        className={clsx(
                          'flex items-center gap-2 rounded-lg p-2 text-left text-xs transition-all',
                          cat === c.id ? 'bg-primary-lighter font-bold text-primary' : 'bg-page text-ink-2',
                        )}
                      >
                        <MIcon name={c.icon} className="text-[18px]" />
                        <span className="truncate">{c.nom}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <h4 className="mb-sm font-h3 text-h3 text-on-surface">Zone du marché</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONES.map((z) => (
                      <label key={z.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-page p-2 text-xs">
                        <input
                          type="checkbox"
                          checked={zones.includes(z.id)}
                          onChange={() => toggleZone(z.id)}
                          className="h-4 w-4 rounded border-line accent-primary"
                        />
                        <span className="truncate">{z.nom}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-h3 text-h3 text-on-surface">Prix max</h4>
                    <span className="text-xs font-bold text-primary">{maxPrice.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={500}
                    value={maxPrice}
                    onChange={(e) => {
                      touch();
                      setMaxPrice(Number(e.target.value));
                      setPage(1);
                    }}
                    className="range-tokpa h-2 w-full cursor-pointer appearance-none rounded-lg bg-page"
                  />
                </div>

                <div className="border-t border-line pt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface">Disponible uniquement</span>
                  <button
                    type="button"
                    onClick={() => {
                      touch();
                      setDispoOnly(!dispoOnly);
                      setPage(1);
                    }}
                    className={clsx(
                      'relative h-5 w-10 rounded-full shadow-inner transition-all',
                      dispoOnly ? 'bg-primary' : 'bg-ink-3',
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow',
                        dispoOnly ? 'right-0.5' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-1/2 rounded-lg border border-line py-3 text-xs font-bold text-ink-2"
                  >
                    Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="w-1/2 rounded-lg bg-primary py-3 text-xs font-bold text-white shadow-sm"
                  >
                    Voir ({filtered.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Main Content Area ---- */}
        <section className="min-w-0 flex-grow">
          <div className="mb-md flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-lg">
            <div>
              <h2 className="font-h1 text-h1 text-on-surface">{CAT_TITLES[cat]}</h2>
              <p className="mt-1 text-ink-2">
                {filtered.length} produits trouvés
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm md:hidden"
              >
                <MIcon name="tune" className="text-[18px]" />
                Filtres
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5">
                <span className="hidden text-xs text-ink-2 sm:inline">Trier :</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    touch();
                    setSort(e.target.value);
                  }}
                  className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold focus:ring-0"
                >
                  <option value="pop">Popularité</option>
                  <option value="asc">Prix croissant</option>
                  <option value="desc">Prix décroissant</option>
                  <option value="new">Nouveautés</option>
                </select>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-line bg-white">
                <button
                  type="button"
                  aria-label="Vue grille"
                  onClick={() => setView('grid')}
                  className={clsx('p-2', view === 'grid' ? 'border-r border-line bg-warm text-primary' : 'text-ink-3 hover:bg-surface')}
                >
                  <MIcon name="grid_view" className="text-[20px]" />
                </button>
                <button
                  type="button"
                  aria-label="Vue liste"
                  onClick={() => setView('list')}
                  className={clsx('p-2', view === 'list' ? 'bg-warm text-primary' : 'text-ink-3 hover:bg-surface')}
                >
                  <MIcon name="view_list" className="text-[20px]" />
                </button>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border-[0.5px] border-line bg-white p-xl text-center text-ink-2">
              Aucun produit ne correspond à ces filtres.
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <div
                  key={p.id}
                  onClick={openProduct}
                  className="group cursor-pointer overflow-hidden rounded-xl border-[0.5px] border-line bg-white transition-all hover:shadow-md"
                >
                  <div className="relative flex h-[110px] items-center justify-center bg-gradient-to-br from-primary-lighter to-primary-light">
                    <MIcon name={p.icon} className="text-[40px] text-primary-hover" />
                    {badges(p)}
                  </div>
                  <div className="p-md">
                    <h4 className="line-clamp-1 text-label font-semibold text-ink">{p.nom}</h4>
                    <p className="mt-1 text-ink-2">{p.meta}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <span className="font-price text-price text-primary">{p.prixLabel}</span>
                        {p.prixAncienLabel && (
                          <span className="block text-micro text-ink-3 line-through">{p.prixAncienLabel}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Ajouter ${p.nom}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-all hover:bg-primary-hover active:scale-95"
                      >
                        <MIcon name="add" className="text-[20px]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {visible.map((p) => (
                <div
                  key={p.id}
                  onClick={openProduct}
                  className="group flex flex-col sm:flex-row cursor-pointer items-start sm:items-center justify-between gap-3 sm:gap-md rounded-xl border-[0.5px] border-line bg-white p-3 sm:p-md transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex h-[70px] w-[90px] sm:h-[80px] sm:w-[110px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-lighter to-primary-light">
                      <MIcon name={p.icon} className="text-[28px] sm:text-[32px] text-primary-hover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-label font-semibold text-ink line-clamp-1">{p.nom}</h4>
                      <p className="mt-0.5 text-xs text-ink-2">{p.meta}</p>

                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.stock === 'available' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-[10px] font-bold text-success-dark">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Disponible
                          </span>
                        )}
                        {p.promo && (
                          <span className="inline-flex items-center rounded-full bg-amber-light px-2 py-0.5 text-[10px] font-bold text-amber-text">
                            {p.promo}
                          </span>
                        )}
                        {p.stock === 'low' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-lighter px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Stock faible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-md border-t sm:border-t-0 border-line/60 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="font-price text-sm sm:text-price text-primary">{p.prixLabel}</span>
                      {p.prixAncienLabel && (
                        <span className="block text-micro text-ink-3 line-through">{p.prixAncienLabel}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Ajouter ${p.nom}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p);
                      }}
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-white transition-all hover:bg-primary-hover active:scale-95 shrink-0"
                    >
                      <MIcon name="add" className="text-[18px] sm:text-[20px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---- Pagination ---- */}
          <div className="mt-xl flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Page précédente"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-on-surface-variant transition-all hover:border-line hover:bg-white disabled:opacity-40"
            >
              <MIcon name="chevron_left" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                  n === currentPage
                    ? 'bg-primary font-bold text-white shadow-sm'
                    : 'border border-transparent text-on-surface-variant hover:border-line hover:bg-white',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              aria-label="Page suivante"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-on-surface-variant transition-all hover:border-line hover:bg-white disabled:opacity-40"
            >
              <MIcon name="chevron_right" />
            </button>
          </div>
        </section>
      </main>

      {/* ---- Footer catalogue ---- */}
      <footer className="mt-xl border-t border-line bg-white py-lg">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 text-ink-2">
          <div className="flex items-center gap-2">
            <span className="font-h3 text-primary">TOKPa</span>
            <span className="text-micro">© 2026 - Le Marché Béninois en ligne</span>
          </div>
          <div className="hidden gap-lg sm:flex">
            <Link to="/profil" className="text-label transition-colors hover:text-primary">
              Aide & Support
            </Link>
            <Link to="/negociations" className="text-label transition-colors hover:text-primary">
              Négocier sur TOKPa
            </Link>
            <Link to="/commandes/suivi" className="text-label transition-colors hover:text-primary">
              Suivi Livraison
            </Link>
          </div>
        </div>
      </footer>
      <ClientBottomNav />
    </div>
  );
}
