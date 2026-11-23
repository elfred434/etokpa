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
  /** Quantité proposée (backend `quantite`). */
  quantite?: number;
  /** Commande créée à l'acceptation, si l'API la renvoie ou si elle est retrouvée. */
  orderId?: number;
  /** Réponse/justification de l'admin (backend `admin_response`). */
  adminResponse?: string;
  /** Date ISO de fin de validité (12 h après acceptation). */
  expiresAt?: string;
  /** Point de repère choisi par le client (API si présent, sinon mémoire locale). */
  landmarkId?: number;
  landmarkNom?: string;
  landmarkZone?: string;
  status: NegotiationStatus;
  createdAt: string;
}

interface NegotiationState {
  activeNegotiations: Record<string, NegotiationItem>; // key: productId
  history: NegotiationItem[];
}

const initialState: NegotiationState = {
  activeNegotiations: {},
  history: [],
};

const negotiationSlice = createSlice({
  name: 'negotiation',
  initialState,
  reducers: {
    setProposals(state, action: PayloadAction<NegotiationItem[]>) {
      state.history = action.payload;
      // L'API renvoie `latest()` (plus récent en premier) : conserver la première occurrence par produit
      // pour ne pas écraser une nouvelle offre par une ancienne offre expirée/refusée.
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

      // L'offre part à l'administrateur (POST /budget-proposals, CDC §4.1 : il accepte ou refuse) : elle
      // reste « en attente » jusqu'à sa réponse réelle (GET /budget-proposals + temps réel
      // budget.responded). Plus de réponse inventée côté front (acceptée / contre-offre / refusée).
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
