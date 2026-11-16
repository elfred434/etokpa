// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

const mocks = vi.hoisted(() => ({
  getCart: vi.fn(),
  getProduct: vi.fn(),
  addToCart: vi.fn(),
  updateCart: vi.fn(),
  removeFromCart: vi.fn(),
  onGlobalRefresh: vi.fn(),
  toastError: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../src/services/api', () => ({
  cartApi: {
    getCart: mocks.getCart,
    addToCart: mocks.addToCart,
    updateCart: mocks.updateCart,
    removeFromCart: mocks.removeFromCart,
  },
  catalogApi: { getProduct: mocks.getProduct },
}));
vi.mock('../src/services/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: mocks.post,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../src/services/realtime/echo', () => ({
  initEcho: vi.fn(),
  shutdownEcho: vi.fn(),
  windowEcho: () => null,
}));
vi.mock('../src/services/refresh/refreshBus', () => ({ onGlobalRefresh: mocks.onGlobalRefresh }));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.toastError } }));

import { createAppStore } from '../src/store';
import { add, clear, remove, setQuantity } from '../src/store/slices/cart/cartSlice';
import { CART_STORAGE_KEY, readCartStorage } from '../src/utils/cartStorage';
import { authApi } from '../src/services/api/auth';
import { useCartSync } from '../src/hooks/useCartSync';
import type { Product } from '../src/types/models';

const sampleProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '10',
  nom: 'Igname pilée',
  prix: 1500,
  prixMinimum: 1200,
  quantite: '1 tas',
  origine: 'Dantokpa',
  categorie: 'vegetable',
  stock: 'available',
  badges: [],
  ...overrides,
});

describe('cart localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.getCart.mockReset().mockResolvedValue({ data: [] });
    mocks.getProduct.mockReset();
    mocks.addToCart.mockReset().mockResolvedValue({});
    mocks.updateCart.mockReset().mockResolvedValue({});
    mocks.removeFromCart.mockReset().mockResolvedValue({});
    mocks.onGlobalRefresh.mockReset().mockReturnValue(() => undefined);
    mocks.toastError.mockReset();
    mocks.post.mockReset().mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists cart additions, quantity updates, and removals across store reloads', () => {
    const firstSession = createAppStore();
    firstSession.dispatch(
      add({
        product: sampleProduct({ prix: 1200, negotiated: { oldPrice: 1500 } }),
        quantity: 2,
      }),
    );
    firstSession.dispatch(setQuantity({ productId: '10', quantity: 3 }));
    firstSession.dispatch(add({ product: sampleProduct({ id: '11', nom: 'Tomate' }), quantity: 1 }));
    firstSession.dispatch(remove('11'));

    expect(localStorage.getItem(CART_STORAGE_KEY)).not.toBeNull();

    // Simule un rafraîchissement complet ou une réouverture du site.
    const reopenedSession = createAppStore();
    expect(reopenedSession.getState().cart.items).toHaveLength(1);
    expect(reopenedSession.getState().cart.items[0].product.id).toBe('10');
    expect(reopenedSession.getState().cart.items[0].quantite).toBe(3);
    expect(reopenedSession.getState().cart.items[0].product.negotiated).toEqual({ oldPrice: 1500 });

    reopenedSession.dispatch(clear());
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('ignores corrupted cart storage payloads safely', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{invalid-json');
    expect(readCartStorage()).toEqual({ items: [], removedProducts: [] });

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [{ bad: true }], removedProducts: null }));
    expect(readCartStorage()).toEqual({ items: [], removedProducts: [] });
  });

  it('clears persisted cart and delivery draft on logout', async () => {
    localStorage.setItem('tokpa_token', 'tok');
    localStorage.setItem('tokpa_user', JSON.stringify({ id: 1, role: 'client' }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [{ product: sampleProduct(), quantite: 1 }], removedProducts: [] }));
    localStorage.setItem('tokpa_cart_lieu', JSON.stringify({ zoneId: 2 }));

    await authApi.logout();

    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('tokpa_cart_lieu')).toBeNull();
  });

  it('merges guest-added items with server cart on fresh login', async () => {
    const { store } = await import('../src/store');
    store.dispatch(clear());
    store.dispatch(add({ product: sampleProduct({ id: '20', nom: 'Gari' }), quantity: 2 }));

    mocks.getCart.mockResolvedValue({
      data: [{ product_id: 10, nom: 'Igname pilée', prix: 1500, quantite: 1 }],
    });
    mocks.getProduct.mockResolvedValue({ data: { image_url: 'https://cdn.test/item.webp' } });

    function Harness() {
      useCartSync(1700000000000);
      return null;
    }

    const view = render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await waitFor(() => expect(mocks.addToCart).toHaveBeenCalledWith(20, 2));
    expect(store.getState().cart.items.map((item) => item.product.id)).toEqual(['10', '20']);
    view.unmount();
    store.dispatch(clear());
  });
});
