import clsx from 'clsx';
import { IconLayoutGrid, IconListDetails, IconSearch } from '@tabler/icons-react';

export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'new';
export type ViewMode = 'grid' | 'list';

const SORT_LABELS: Record<SortKey, string> = {
  popular: 'Popularité',
  'price-asc': 'Prix croissant',
  'price-desc': 'Prix décroissant',
  new: 'Nouveautés',
};

interface CatalogToolbarProps {
  count: number;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  search?: string;
  onSearch?: (value: string) => void;
}

/** En-tête catalogue : compteur, tri, bascule grille/liste (maquette catalogue). */
export default function CatalogToolbar({ count, sort, onSort, view, onView, search, onSearch }: CatalogToolbarProps) {
  return (
    <>
      <div className="mb-md">
        <div className="relative">
          <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search ?? ''}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Rechercher un produit (nom ou description)…"
            className="w-full rounded-[10px] border-0.5 border-line bg-card py-3 pl-10 pr-4 text-label placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div className="mb-lg flex flex-wrap items-end justify-between gap-md">
      <div>
        <h1 className="text-h1 text-ink">Légumes frais</h1>
        <p className="mt-xs text-[13px] text-ink-2">{count} produits trouvés</p>
      </div>
      <div className="flex items-center gap-sm">
        <label className="flex items-center gap-sm rounded-[10px] border-0.5 border-line bg-card px-md py-[8px]">
          <span className="text-[13px] text-ink-2">Trier par</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="bg-transparent text-[13px] font-semibold text-ink outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-[10px] border-0.5 border-line bg-card">
          <button
            type="button"
            onClick={() => onView('grid')}
            aria-label="Vue grille"
            className={clsx(
              'flex h-10 w-10 items-center justify-center transition-colors',
              view === 'grid' ? 'bg-primary-lighter text-primary' : 'text-ink-3 hover:text-ink',
            )}
          >
            <IconLayoutGrid size={18} />
          </button>
          <button
            type="button"
            onClick={() => onView('list')}
            aria-label="Vue liste"
            className={clsx(
              'flex h-10 w-10 items-center justify-center transition-colors',
              view === 'list' ? 'bg-primary-lighter text-primary' : 'text-ink-3 hover:text-ink',
            )}
          >
            <IconListDetails size={18} />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
