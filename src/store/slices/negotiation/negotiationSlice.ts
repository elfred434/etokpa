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
  status: NegotiationStatus;
  createdAt: string;
}

interface NegotiationState {
  activeNegotiations: Record<string, NegotiationItem>; // key: productId
  history: NegotiationItem[];
}

const INITIAL_NEGOTIATIONS: NegotiationItem[] = [
  {
    id: 'neg_101',
    productId: 'p101',
    productName: 'Sac de Riz Parboiled 50kg',
    vendorName: 'Agro-Business Bénin',
    originalPrice: 24500,
    proposedPrice: 21000,
    minPrice: 20000,
    status: 'pending',
    createdAt: 'Il y a 10 min',
  },
  {
    id: 'neg_102',
    productId: 'p102',
    productName: 'Lot d’Ananas Pain de Sucre (x10)',
    vendorName: 'Maman Africa Fruits',
    originalPrice: 4500,
    proposedPrice: 3800,
    counterPrice: 4100,
    minPrice: 3900,
    status: 'counter_offer',
    createdAt: 'Il y a 1 heure',
  },
  {
    id: 'neg_103',
    productId: 'p103',
    productName: 'Huile d’Arachide Pure 5L',
    vendorName: 'Sodeco-Bénin',
    originalPrice: 8000,
    proposedPrice: 7200,
    minPrice: 7000,
    status: 'accepted',
    createdAt: 'Aujourd’hui, 09:30',
  },
  {
    id: 'neg_104',
    productId: 'p12',
    productName: 'Pack légumes 5 variétés',
    vendorName: 'Marché Dantokpa',
    originalPrice: 500,
    proposedPrice: 380,
    minPrice: 350,
    status: 'accepted',
    createdAt: 'Aujourd’hui, 10:15',
  },
];

const initialState: NegotiationState = {
  activeNegotiations: Object.fromEntries(INITIAL_NEGOTIATIONS.map((n) => [n.productId, n])),
  history: INITIAL_NEGOTIATIONS,
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
        vendorName?: string;
        originalPrice: number;
        proposedPrice: number;
        minPrice: number;
      }>
    ) {
      const { productId, productName, productImage, vendorName, originalPrice, proposedPrice, minPrice } = action.payload;

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
        vendorName: vendorName || 'Marché Dantokpa',
        originalPrice,
        proposedPrice,
        counterPrice,
        minPrice,
        status,
        createdAt: 'À l’instant',
      };

      state.activeNegotiations[productId] = item;
      // Remplace if existing or unshift
      const existingIndex = state.history.findIndex((h) => h.productId === productId);
      if (existingIndex >= 0) {
        state.history[existingIndex] = item;
      } else {
        state.history.unshift(item);
      }
    },
    acceptCounterOffer(state, action: PayloadAction<{ productId: string }>) {
      const { productId } = action.payload;
      const neg = state.activeNegotiations[productId];
      if (neg && neg.counterPrice) {
        neg.status = 'accepted';
        neg.proposedPrice = neg.counterPrice;
      }
      const histItem = state.history.find((h) => h.productId === productId);
      if (histItem && histItem.counterPrice) {
        histItem.status = 'accepted';
        histItem.proposedPrice = histItem.counterPrice;
      }
    },
    cancelNegotiation(state, action: PayloadAction<{ productId: string }>) {
      delete state.activeNegotiations[action.payload];
      state.history = state.history.filter((h) => h.productId !== action.payload);
    },
  },
});

export const { submitOffer, acceptCounterOffer, cancelNegotiation } = negotiationSlice.actions;

export default negotiationSlice.reducer;
