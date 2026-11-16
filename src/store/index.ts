import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './slices/cart/cartSlice';
import negotiationReducer from './slices/negotiation/negotiationSlice';
import { readCartStorage, writeCartStorage } from '../utils/cartStorage';

/** Store Redux global — état client (CDC §8 impose Redux), avec persistance locale du panier. */
export function createAppStore() {
  const appStore = configureStore({
    reducer: {
      cart: cartReducer,
      negotiation: negotiationReducer,
    },
    preloadedState: {
      cart: readCartStorage(),
    },
  });

  let prevCart = appStore.getState().cart;
  appStore.subscribe(() => {
    const nextCart = appStore.getState().cart;
    if (nextCart !== prevCart) {
      prevCart = nextCart;
      writeCartStorage(nextCart);
    }
  });

  return appStore;
}

export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
