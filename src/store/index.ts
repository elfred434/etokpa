import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './slices/cart/cartSlice';

/** Store Redux global — état client (CDC §8 impose Redux). */
export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
