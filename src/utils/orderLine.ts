/** Nom affiché d'une ligne de commande. Le backend copie `nom` sur la ligne ; après suppression, `product_id` peut être null. */
export function orderLineName(item: { nom?: string | null; product_id?: number | null }): string {
  const nom = item.nom?.trim();
  if (nom) return nom;
  if (item.product_id) return `Produit #${item.product_id}`;
  return 'Produit retiré';
}
