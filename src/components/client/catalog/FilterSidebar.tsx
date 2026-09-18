import clsx from 'clsx';
import { IconLayoutGrid, IconLeaf, IconTools, IconGrain, IconSalt, IconBasket } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { CATEGORIES, MARKETS } from '../../../constants/mockData';
import type { CategoryId } from '../../../types/models';

const CAT_ICONS: Record<string, TablerIcon> = {
  all: IconLayoutGrid,
  vegetable: IconLeaf,
  fish: IconTools,
  grain: IconGrain,
  spice: IconSalt,
  pack: IconBasket,
};

export interface CatalogFilters {
  category: CategoryId | 'all';
  zones: string[];
  maxPrice: number;
  availableOnly: boolean;
}

interface FilterSidebarProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
}

/** Colonne de filtres (maquette catalogue) : catégories, zones, prix, disponibilité. */
export default function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const toggleZone = (zoneId: string) =>
    onChange({
      ...filters,
      zones: filters.zones.includes(zoneId)
        ? filters.zones.filter((z) => z !== zoneId)
        : [...filters.zones, zoneId],
    });

  return (
    <aside className="card flex flex-col gap-lg p-lg">
      {/* Catégories */}
      <div>
        <h2 className="mb-md text-h3 text-ink">Catégories</h2>
        <ul className="space-y-xs">
          {([{ id: 'all' as const, nom: 'Tous les produits' }, ...CATEGORIES]).map(({ id, nom }) => {
            const Icon = CAT_ICONS[id] ?? IconBasket;
            const active = filters.category === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, category: id as CatalogFilters['category'] })}
                  className={clsx(
                    'flex w-full items-center gap-sm rounded-[10px] px-md py-[10px] text-[14px] transition-colors duration-150',
                    active ? 'bg-primary-lighter font-medium text-primary' : 'text-ink-2 hover:bg-surface hover:text-ink',
                  )}
                >
                  <Icon size={18} />
                  {nom}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="h-px bg-line" aria-hidden="true" />

      {/* Zones de marché */}
      <div>
        <h2 className="mb-md text-h3 text-ink">Zone du marché</h2>
        <ul className="space-y-sm">
          {MARKETS.map((market) => {
            const checked = filters.zones.includes(market.id);
            return (
              <li key={market.id}>
                <label className="flex cursor-pointer items-center gap-sm text-[14px] text-ink-2 select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleZone(market.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={clsx(
                      'flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
                      checked ? 'border-primary bg-primary' : 'border-line bg-card',
                    )}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                  {market.nom}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="h-px bg-line" aria-hidden="true" />

      {/* Prix */}
      <div>
        <div className="mb-md flex items-baseline justify-between">
          <h2 className="text-h3 text-ink">Prix (FCFA)</h2>
          <span className="text-[12px] font-semibold text-primary">{filters.maxPrice.toLocaleString('fr-FR')} max</span>
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={100}
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-[#F97316]"
          aria-label="Prix maximum"
        />
        <div className="mt-xs flex justify-between text-[12px] text-ink-3">
          <span>0</span>
          <span>10k</span>
        </div>
      </div>

      <div className="h-px bg-line" aria-hidden="true" />

      {/* Disponibilité */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-ink">Disponible uniquement</span>
        <button
          type="button"
          role="switch"
          aria-checked={filters.availableOnly}
          onClick={() => onChange({ ...filters, availableOnly: !filters.availableOnly })}
          className={clsx(
            'relative h-[24px] w-[44px] rounded-full transition-colors duration-150',
            filters.availableOnly ? 'bg-primary' : 'bg-line',
          )}
        >
          <span
            className={clsx(
              'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all duration-150',
              filters.availableOnly ? 'left-[23px]' : 'left-[3px]',
            )}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onChange({ category: 'all', zones: [], maxPrice: 10000, availableOnly: false })}
        className="mx-auto text-[13px] font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
      >
        Réinitialiser les filtres
      </button>
    </aside>
  );
}
