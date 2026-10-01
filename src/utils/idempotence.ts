/**
 * Idempotence côté écran.
 * Le backend crée une commande et un paiement à chaque POST. Un second clic, ou un
 * rechargement pendant l'envoi, ne doit pas relancer ce POST si la tentative est la même.
 * La clé Idempotency-Key est envoyée pour le jour où le backend la respectera.
 */

const CHECKOUT_KEY = 'tokpa_checkout_intent';
const PAYMENT_KEY = 'tokpa_payment_intents';
const ATTEMPT_MS = 2 * 60 * 1000;
const PENDING_MS = 20 * 1000;

export type CartLine = { product_id: number; quantite: number };

export type CheckoutIntent = {
  key: string;
  idempotencyKey: string;
  orderId?: number;
  total?: number;
  zoneNom?: string;
  landmarkNom?: string;
  nbItems?: number;
  paymentId?: number;
  paymentRef?: string;
  redirectUrl?: string;
  currency?: string;
  pending?: boolean;
  savedAt: number;
};

export type PaymentIntent = {
  orderId: number;
  idempotencyKey: string;
  paymentId?: number;
  paymentRef?: string;
  redirectUrl?: string;
  currency?: string;
  savedAt: number;
};

export function checkoutFingerprint(lines: CartLine[], landmarkId: number, description?: string): string {
  const items = [...lines]
    .map((line) => `${line.product_id}:${line.quantite}`)
    .sort()
    .join(',');
  return `${items}|lm:${landmarkId}|d:${(description ?? '').trim()}`;
}

function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `tokpa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadCheckoutIntent(): CheckoutIntent | null {
  const data = readJson<CheckoutIntent>(CHECKOUT_KEY);
  if (!data?.savedAt || !data.key) return null;
  if (Date.now() - data.savedAt > ATTEMPT_MS) {
    sessionStorage.removeItem(CHECKOUT_KEY);
    return null;
  }
  return data;
}

export function saveCheckoutIntent(intent: CheckoutIntent): void {
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify({ ...intent, savedAt: intent.savedAt || Date.now() }));
}

export function clearCheckoutIntent(): void {
  sessionStorage.removeItem(CHECKOUT_KEY);
}

/** Même panier, même repère, tentative encore ouverte. */
export function sameAttempt(intent: CheckoutIntent | null, key: string): intent is CheckoutIntent {
  return !!intent && intent.key === key && Date.now() - intent.savedAt < ATTEMPT_MS;
}

/** Le POST est parti, la réponse n'est pas encore là. On ne relance pas. */
export function attemptStillPending(intent: CheckoutIntent | null, key: string): boolean {
  return sameAttempt(intent, key) && !intent.orderId && !!intent.pending && Date.now() - intent.savedAt < PENDING_MS;
}

/**
 * Démarre ou reprend une tentative. La clé Idempotency-Key ne change pas tant que
 * cette tentative n'a pas de numéro de commande.
 */
export function beginCheckout(key: string): CheckoutIntent {
  const existing = loadCheckoutIntent();
  if (existing && existing.key === key) {
    const next = { ...existing, pending: !existing.orderId };
    saveCheckoutIntent(next);
    return next;
  }
  const fresh: CheckoutIntent = {
    key,
    idempotencyKey: newKey(),
    pending: true,
    savedAt: Date.now(),
  };
  saveCheckoutIntent(fresh);
  return fresh;
}

function loadPayments(): PaymentIntent[] {
  const rows = readJson<PaymentIntent[]>(PAYMENT_KEY) ?? [];
  const fresh = rows.filter((row) => row.orderId && Date.now() - row.savedAt < ATTEMPT_MS);
  if (fresh.length !== rows.length) sessionStorage.setItem(PAYMENT_KEY, JSON.stringify(fresh));
  return fresh;
}

export function loadPayment(orderId: number): PaymentIntent | null {
  return loadPayments().find((row) => row.orderId === orderId) ?? null;
}

export function rememberPayment(row: Omit<PaymentIntent, 'savedAt' | 'idempotencyKey'> & { idempotencyKey?: string }): PaymentIntent {
  const previous = loadPayment(row.orderId);
  const next: PaymentIntent = {
    ...previous,
    ...row,
    idempotencyKey: row.idempotencyKey || previous?.idempotencyKey || newKey(),
    savedAt: Date.now(),
  };
  const rows = loadPayments().filter((item) => item.orderId !== row.orderId);
  rows.push(next);
  sessionStorage.setItem(PAYMENT_KEY, JSON.stringify(rows));
  return next;
}

/** Clé stable pour POST /payments/init de cette commande. */
export function paymentIdempotencyKey(orderId: number): string {
  return rememberPayment({ orderId }).idempotencyKey;
}
