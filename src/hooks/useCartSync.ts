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

function responseStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/** Laravel renvoie 422 avec `errors.product_id` si le produit a été supprimé juste avant l'ajout. */
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

/**
 * Le panier serveur (`GET /cart`) ne contient pas d'image : on la reprend du produit
 * (`GET /products/{id}` → `image_url`). Un 404 distingue maintenant un produit supprimé
 * d'une simple panne réseau, afin de purger sa ligne du panier sans perdre les autres.
 */
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

function deletedNotice(id: number | string, name?: string): CartProductRemovalNotice {
  return { id: String(id), name: name?.trim() || tx('Produit supprimé') };
}

function removeDeletedProduct(id: number | string) {
  const key = String(id);
  const item = store.getState().cart.items.find((line) => String(line.product.id) === key);
  // La mutation Redux déclenche ensuite le diff qui purge également le cache serveur.
  registerDeletedProducts([deletedNotice(key, item?.product.nom)]);
}

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
  // Incrémenté à chaque rafraîchissement global (bouton / silencieux) : rejoue
  // l'hydratation ci-dessous sans toucher au reste de l'application.
  const [revision, setRevision] = useState(0);

  useEffect(() => onGlobalRefresh(() => setRevision((r) => r + 1)), []);

  const localItems = (): CartItem[] => store.getState().cart.items;

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
      .then(async (res) => {
        if (cancelled) return;
        const serverItems: ServerCartItem[] = res?.data ?? [];
        const local = localItems();

        if (serverItems.length > 0) {
          // Le panier serveur ne porte pas les images; on vérifie aussi que chaque produit existe encore.
          const details = await Promise.all(serverItems.map((it) => fetchProductDetails(it.product_id)));
          if (cancelled) return;
          const deleted = serverItems.filter((_, index) => details[index].deleted);
          const available = serverItems
            .map((item, index) => ({ item, details: details[index] }))
            .filter((entry) => !entry.details.deleted);

          // Redis garde les anciennes données du panier même si l'admin a supprimé le produit.
          // On retire ces lignes du client et du cache serveur sans toucher aux autres articles.
          dispatch(clear());
          if (deleted.length > 0) {
            registerDeletedProducts(deleted.map((item) => deletedNotice(item.product_id, item.nom)));
            deleted.forEach((item) => {
              void cartApi.removeFromCart(item.product_id).catch(() => undefined);
            });
          }

          // Le serveur reste la vérité pour le reste du panier (multi-appareils).
          available.forEach(({ item, details: productDetails }) => {
            const product: Product = {
              id: String(item.product_id),
              nom: item.nom,
              prix: Number(item.prix),
              prixMinimum: productDetails.prixMinimum ?? 0,
              quantite: '',
              origine: productDetails.categorie ?? '',
              categorie: 'vegetable',
              stock: 'available',
              badges: [],
              image: productDetails.image,
            };
            dispatch(add({ product, quantity: item.quantite }));
          });
        } else if (local.length > 0) {
          // Panier serveur vide mais panier local non vide : vérifier avant de le pousser.
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
        // Backend indisponible : mode local uniquement.
        prevItemsRef.current = snapshot(localItems());
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, dispatch, revision]);

  // 2) Diff Redux → appels API (après hydratation)
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

/** Snapshot {productId: quantite} du panier. */
function snapshot(items: CartItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const it of items) map[it.product.id] = it.quantite;
  return map;
}
