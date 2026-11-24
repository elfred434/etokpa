// Lit, valide et sauvegarde l’état du panier dans localStorage.
import type { CartItem, Product } from '../types/models';
import type { CartProductRemovalNotice } from '../store/slices/cart/cartSlice';

export const CART_STORAGE_KEY = 'tokpa_cart_v1';

export interface PersistedCartState {
  items: CartItem[];
  removedProducts: CartProductRemovalNotice[];
}

export const EMPTY_CART_STATE: PersistedCartState = {
  items: [],
  removedProducts: [],
};

// Transforme ou formate les données via sanitizeProduct.
function sanitizeProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (p.id == null || (typeof p.id !== 'string' && typeof p.id !== 'number')) return null;
  const id = String(p.id).trim();
  if (!id || typeof p.nom !== 'string') return null;
  const prix = Number(p.prix);
  if (!Number.isFinite(prix) || prix < 0) return null;

  const product: Product = {
    id,
    nom: p.nom,
    prix,
    prixMinimum: Number.isFinite(Number(p.prixMinimum)) ? Number(p.prixMinimum) : 0,
    quantite: typeof p.quantite === 'string' ? p.quantite : '',
    origine: typeof p.origine === 'string' ? p.origine : '',
    categorie: typeof p.categorie === 'string' ? (p.categorie as Product['categorie']) : 'vegetable',
    stock: p.stock === 'out' || p.stock === 'low' || p.stock === 'available' ? p.stock : 'available',
    badges: Array.isArray(p.badges) ? (p.badges as Product['badges']) : [],
  };

  if (typeof p.description === 'string') product.description = p.description;
  if (typeof p.image === 'string') product.image = p.image;
  if (p.negotiated && typeof p.negotiated === 'object') {
    const oldPrice = Number((p.negotiated as { oldPrice?: unknown }).oldPrice);
    if (Number.isFinite(oldPrice) && oldPrice >= 0) {
      product.negotiated = { oldPrice };
    }
  }
  return product;
}

// Transforme ou formate les données via sanitizeCartItem.
function sanitizeCartItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  const product = sanitizeProduct(entry.product);
  if (!product) return null;
  const quantite = Math.floor(Number(entry.quantite));
  if (!Number.isFinite(quantite) || quantite < 1) return null;
  return { product, quantite };
}

// Transforme ou formate les données via sanitizeNotice.
function sanitizeNotice(raw: unknown): CartProductRemovalNotice | null {
  if (!raw || typeof raw !== 'object') return null;
  const notice = raw as Record<string, unknown>;
  if (notice.id == null) return null;
  const id = String(notice.id).trim();
  const name = typeof notice.name === 'string' ? notice.name : '';
  if (!id || !name) return null;
  return { id, name };
}

// Récupère et normalise les données pour readCartStorage.
export function readCartStorage(): PersistedCartState {
  if (typeof localStorage === 'undefined') return EMPTY_CART_STATE;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedCartState>;
    const items = Array.isArray(parsed.items)
      ? parsed.items.map(sanitizeCartItem).filter((item): item is CartItem => item !== null)
      : [];
    const removedProducts = Array.isArray(parsed.removedProducts)
      ? parsed.removedProducts
          .map(sanitizeNotice)
          .filter((notice): notice is CartProductRemovalNotice => notice !== null)
          .slice(-10)
      : [];
    return { items, removedProducts };
  } catch {
    return EMPTY_CART_STATE;
  }
}

// Helper writeCartStorage : réalise le traitement métier associé.
export function writeCartStorage(state: PersistedCartState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (state.items.length === 0 && state.removedProducts.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: state.items,
        removedProducts: state.removedProducts.slice(-10),
      }),
    );
  } catch {
  }
}

// Supprime ou nettoie les éléments via clearCartStorage.
export function clearCartStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
  }
}
