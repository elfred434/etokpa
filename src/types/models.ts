
// Regroupe les interfaces TypeScript métier partagées (produits, catégories, zones, panier, notifications).
export type CategoryId = 'vegetable' | 'fish' | 'grain' | 'spice' | 'pack';

export interface Category {
  id: CategoryId;
  nom: string;
}

export type StockState = 'available' | 'low' | 'out';
export type ProductBadge = 'promo' | 'pack' | 'new';

export interface Product {
  id: string;
  nom: string;
  origine: string;
  quantite: string;
  prix: number;
  prixMinimum: number;
  categorie: CategoryId;
  stock: StockState;
  badges: ProductBadge[];
  image?: string;
  description?: string;
  negotiated?: { oldPrice: number };
}

export interface Market {
  id: string;
  nom: string;
}

export interface Zone {
  id: string;
  nom: string;
}

export interface LandMark {
  id: string;
  zoneId: string;
  nom: string;
}

export interface CartItem {
  product: Product;
  quantite: number;
}

export type NotificationType = 'order' | 'promo' | 'security' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}
