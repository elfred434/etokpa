// Filtre les livreurs disponibles appartenant à la zone de la commande.
import { tx } from '../i18n/tx';

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

// Helper validId : réalise le traitement métier associé.
function validId(value: ManagerZoneId): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Helper livreurZoneId : réalise le traitement métier associé.
export function livreurZoneId(livreur: ManagerAssignableLivreur): number | null {
  return (
    validId(livreur.profil?.zone_id) ??
    validId(livreur.profil?.zone?.id) ??
    validId(livreur.zone_id) ??
    validId(livreur.zone?.id)
  );
}

// Vérifie la condition métier isLivreurDisponible.
export function isLivreurDisponible(livreur: ManagerAssignableLivreur): boolean {
  const value = livreur.profil?.disponibilite ?? livreur.disponibilite;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'disponible', 'available'].includes(value.trim().toLowerCase());
  }
  return false;
}

// Helper filterLivreursDisponiblesDansZone : réalise le traitement métier associé.
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

// Transforme ou formate les données via formatManagerZoneLabel.
export function formatManagerZoneLabel(zone: string | null | undefined, isAdmin = false): string {
  if (zone) return `Zone ${zone}`;
  return isAdmin ? tx('Toutes les zones') : tx('Zone non attribuée');
}
