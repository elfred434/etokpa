/** Statuts d'annulation renvoyés par l'API, avec ou sans accent. */
export function isCancelledStatut(statut: string | null | undefined): boolean {
  const s = (statut ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return s === 'annule' || s === 'cancelled';
}
