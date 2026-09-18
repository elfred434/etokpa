import clsx from 'clsx';
import { IconPlant2, IconFish, IconBasket, IconSalt, IconGrain } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import type { CategoryId } from '../../../types/models';

const STYLES: Record<CategoryId, { cls: string; icon: TablerIcon }> = {
  vegetable: { cls: 'ph-vegetable', icon: IconPlant2 },
  fish: { cls: 'ph-fish', icon: IconFish },
  pack: { cls: 'ph-pack', icon: IconBasket },
  spice: { cls: 'ph-spice', icon: IconSalt },
  grain: { cls: 'ph-grain', icon: IconGrain },
};

interface ProductPlaceholderProps {
  categorie: CategoryId;
  size?: 'card' | 'detail' | 'thumb';
  className?: string;
}

/** Placeholder produit : dégradé léger + icône Tabler centrée (design.md §8). */
export default function ProductPlaceholder({ categorie, size = 'card', className }: ProductPlaceholderProps) {
  const { cls, icon: Icon } = STYLES[categorie];
  return (
    <div
      className={clsx(
        'ph',
        cls,
        size === 'detail' && 'ph-lg',
        size === 'thumb' && 'h-[64px] w-[64px] shrink-0',
        className,
      )}
    >
      <Icon size={size === 'thumb' ? 26 : 40} strokeWidth={1.5} />
    </div>
  );
}
