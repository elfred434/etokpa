import { useEffect, useRef, useState } from 'react';
import { store, } from '../store';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { add, clear } from '../store/slices/cart/cartSlice';
import { cartApi } from '../services/api';
import type { Product } from '../types/models';

interface ServerCartItem {
  product_id: number;
  nom: string;
  prix: number;
  quantite: number;
}

type LocalItem = { product: { id: string }; quantite: number };

/**
 * Synchronisation Panier Redux ⇄ Panier backend (Redis, clé `cart:{user_id}`).
 *
 *  - Au montage d'une session (token présent) : `GET /cart` — si le panier
 *    serveur est non vide et le panier local vide → hydrate Redux depuis le serveur.
 *  - À chaque mutation Redux (après hydratation) : diff local puis appels
 *    `POST /cart/add`, `PUT /cart/update`, `DELETE /cart/remove/{product_id}`
 *    (fire-and-forget : la UI ne bloque jamais, le backend reste la vérité).
 *
 * Le backend vide le panier lui-même à la création de commande (`POST /orders`).
 */
export function useCartSync(sessionKey: number): void {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const prevItemsRef = useRef<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  const localItems = (): LocalItem[] => store.getState().cart.items;

  // 1) Hydratation initiale depuis le serveur (une fois par session)
  useEffect(() => {
    if (sessionKey === 0) {
      setHydrated(false);
      return;
    }
    let cancelled = false;
    setHydrated(false);

    cartApi
      .getCart()
      .then((res) => {
        if (cancelled) return;
        const serverItems: ServerCartItem[] = res?.data ?? [];
        const local = localItems();

        if (serverItems.length > 0) {
          // Le serveur est la vérité : on aligne le Redux sur l'état serveur
          // (évite tout décalage local/serveur, ex. multi-appareils).
          dispatch(clear());
          for (const it of serverItems) {
            const product: Product = {
              id: String(it.product_id),
              nom: it.nom,
              prix: Number(it.prix),
              prixMinimum: 0,
              quantite: 'unité',
              origine: 'Marché TOKPa',
              categorie: 'vegetable',
              stock: 'available',
              badges: [],
            };
            dispatch(add({ product, quantity: it.quantite }));
          }
        } else if (local.length > 0) {
          // Panier serveur vide mais panier local non vide → on pousse le local au serveur
          for (const it of local) {
            cartApi.addToCart(Number(it.product.id), it.quantite).catch(() => undefined);
          }
        }
        prevItemsRef.current = snapshot(localItems());
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Backend indisponible : mode local uniquement.
        prevItemsRef.current = snapshot(localItems());
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, dispatch]);

  // 2) Diff Redux → appels API (après hydratation)
  useEffect(() => {
    if (!hydrated || sessionKey === 0) return;
    const current = snapshot(items as LocalItem[]);
    const prev = prevItemsRef.current;

    for (const [productId, qty] of Object.entries(current)) {
      const prevQty = prev[productId] ?? 0;
      if (qty > prevQty) {
        cartApi.addToCart(Number(productId), qty - prevQty).catch(() => undefined);
      } else if (qty < prevQty) {
        cartApi.updateCart(Number(productId), qty).catch(() => undefined);
      }
    }
    for (const productId of Object.keys(prev)) {
      if (!(productId in current)) {
        cartApi.removeFromCart(Number(productId)).catch(() => undefined);
      }
    }
    prevItemsRef.current = current;
  }, [items, hydrated, sessionKey]);
}

/** Snapshot {productId: quantite} du panier. */
function snapshot(items: LocalItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const it of items) map[it.product.id] = it.quantite;
  return map;
}
