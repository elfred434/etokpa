// Gère l’état Redux des propositions de budget et contre-propositions côté client.
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type NegotiationStatus = 'idle' | 'pending' | 'accepted' | 'counter_offer' | 'rejected' | 'expired';

export interface NegotiationItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  vendorName?: string;
  originalPrice: number;
  proposedPrice: number;
  counterPrice?: number;
  minPrice: number;
  quantite?: number;
  orderId?: number;
  adminResponse?: string;
  expiresAt?: string;
  landmarkId?: number;
  landmarkNom?: string;
  landmarkZone?: string;
  status: NegotiationStatus;
  createdAt: string;
}

interface NegotiationState {
  activeNegotiations: Record<string, NegotiationItem>;
  history: NegotiationItem[];
}

const initialState: NegotiationState = {
  activeNegotiations: {},
  history: [],
};

// Slice Redux negotiationSlice : définit l’état initial et les actions associées.
const negotiationSlice = createSlice({
  name: 'negotiation',
  initialState,
  reducers: {
    setProposals(state, action: PayloadAction<NegotiationItem[]>) {
      state.history = action.payload;
      const latestByProduct: Record<string, NegotiationItem> = {};
      for (const item of action.payload) {
        if (!item.productId) continue;
        if (!latestByProduct[item.productId]) {
          latestByProduct[item.productId] = item;
        }
      }
      state.activeNegotiations = latestByProduct;
    },
    submitOffer(
      state,
      action: PayloadAction<{
        id?: string;
        productId: string;
        productName: string;
        productImage?: string;
        vendorName?: string;
        originalPrice: number;
        proposedPrice: number;
        minPrice: number;
        quantite?: number;
      }>
    ) {
      const { id, productId, productName, productImage, vendorName, originalPrice, proposedPrice, minPrice, quantite } = action.payload;

      const status: NegotiationStatus = 'pending';
      const counterPrice: number | undefined = undefined;

      const item: NegotiationItem = {
        id: id || `neg_${Date.now()}`,
        productId,
        productName,
        productImage,
        vendorName: vendorName ?? '',
        originalPrice,
        proposedPrice,
        counterPrice,
        minPrice,
        quantite: quantite ?? 1,
        status,
        createdAt: 'À l’instant',
      };

      state.activeNegotiations[productId] = item;
      const existingIndex = state.history.findIndex((h) => h.productId === productId);
      if (existingIndex >= 0) {
        state.history[existingIndex] = item;
      } else {
        state.history.unshift(item);
      }
    },
    acceptCounterOffer(state, action: PayloadAction<{ productId: string }>) {
      const { productId } = action.payload;
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const neg = state.activeNegotiations[productId];
      if (neg && neg.counterPrice) {
        neg.status = 'accepted';
        neg.proposedPrice = neg.counterPrice;
        neg.expiresAt = expiresAt;
      }
      const histItem = state.history.find((h) => h.productId === productId);
      if (histItem && histItem.counterPrice) {
        histItem.status = 'accepted';
        histItem.proposedPrice = histItem.counterPrice;
        histItem.expiresAt = expiresAt;
      }
    },
    cancelNegotiation(state, action: PayloadAction<{ productId: string }>) {
      delete state.activeNegotiations[action.payload.productId];
      state.history = state.history.filter((h) => h.productId !== action.payload.productId);
    },
  },
});

export const { setProposals, submitOffer, acceptCounterOffer, cancelNegotiation } = negotiationSlice.actions;

export default negotiationSlice.reducer;
