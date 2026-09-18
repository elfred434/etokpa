import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ClientNavbar from '../../../components/layout/client/ClientNavbar';
import ClientFooter from '../../../components/layout/client/ClientFooter';
import FilterSidebar from '../../../components/client/catalog/FilterSidebar';
import type { CatalogFilters } from '../../../components/client/catalog/FilterSidebar';
import CatalogToolbar from '../../../components/client/catalog/CatalogToolbar';
import type { SortKey, ViewMode } from '../../../components/client/catalog/CatalogToolbar';
import ProductCard from '../../../components/client/catalog/ProductCard';
import Pagination from '../../../components/shared/Pagination';
import EmptyState from '../../../components/shared/EmptyState';
import { IconSearch } from '@tabler/icons-react';
import { MARKETS, PRODUCTS } from '../../../constants/mockData';
import { useAppDispatch } from '../../../hooks/useStore';
import { add } from '../../../store/slices/cart/cartSlice';

const PER_PAGE = 9;

/** Page catalogue — copie conforme de la maquette catalogue (filtres + grille + pagination). */
export default function CatalogPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>({
    category: 'all',
    zones: [],
    maxPrice: 10000,
    availableOnly: false,
  });
  const [sort, setSort] = useState<SortKey>('popular');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (filters.category !== 'all' && p.categorie !== filters.category) return false;
      if (filters.zones.length && !filters.zones.some((id) => MARKETS.find((m) => m.id === id)?.nom === p.origine))
        return false;
      if (p.prix > filters.maxPrice) return false;
      if (filters.availableOnly && p.stock === 'out') return false;
      if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.prix - b.prix);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.prix - a.prix);
    if (sort === 'new') list = [...list].sort((a, b) => Number(b.badges.includes('new')) - Number(a.badges.includes('new')));
    return list;
  }, [filters, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const addToCart = (product: (typeof PRODUCTS)[number]) => {
    dispatch(add({ product }));
    toast.success(`${product.nom} ajouté au panier`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <ClientNavbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-md py-lg md:px-lg">
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-[260px_1fr]">
          <FilterSidebar
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
          />

          <div>
            <CatalogToolbar count={filtered.length} sort={sort} onSort={setSort} view={view} onView={setView} />

            {visible.length === 0 ? (
              <EmptyState
                icon={IconSearch}
                title="Aucun produit trouvé"
                description="Essayez de modifier vos filtres ou votre recherche."
                action={
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setFilters({ category: 'all', zones: [], maxPrice: 10000, availableOnly: false });
                      setSearch('');
                    }}
                  >
                    Réinitialiser
                  </button>
                }
              />
            ) : (
              <div className={clsx('grid gap-md', view === 'grid' ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
                {visible.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAdd={addToCart}
                    onOpen={(prod) => navigate({ to: '/produit/$productId', params: { productId: prod.id } })}
                  />
                ))}
              </div>
            )}

            <Pagination page={current} pageCount={pageCount} onChange={setPage} className="mt-xl" />
          </div>
        </div>
      </main>

      <ClientFooter />
    </div>
  );
}
