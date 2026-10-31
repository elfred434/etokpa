// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import CartProductRemovalNotice from '../src/components/client/CartProductRemovalNotice';
import { store } from '../src/store';
import {
  clear,
  clearProductRemovalNotices,
  productsDeletedFromCart,
} from '../src/store/slices/cart/cartSlice';

function renderNotice() {
  return render(
    <Provider store={store}>
      <CartProductRemovalNotice />
    </Provider>,
  );
}

describe('CartProductRemovalNotice', () => {
  afterEach(() => {
    cleanup();
    store.dispatch(clear());
    store.dispatch(clearProductRemovalNotices());
    localStorage.clear();
  });

  it('announces a deleted product using the requested message and product name', () => {
    store.dispatch(productsDeletedFromCart([{ id: '1', name: 'Tomate' }]));

    renderNotice();

    expect(screen.getByRole('alert').textContent).toContain('Désolé ce produit a été supprimé.');
    expect(screen.getByRole('alert').textContent).toContain('Tomate');
  });

  it('announces multiple removed products and can be dismissed', () => {
    store.dispatch(productsDeletedFromCart([
      { id: '1', name: 'Tomate' },
      { id: '2', name: 'Riz' },
    ]));

    renderNotice();

    expect(screen.getByRole('alert').textContent).toContain('Désolé, ces produits ont été supprimés du panier.');
    expect(screen.getByRole('alert').textContent).toContain('Tomate, Riz');
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
