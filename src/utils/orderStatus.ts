// Indique si un statut de commande correspond à une annulation.
export function isCancelledStatut(statut: string | null | undefined): boolean {
  const s = (statut ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return s === 'annule' || s === 'cancelled';
}
