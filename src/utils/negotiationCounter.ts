const COUNTER_PREFIX_RE = /contre[- ]proposition\s*[:\-–]\s*([\d\s.,\u00a0\u202f]+)\s*f?\s*cfa/i;

export const NEGOTIATION_VALIDITY_HOURS = 12;
export const NEGOTIATION_VALIDITY_MS = NEGOTIATION_VALIDITY_HOURS * 60 * 60 * 1000;

/**
 * Formate le message `admin_response` d'une contre-proposition envoyée via
 * `PATCH /admin/budget-proposals/{id}` (`decision: 'refuse'`).
 */
export function formatCounterProposalMessage(amount: number, note?: string): string {
  const clean = Math.round(amount).toLocaleString('fr-FR');
  const trimmed = note?.trim();
  return trimmed
    ? `Contre-proposition : ${clean} FCFA — ${trimmed}`
    : `Contre-proposition : ${clean} FCFA`;
}

/** Extrait le montant contre-proposé depuis `admin_response`, sinon `null`. */
export function extractCounterOfferPrice(adminResponse?: string | null): number | null {
  if (!adminResponse) return null;
  const match = adminResponse.match(COUNTER_PREFIX_RE);
  if (!match) return null;
  const digits = match[1].replace(/[^\d]/g, '');
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** Date d'expiration (+12 h à partir de `responded_at ?? created_at`), sinon `null`. */
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

/**
 * Miroir de `BudgetPropose::isAcceptedAndValid` côté backend :
 * acceptée et dans la fenêtre de validité de 12 h (`responded_at ?? created_at`).
 */
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

/** Libellé court du temps restant avant expiration (12 h). */
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
