// Extrait le nom et l’identifiant produit d’une ligne de commande.
export type OrderLineLike = {
  nom?: string | null;
  product_id?: number | null;
  product?: { id?: number | null; nom?: string | null } | null;
  produit?: { id?: number | null; nom?: string | null } | null;
};

// Helper text : réalise le traitement métier associé.
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Helper orderLineGivenName : réalise le traitement métier associé.
export function orderLineGivenName(item: OrderLineLike): string {
  return text(item.nom) || text(item.product?.nom) || text(item.produit?.nom);
}

// Helper orderLineProductId : réalise le traitement métier associé.
export function orderLineProductId(item: OrderLineLike): number | null {
  const id = Number(item.product_id ?? item.product?.id ?? item.produit?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// Helper orderLineName : réalise le traitement métier associé.
export function orderLineName(item: OrderLineLike): string {
  const nom = orderLineGivenName(item);
  if (nom) return nom;
  const id = orderLineProductId(item);
  if (id) return `Produit #${id}`;
  return 'Produit retiré';
}
