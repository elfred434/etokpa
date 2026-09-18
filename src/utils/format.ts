/** Formatage des montants : « 1 800 FCFA » (design.md §9 — séparateur de milliers). */
export function formatFCFA(montant: number): string {
  const spaced = String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${spaced} FCFA`;
}

/** Référence de commande mock : #TOK-2847 */
export function formatOrderRef(id: string | number): string {
  return `#TOK-${id}`;
}
