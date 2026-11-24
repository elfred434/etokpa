// Mémorise localement les informations de confirmation de paiement entre redirections.
export interface ConfirmationMemory {
  orderId?: number;
  total?: number;
  zoneNom?: string;
  landmarkNom?: string;
  nbItems?: number;
  paymentId?: number;
  paymentRef?: string;
  paymentCurrency?: string;
  savedAt?: number;
}

const LAST_KEY = 'tokpa_confirmation';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Helper keyFor : réalise le traitement métier associé.
function keyFor(ref: string) {
  return `${LAST_KEY}:${ref}`;
}

// Récupère et normalise les données pour read.
function read(key: string): ConfirmationMemory | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as ConfirmationMemory;
    if (data.savedAt && Date.now() - data.savedAt > MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

// Enregistre ou crée les données via saveConfirmation.
export function saveConfirmation(payload: ConfirmationMemory): void {
  const data = { ...payload, savedAt: Date.now() };
  const raw = JSON.stringify(data);
  localStorage.setItem(LAST_KEY, raw);
  if (payload.paymentRef) localStorage.setItem(keyFor(String(payload.paymentRef)), raw);
}

// Récupère et normalise les données pour loadConfirmation.
export function loadConfirmation(fedapayId?: string): ConfirmationMemory | null {
  if (fedapayId) {
    const byId = read(keyFor(fedapayId));
    if (byId) return byId;
  }
  const last = read(LAST_KEY);
  if (!last) return null;
  if (fedapayId && last.paymentRef && String(last.paymentRef) !== String(fedapayId)) return null;
  return last;
}

// Helper statutFromFedaPayReturn : réalise le traitement métier associé.
export function statutFromFedaPayReturn(status: string | undefined): 'reussi' | 'echoue' | 'en_attente' | null {
  const s = (status ?? '').toLowerCase();
  if (['approved', 'transferred', 'paid', 'reussi'].includes(s)) return 'reussi';
  if (['declined', 'canceled', 'cancelled', 'failed', 'echoue'].includes(s)) return 'echoue';
  if (s === 'pending' || s === 'en_attente') return 'en_attente';
  return null;
}
