// Synchronise le panier local avec l’API serveur et signale les produits supprimés du catalogue.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { onGlobalRefresh } from '../services/refresh/refreshBus';
import { store } from '../store';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { add, clear, productsDeletedFromCart, type CartProductRemovalNotice } from '../store/slices/cart/cartSlice';
import { cartApi, catalogApi, type ApiProduct } from '../services/api';
import { absImageUrl } from '../utils/imageUrl';
import { tr, tx } from '../i18n/tx';
import type { CartItem, Product } from '../types/models';

interface ServerCartItem {
  product_id: number;
  nom: string;
  prix: number;
  quantite: number;
}

interface ProductSyncDetails {
  deleted: boolean;
  image?: string;
  categorie?: string;
  prixMinimum?: number;
}

// Helper responseStatus : réalise le traitement métier associé.
function responseStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

// Vérifie la condition métier isDeletedProductError.
function isDeletedProductError(error: unknown): boolean {
  const response = (error as {
    response?: { status?: number; data?: { errors?: Record<string, unknown>; message?: string } };
  } | null)?.response;
  if (response?.status === 404) return true;
  if (response?.status !== 422) return false;
  const errors = response.data?.errors;
  if (errors && Object.prototype.hasOwnProperty.call(errors, 'product_id')) return true;
  const message = String(response.data?.message ?? '').toLowerCase();
  return /product[_ ]id/.test(message) && /(invalid|selected|exist|not found)/.test(message);
}

// Récupère et normalise les données pour fetchProductDetails.
async function fetchProductDetails(productId: number): Promise<ProductSyncDetails> {
  try {
    const res = await catalogApi.getProduct(productId);
    const body = res?.data ?? res;
    const p = (body?.data ?? body) as ApiProduct | undefined;
    return {
      deleted: false,
      image: absImageUrl(p?.image_url ?? p?.img_url) ?? undefined,
      categorie: p?.categorie?.nom,
      prixMinimum: p?.prix_minimum != null ? Number(p.prix_minimum) : undefined,
    };
  } catch (error) {
    return { deleted: responseStatus(error) === 404 };
  }
}

// Helper registerDeletedProducts : réalise le traitement métier associé.
function registerDeletedProducts(notices: CartProductRemovalNotice[]) {
  if (!notices.length) return;
  const known = new Set(store.getState().cart.removedProducts.map((notice) => notice.id));
  const fresh = notices.filter((notice) => !known.has(String(notice.id)));
  store.dispatch(productsDeletedFromCart(notices));
  if (fresh.length) {
    toast.error(
      fresh.length === 1
        ? tr('Désolé ce produit a été supprimé.', 'Sorry, this product has been removed.')
        : tr('Désolé, ces produits ont été supprimés du panier.', 'Sorry, these products have been removed from your cart.'),
    );
  }
}

// Helper deletedNotice : réalise le traitement métier associé.
function deletedNotice(id: number | string, name?: string): CartProductRemovalNotice {
  return { id: String(id), name: name?.trim() || tx('Produit supprimé') };
}

// Supprime ou nettoie les éléments via removeDeletedProduct.
function removeDeletedProduct(id: number | string) {
  const key = String(id);
  const item = store.getState().cart.items.find((line) => String(line.product.id) === key);
  registerDeletedProducts([deletedNotice(key, item?.product.nom)]);
}

