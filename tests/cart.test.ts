import { describe, expect, it } from 'vitest';
import reducer, {
  add,
  clear,
  clearProductRemovalNotices,
  productsDeletedFromCart,
  remove,
  selectCount,
  selectSavings,
  selectSubtotal,
  setQuantity,
} from '../src/store/slices/cart/cartSlice';
import type { Product } from '../src/types/models';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  nom: 'Riz',
  prix: 1000,
  image: '',
  description: '',
  categorie: 'vegetable',
  stock: 'available',
  badges: [],
  origine: '',
  quantite: '',
  prixMinimum: 0,
  ...overrides,
});

describe('cart selectors and reducer', () => {
  it('adds and merges quantities', () => {
    let state = reducer(undefined, add({ product: product(), quantity: 2 }));
    state = reducer(state, add({ product: product(), quantity: 3 }));
    expect(selectCount(state.items)).toBe(5);
    expect(selectSubtotal(state.items)).toBe(5000);
  });

  it('never allows quantity below one', () => {
    const initial = reducer(undefined, add({ product: product(), quantity: 2 }));
    const state = reducer(initial, setQuantity({ productId: 'p1', quantity: 0 }));
    expect(state.items[0].quantite).toBe(1);
  });

  it('calculates negotiated savings', () => {
    expect(selectSavings([
      { product: product({ prix: 800, negotiated: { oldPrice: 1000 } }), quantite: 2 },
    ])).toBe(400);
  });

  it('removes and clears items', () => {
    let state = reducer(undefined, add({ product: product() }));
    state = reducer(state, remove('p1'));
    expect(state.items).toHaveLength(0);
    state = reducer(state, add({ product: product() }));
    expect(reducer(state, clear()).items).toHaveLength(0);
  });

  it('removes deleted products from the cart and keeps a single notice per product', () => {
    let state = reducer(undefined, add({ product: product(), quantity: 2 }));
    state = reducer(state, add({ product: product({ id: 'p2', nom: 'Tomate' }) }));
    const notice = { id: 'p1', name: 'Riz' };

    state = reducer(state, productsDeletedFromCart([notice]));
    state = reducer(state, productsDeletedFromCart([notice]));

    expect(state.items.map((item) => item.product.id)).toEqual(['p2']);
    expect(state.removedProducts).toEqual([notice]);
  });

  it('clears a deletion notice when the same product is added again', () => {
    let state = reducer(undefined, productsDeletedFromCart([{ id: 'p1', name: 'Riz' }]));
    state = reducer(state, add({ product: product() }));
    expect(state.removedProducts).toEqual([]);
    expect(state.items).toHaveLength(1);
  });

  it('clears notices independently of cart items', () => {
    let state = reducer(undefined, add({ product: product() }));
    state = reducer(state, productsDeletedFromCart([{ id: 'p2', name: 'Tomate' }]));
    state = reducer(state, clearProductRemovalNotices());
    expect(state.removedProducts).toEqual([]);
    expect(state.items.map((item) => item.product.id)).toEqual(['p1']);
  });
});
