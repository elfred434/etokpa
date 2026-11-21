const COUNTER_PREFIX_RE = /contre[- ]proposition\s*[:\-–]\s*([\d\s.,\u00a0\u202f]+)\s*f?\s*cfa/i;

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
