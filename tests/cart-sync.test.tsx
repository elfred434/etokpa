// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

const mocks = vi.hoisted(() => ({
  getCart: vi.fn(),
  getProduct: vi.fn(),
  addToCart: vi.fn(),
  updateCart: vi.fn(),
  removeFromCart: vi.fn(),
  onGlobalRefresh: vi.fn(),
  toastError: vi.fn(),
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
vi.mock('../src/services/refresh/refreshBus', () => ({ onGlobalRefresh: mocks.onGlobalRefresh }));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.toastError } }));

import { useCartSync } from '../src/hooks/useCartSync';
import { store } from '../src/store';
import { add, clear, clearProductRemovalNotices } from '../src/store/slices/cart/cartSlice';
import type { Product } from '../src/types/models';

function CartSyncHarness() {
  useCartSync(1);
  return null;
}

function renderCartSync() {
  return render(
    <Provider store={store}>
      <CartSyncHarness />
    </Provider>,
  );
}

const product = (id: string, nom: string): Product => ({
  id,
  nom,
  prix: 500,
  prixMinimum: 0,
  quantite: '',
  origine: '',
  categorie: 'vegetable',
  stock: 'available',
  badges: [],
});

describe('useCartSync deleted-product handling', () => {
  beforeEach(() => {
    store.dispatch(clear());
    store.dispatch(clearProductRemovalNotices());
    localStorage.clear();
    mocks.getCart.mockReset().mockResolvedValue({ data: [] });
    mocks.getProduct.mockReset();
    mocks.addToCart.mockReset().mockResolvedValue({});
    mocks.updateCart.mockReset().mockResolvedValue({});
    mocks.removeFromCart.mockReset().mockResolvedValue({});
    mocks.onGlobalRefresh.mockReset().mockReturnValue(() => undefined);
    mocks.toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('removes server-cart products that return 404 without treating a 500 as deletion', async () => {
    mocks.getCart.mockResolvedValue({
      data: [
        { product_id: 1, nom: 'Tomate supprimée', prix: 400, quantite: 2 },
        { product_id: 2, nom: 'Riz', prix: 1000, quantite: 1 },
        { product_id: 3, nom: 'Piment', prix: 300, quantite: 1 },
      ],
    });
    mocks.getProduct.mockImplementation((id: number) => {
      if (id === 1) return Promise.reject({ response: { status: 404 } });
      if (id === 3) return Promise.reject({ response: { status: 500 } });
      return Promise.resolve({ data: { image_url: 'https://cdn.test/riz.webp' } });
    });

    const view = renderCartSync();
    await waitFor(() => expect(mocks.removeFromCart).toHaveBeenCalledWith(1));

    expect(store.getState().cart.items.map((item) => item.product.id)).toEqual(['2', '3']);
    expect(store.getState().cart.removedProducts).toEqual([
      { id: '1', name: 'Tomate supprimée' },
    ]);
    expect(mocks.removeFromCart).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledWith('Désolé ce produit a été supprimé.');
    view.unmount();
  });

  it('removes a product rejected by the add endpoint with a 422 product_id validation error', async () => {
    mocks.addToCart.mockRejectedValueOnce({
      response: {
        status: 422,
        data: { errors: { product_id: ['The selected product id is invalid.'] } },
      },
    });

    const view = renderCartSync();
    await waitFor(() => expect(mocks.getCart).toHaveBeenCalledTimes(1));

    act(() => {
      store.dispatch(add({ product: product('42', 'Piment'), quantity: 1 }));
    });

    await waitFor(() => {
      expect(store.getState().cart.items).toHaveLength(0);
      expect(store.getState().cart.removedProducts).toEqual([{ id: '42', name: 'Piment' }]);
      expect(mocks.removeFromCart).toHaveBeenCalledWith(42);
    });
    expect(mocks.toastError).toHaveBeenCalledWith('Désolé ce produit a été supprimé.');
    view.unmount();
  });
});
