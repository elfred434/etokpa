// Parse les contre-propositions admin et calcule la validité de 12 h des offres.
const COUNTER_PREFIX_RE = /contre[- ]proposition\s*[:\-–]\s*([\d\s.,\u00a0\u202f]+)\s*f?\s*cfa/i;

export const NEGOTIATION_VALIDITY_HOURS = 12;
export const NEGOTIATION_VALIDITY_MS = NEGOTIATION_VALIDITY_HOURS * 60 * 60 * 1000;

// Transforme ou formate les données via formatCounterProposalMessage.
export function formatCounterProposalMessage(amount: number, note?: string): string {
  const clean = Math.round(amount).toLocaleString('fr-FR');
  const trimmed = note?.trim();
  return trimmed
    ? `Contre-proposition : ${clean} FCFA — ${trimmed}`
    : `Contre-proposition : ${clean} FCFA`;
}

// Transforme ou formate les données via extractCounterOfferPrice.
export function extractCounterOfferPrice(adminResponse?: string | null): number | null {
  if (!adminResponse) return null;
  const match = adminResponse.match(COUNTER_PREFIX_RE);
  if (!match) return null;
  const digits = match[1].replace(/[^\d]/g, '');
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

// Helper negotiationExpiresAt : réalise le traitement métier associé.
export function negotiationExpiresAt(proposal: {
  responded_at?: string | null;
  created_at?: string | null;
}): Date | null {
  const iso = proposal.responded_at ?? proposal.created_at;
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts + NEGOTIATION_VALIDITY_MS);
}

// Vérifie la condition métier isAcceptedNegotiationValid.
export function isAcceptedNegotiationValid(
  proposal: {
    statut?: string | null;
    responded_at?: string | null;
    created_at?: string | null;
  },
  nowMs = Date.now(),
): boolean {
  if (proposal.statut !== 'accepte') return false;
  const exp = negotiationExpiresAt(proposal);
  if (!exp) return true;
  return exp.getTime() > nowMs;
}

// Vérifie la condition métier isPendingNegotiationValid.
export function isPendingNegotiationValid(
  proposal: {
    statut?: string | null;
    created_at?: string | null;
  },
  nowMs = Date.now(),
): boolean {
  if (proposal.statut !== 'en_attente') return false;
  if (!proposal.created_at) return true;
  const ts = Date.parse(proposal.created_at);
  if (!Number.isFinite(ts)) return true;
  return ts + NEGOTIATION_VALIDITY_MS > nowMs;
}

// Transforme ou formate les données via formatNegotiationRemaining.
export function formatNegotiationRemaining(expiresAtIso: string | undefined, isFr: boolean, nowMs = Date.now()): string | null {
  if (!expiresAtIso) return null;
  const diffMs = Date.parse(expiresAtIso) - nowMs;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
  const totalMin = Math.max(1, Math.floor(diffMs / 60_000));
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return isFr
      ? `Valable encore ${hours}h${mins > 0 ? ` ${String(mins).padStart(2, '0')}min` : ''}`
      : `Valid for ${hours}h${mins > 0 ? ` ${String(mins).padStart(2, '0')}m` : ''}`;
  }
  return isFr ? `Valable encore ${totalMin} min` : `Valid for ${totalMin}m`;
}
