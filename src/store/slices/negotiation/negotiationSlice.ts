import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type NegotiationStatus = 'idle' | 'pending' | 'accepted' | 'counter_offer' | 'rejected' | 'expired';

export interface NegotiationItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  originalPrice: number;
  proposedPrice: number;
  counterPrice?: number;
  minPrice: number;
  status: NegotiationStatus;
  createdAt: string;
}

interface NegotiationState {
  activeNegotiations: Record<string, NegotiationItem>; // key: productId
  history: NegotiationItem[];
}

const INITIAL_NEGOTIATION: NegotiationItem = {
  id: 'neg_101',
  productId: 'p12',
  productName: 'Pack légumes 5 variétés',
  productImage: '/images/brand/photo-tomates.png',
  originalPrice: 500,
  proposedPrice: 380,
  minPrice: 350,
  status: 'accepted',
  createdAt: 'Aujourd\'hui, 10:15',
};

const initialState: NegotiationState = {
  activeNegotiations: {
    p12: INITIAL_NEGOTIATION,
  },
  history: [INITIAL_NEGOTIATION],
};

const negotiationSlice = createSlice({
  name: 'negotiation',
  initialState,
  reducers: {
    submitOffer(
      state,
      action: PayloadAction<{
        productId: string;
        productName: string;
        productImage?: string;
        originalPrice: number;
        proposedPrice: number;
        minPrice: number;
      }>
    ) {
      const { productId, productName, productImage, originalPrice, proposedPrice, minPrice } = action.payload;

      let status: NegotiationStatus = 'pending';
      let counterPrice: number | undefined = undefined;

      if (proposedPrice >= minPrice) {
        status = 'accepted';
      } else if (proposedPrice >= minPrice * 0.85) {
        status = 'counter_offer';
        counterPrice = Math.round((minPrice + originalPrice) / 2);
      } else {
        status = 'rejected';
        counterPrice = minPrice;
      }

      const item: NegotiationItem = {
        id: `neg_${Date.now()}`,
        productId,
        productName,
        productImage,
        originalPrice,
        proposedPrice,
        counterPrice,
        minPrice,
        status,
        createdAt: 'À l\'instant',
      };

      state.activeNegotiations[productId] = item;
      state.history.unshift(item);
    },
    acceptCounterOffer(state, action: PayloadAction<{ productId: string }>) {
      const { productId } = action.payload;
      const neg = state.activeNegotiations[productId];
      if (neg && neg.counterPrice) {
        neg.status = 'accepted';
        neg.proposedPrice = neg.counterPrice;
      }
    },
    cancelNegotiation(state, action: PayloadAction<{ productId: string }>) {
      delete state.activeNegotiations[action.payload];
    },
  },
});

export const { submitOffer, acceptCounterOffer, cancelNegotiation } = negotiationSlice.actions;

export default negotiationSlice.reducer;
