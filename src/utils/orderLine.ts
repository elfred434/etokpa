export type OrderLineLike = {
  nom?: string | null;
  product_id?: number | null;
  product?: { id?: number | null; nom?: string | null } | null;
  produit?: { id?: number | null; nom?: string | null } | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Nom déjà présent sur la ligne, sans repli « Produit # ». */
export function orderLineGivenName(item: OrderLineLike): string {
  return text(item.nom) || text(item.product?.nom) || text(item.produit?.nom);
}

export function orderLineProductId(item: OrderLineLike): number | null {
  const id = Number(item.product_id ?? item.product?.id ?? item.produit?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Nom affiché d'une ligne de commande. Le backend copie `nom` sur la ligne ; après suppression, `product_id` peut être null. */
export function orderLineName(item: OrderLineLike): string {
  const nom = orderLineGivenName(item);
  if (nom) return nom;
  const id = orderLineProductId(item);
  if (id) return `Produit #${id}`;
  return 'Produit retiré';
}