// Hook React useCartSync : encapsule l’état et les effets associés.
export function useCartSync(sessionKey: number): void {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const prevItemsRef = useRef<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [revision, setRevision] = useState(0);

  // Exécute l’effet de bord React lors du montage ou de la mise à jour des dépendances.
  useEffect(() => onGlobalRefresh(() => setRevision((r) => r + 1)), []);

  const localItems = (): CartItem[] => store.getState().cart.items;

  // Charge ou synchronise les données depuis l’API au montage ou lors d’un changement de dépendance.
  useEffect(() => {
    if (sessionKey === 0) {
      setHydrated(false);
      return;
    }
    let cancelled = false;
    setHydrated(false);

    cartApi
      .getCart()
      .then(async (res) => {
        if (cancelled) return;
        const serverItems: ServerCartItem[] = res?.data ?? [];
        const local = localItems();

        if (serverItems.length > 0) {
          const details = await Promise.all(serverItems.map((it) => fetchProductDetails(it.product_id)));
          if (cancelled) return;
          const deleted = serverItems.filter((_, index) => details[index].deleted);
          const available = serverItems
            .map((item, index) => ({ item, details: details[index] }))
            .filter((entry) => !entry.details.deleted);

          const localById = new Map(local.map((it) => [String(it.product.id), it]));
          const serverIds = new Set(serverItems.map((it) => String(it.product_id)));
          const guestExtras =
            sessionKey > 1
              ? local.filter((it) => !serverIds.has(String(it.product.id)))
              : [];
          const extraDetails = guestExtras.length
            ? await Promise.all(guestExtras.map((it) => fetchProductDetails(Number(it.product.id))))
            : [];
          if (cancelled) return;

          const deletedExtras = guestExtras.filter((_, index) => extraDetails[index].deleted);
          const availableExtras = guestExtras.filter((_, index) => !extraDetails[index].deleted);

          dispatch(clear());
          if (deleted.length > 0 || deletedExtras.length > 0) {
            registerDeletedProducts([
              ...deleted.map((item) => deletedNotice(item.product_id, item.nom)),
              ...deletedExtras.map((it) => deletedNotice(it.product.id, it.product.nom)),
            ]);
            deleted.forEach((item) => {
              void cartApi.removeFromCart(item.product_id).catch(() => undefined);
            });
          }

          available.forEach(({ item, details: productDetails }) => {
            const localMatch = localById.get(String(item.product_id))?.product;
            const product: Product = {
              id: String(item.product_id),
              nom: item.nom,
              prix: Number(item.prix),
              prixMinimum: productDetails.prixMinimum ?? localMatch?.prixMinimum ?? 0,
              quantite: localMatch?.quantite ?? '',
              origine: productDetails.categorie ?? localMatch?.origine ?? '',
              categorie: localMatch?.categorie ?? 'vegetable',
              stock: 'available',
              badges: localMatch?.badges ?? [],
              image: productDetails.image ?? localMatch?.image,
              ...(localMatch?.negotiated ? { negotiated: localMatch.negotiated } : {}),
            };
            dispatch(add({ product, quantity: item.quantite }));
          });

          availableExtras.forEach((it) => {
            dispatch(add({ product: it.product, quantity: it.quantite }));
            const id = Number(it.product.id);
            cartApi.addToCart(id, it.quantite).catch((error) => {
              if (isDeletedProductError(error)) removeDeletedProduct(id);
            });
          });
        } else if (local.length > 0) {
          const details = await Promise.all(local.map((it) => fetchProductDetails(Number(it.product.id))));
          if (cancelled) return;
          const deleted = local.filter((_, index) => details[index].deleted);
          if (deleted.length > 0) {
            registerDeletedProducts(deleted.map((it) => deletedNotice(it.product.id, it.product.nom)));
          }
          const available = local.filter((_, index) => !details[index].deleted);
          for (const it of available) {
            const id = Number(it.product.id);
            cartApi.addToCart(id, it.quantite).catch((error) => {
              if (isDeletedProductError(error)) removeDeletedProduct(id);
            });
          }
        }
        prevItemsRef.current = snapshot(localItems());
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        prevItemsRef.current = snapshot(localItems());
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, dispatch, revision]);

  // Charge ou synchronise les données depuis l’API au montage ou lors d’un changement de dépendance.
  useEffect(() => {
    if (!hydrated || sessionKey === 0) return;
    const current = snapshot(items);
    const prev = prevItemsRef.current;

    for (const [productId, qty] of Object.entries(current)) {
      const prevQty = prev[productId] ?? 0;
      if (qty > prevQty) {
        cartApi.addToCart(Number(productId), qty - prevQty).catch((error) => {
          if (isDeletedProductError(error)) removeDeletedProduct(productId);
        });
      } else if (qty < prevQty) {
        cartApi.updateCart(Number(productId), qty).catch((error) => {
          if (isDeletedProductError(error)) removeDeletedProduct(productId);
        });
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

// Helper snapshot : réalise le traitement métier associé.
function snapshot(items: CartItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const it of items) map[it.product.id] = it.quantite;
  return map;
}
