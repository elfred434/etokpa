import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Product } from '../../../types/models';

export interface CartProductRemovalNotice {
  id: string;
  name: string;
}

interface CartState {
  items: CartItem[];
  /** Produits supprimés du catalogue pendant qu'ils étaient encore dans le panier. */
  removedProducts: CartProductRemovalNotice[];
}

const initialState: CartState = { items: [], removedProducts: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    add(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const { product, quantity = 1 } = action.payload;
      const productId = String(product.id);
      state.removedProducts = state.removedProducts.filter((notice) => notice.id !== productId);
      const found = state.items.find((i) => i.product.id === product.id);
      if (found) found.quantite += quantity;
      else state.items.push({ product, quantite: quantity });
    },
    setQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find((i) => i.product.id === action.payload.productId);
      if (item) item.quantite = Math.max(1, action.payload.quantity);
    },
    remove(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.product.id !== action.payload);
    },
    productsDeletedFromCart(state, action: PayloadAction<CartProductRemovalNotice[]>) {
      const ids = new Set(action.payload.map((notice) => String(notice.id)));
      state.items = state.items.filter((item) => !ids.has(String(item.product.id)));
      const known = new Set(state.removedProducts.map((notice) => notice.id));
      for (const notice of action.payload) {
        const id = String(notice.id);
        if (known.has(id)) continue;
        state.removedProducts.push({ id, name: notice.name });
        known.add(id);
      }
      state.removedProducts = state.removedProducts.slice(-10);
    },
    clearProductRemovalNotices(state) {
      state.removedProducts = [];
    },
    clear(state) {
      state.items = [];
    },
  },
});

export const { add, setQuantity, remove, productsDeletedFromCart, clearProductRemovalNotices, clear } = cartSlice.actions;

/* ---------- Selectors ---------- */
export const selectCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantite, 0);
export const selectSubtotal = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.product.prix * i.quantite, 0);
export const selectSavings = (items: CartItem[]) =>
  items.reduce(
    (s, i) => s + (i.product.negotiated ? (i.product.negotiated.oldPrice - i.product.prix) * i.quantite : 0),
    0,
  );

export default cartSlice.reducer;
