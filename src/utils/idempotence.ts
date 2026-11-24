
// Génère et mémorise les clés d’idempotence pour les commandes et paiements FedaPay.
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

// Helper checkoutFingerprint : réalise le traitement métier associé.
export function checkoutFingerprint(lines: CartLine[], landmarkId: number, description?: string): string {
  const items = [...lines]
    .map((line) => `${line.product_id}:${line.quantite}`)
    .sort()
    .join(',');
  return `${items}|lm:${landmarkId}|d:${(description ?? '').trim()}`;
}

// Helper newKey : réalise le traitement métier associé.
function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `tokpa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Récupère et normalise les données pour readJson.
function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// Récupère et normalise les données pour loadCheckoutIntent.
export function loadCheckoutIntent(): CheckoutIntent | null {
  const data = readJson<CheckoutIntent>(CHECKOUT_KEY);
  if (!data?.savedAt || !data.key) return null;
  if (Date.now() - data.savedAt > ATTEMPT_MS) {
    sessionStorage.removeItem(CHECKOUT_KEY);
    return null;
  }
  return data;
}

// Enregistre ou crée les données via saveCheckoutIntent.
export function saveCheckoutIntent(intent: CheckoutIntent): void {
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify({ ...intent, savedAt: intent.savedAt || Date.now() }));
}

// Supprime ou nettoie les éléments via clearCheckoutIntent.
export function clearCheckoutIntent(): void {
  sessionStorage.removeItem(CHECKOUT_KEY);
}

// Helper sameAttempt : réalise le traitement métier associé.
export function sameAttempt(intent: CheckoutIntent | null, key: string): intent is CheckoutIntent {
  return !!intent && intent.key === key && Date.now() - intent.savedAt < ATTEMPT_MS;
}

// Helper attemptStillPending : réalise le traitement métier associé.
export function attemptStillPending(intent: CheckoutIntent | null, key: string): boolean {
  return sameAttempt(intent, key) && !intent.orderId && !!intent.pending && Date.now() - intent.savedAt < PENDING_MS;
}

// Helper beginCheckout : réalise le traitement métier associé.
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

// Récupère et normalise les données pour loadPayments.
function loadPayments(): PaymentIntent[] {
  const rows = readJson<PaymentIntent[]>(PAYMENT_KEY) ?? [];
  const fresh = rows.filter((row) => row.orderId && Date.now() - row.savedAt < ATTEMPT_MS);
  if (fresh.length !== rows.length) sessionStorage.setItem(PAYMENT_KEY, JSON.stringify(fresh));
  return fresh;
}

// Récupère et normalise les données pour loadPayment.
export function loadPayment(orderId: number): PaymentIntent | null {
  return loadPayments().find((row) => row.orderId === orderId) ?? null;
}

// Helper rememberPayment : réalise le traitement métier associé.
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

// Supprime ou nettoie les éléments via clearPaymentIntent.
export function clearPaymentIntent(orderId: number): void {
  try {
    const rows = loadPayments().filter((item) => item.orderId !== orderId);
    sessionStorage.setItem(PAYMENT_KEY, JSON.stringify(rows));
  } catch {
  }
}

// Helper paymentIdempotencyKey : réalise le traitement métier associé.
export function paymentIdempotencyKey(orderId: number): string {
  return rememberPayment({ orderId }).idempotencyKey;
}
