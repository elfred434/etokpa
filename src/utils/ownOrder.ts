// Vérifie côté client qu’une commande appartient bien à l’utilisateur connecté.
import { ordersApi } from '../services/api';

// Transforme ou formate les données via parseOrderIdParam.
export function parseOrderIdParam(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/^[\s"']+|[\s"']+$/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Transforme ou formate les données via extractOrdersPage.
export function extractOrdersPage(res: unknown): {
  list: Array<Record<string, unknown> & { id?: number }>;
  lastPage: number;
} {
  const root = (res ?? {}) as Record<string, unknown>;
  const inner =
    root.data && !Array.isArray(root.data) && typeof root.data === 'object' && Array.isArray((root.data as Record<string, unknown>).data)
      ? (root.data as Record<string, unknown>)
      : root;
  const raw = (inner.data ?? inner ?? []) as Array<Record<string, unknown> & { data?: Record<string, unknown> & { id?: number } }>;
  const list = (Array.isArray(raw) ? raw : []).map((o) => ((o?.data && typeof o.data === 'object' ? o.data : o) as Record<string, unknown> & { id?: number }));
  const meta = (inner.meta ?? root.meta ?? {}) as Record<string, unknown>;
  const lastRaw = Number(meta.last_page ?? inner.last_page ?? root.last_page ?? 1);
  return {
    list,
    lastPage: Number.isFinite(lastRaw) && lastRaw >= 1 ? lastRaw : 1,
  };
}

// Vérifie la condition métier isOwnOrder.
export async function isOwnOrder(id: number, startPage = 1): Promise<boolean> {
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  let page = Math.max(1, startPage);
  let last = page;
  do {
    const res = await ordersApi.getOrders(page);
    const { list, lastPage } = extractOrdersPage(res);
    if (list.some((o) => Number(o.id) === Number(id))) return true;
    if (list.length === 0) break;
    last = lastPage;
    page += 1;
  } while (page <= last && page <= 20);
  return false;
}
