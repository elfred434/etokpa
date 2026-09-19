import React from 'react';
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  User,
  UserCircle,
  Search,
  Globe,
  Bell,
  Lock,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  MapPinPlus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
  LogOut,
  Plus,
  Minus,
  Star,
  CreditCard,
  Handshake,
  Truck,
  Sprout,
  Fish,
  Wine,
  ShoppingBag,
  SlidersHorizontal,
  List,
  Image as ImageIcon,
  Smile,
  Share2,
  Briefcase,
  Store,
  Hand,
  Tag,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import clsx from 'clsx';
import type { CSSProperties } from 'react';

const LUCIDE_MAP: Record<string, React.ComponentType<any>> = {
  home: Home,
  category: LayoutGrid,
  shopping_cart: ShoppingCart,
  person: User,
  account_circle: UserCircle,
  search: Search,
  language: Globe,
  notifications: Bell,
  notifications_active: Bell,
  lock: Lock,
  verified_user: ShieldCheck,
  verified: CheckCircle2,
  location_on: MapPin,
  add_location_alt: MapPinPlus,
  edit: Pencil,
  delete: Trash2,
  close: X,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  arrow_forward: ArrowRight,
  sync: RefreshCw,
  logout: LogOut,
  add: Plus,
  remove: Minus,
  star: Star,
  payments: CreditCard,
  handshake: Handshake,
  local_shipping: Truck,
  potted_plant: Sprout,
  set_meal: Fish,
  liquor: Wine,
  shopping_basket: ShoppingBag,
  tune: SlidersHorizontal,
  grid_view: LayoutGrid,
  view_list: List,
  image: ImageIcon,
  flag_2: Tag,
  face_nod: Smile,
  share: Share2,
  work: Briefcase,
  storefront: Store,
  waving_hand: Hand,
};

interface AppIconProps {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
  size?: number | string;
}

/**
 * AppIcon — Icônes 100% Lucide React avec fallback FontAwesome.
 * Aucune dépendance à Material Symbols.
 */
export default function MIcon({ name, className, filled, style, size }: AppIconProps) {
  const IconComponent = LUCIDE_MAP[name];

  if (IconComponent) {
    return (
      <IconComponent
        className={clsx('inline-block shrink-0', className)}
        style={style}
        size={size ?? 20}
        fill={filled ? 'currentColor' : 'none'}
      />
    );
  }

  // Fallback FontAwesome si l'icône n'existe pas dans Lucide React
  return (
    <FontAwesomeIcon
      icon={faStore}
      className={clsx('inline-block shrink-0', className)}
      style={style}
    />
  );
}
