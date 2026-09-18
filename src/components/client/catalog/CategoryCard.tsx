import { IconPlant2, IconFish, IconBasket, IconSalt, IconGrain } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import type { Category } from '../../../types/models';

const ICONS: Record<string, TablerIcon> = {
  vegetable: IconPlant2,
  fish: IconFish,
  grain: IconGrain,
  spice: IconSalt,
  pack: IconBasket,
};

interface CategoryCardProps {
  category: Category;
  active?: boolean;
  onClick?: () => void;
}

/** Tuile catégorie (maquette accueil) : fond crème, icône orange foncé, libellé. */
export default function CategoryCard({ category, active, onClick }: CategoryCardProps) {
  const Icon = ICONS[category.id] ?? IconBasket;
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-center justify-center gap-sm rounded-[14px] bg-primary-lighter p-lg transition-all duration-150 hover:bg-primary-light active:scale-[0.97] ' +
        (active ? 'ring-2 ring-primary' : '')
      }
    >
      <Icon size={28} className="text-primary-dark" />
      <span className="text-[13px] font-medium text-ink">{category.nom}</span>
    </button>
  );
}
