export type ManagerZoneId = number | string | null | undefined;
export type LivreursAvailability = boolean | number | string | null | undefined;

export interface ManagerAssignableLivreur {
  id?: ManagerZoneId;
  zone_id?: ManagerZoneId;
  zone?: { id?: ManagerZoneId; nom?: string } | null;
  disponibilite?: LivreursAvailability;
  profil?: {
    zone_id?: ManagerZoneId;
    zone?: { id?: ManagerZoneId; nom?: string } | null;
    disponibilite?: LivreursAvailability;
  } | null;
}

function validId(value: ManagerZoneId): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Lit la zone dans les variantes de UserResource déjà renvoyées par l'API. */
export function livreurZoneId(livreur: ManagerAssignableLivreur): number | null {
  return (
    validId(livreur.profil?.zone_id) ??
    validId(livreur.profil?.zone?.id) ??
    validId(livreur.zone_id) ??
    validId(livreur.zone?.id)
  );
}

/** Fail-closed : un livreur sans disponibilité explicite n'est pas proposé à l'assignation. */
export function isLivreurDisponible(livreur: ManagerAssignableLivreur): boolean {
  const value = livreur.profil?.disponibilite ?? livreur.disponibilite;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'disponible', 'available'].includes(value.trim().toLowerCase());
  }
  return false;
}

/** Livre uniquement les livreurs explicitement disponibles de la zone de la commande. */
export function filterLivreursDisponiblesDansZone<T extends ManagerAssignableLivreur>(
  livreurs: readonly T[],
  zoneId: ManagerZoneId,
): T[] {
  const targetZoneId = validId(zoneId);
  if (!targetZoneId) return [];
  return livreurs.filter(
    (livreur) => livreurZoneId(livreur) === targetZoneId && isLivreurDisponible(livreur),
  );
}
