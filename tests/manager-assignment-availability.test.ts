import { describe, expect, it } from 'vitest';
import {
  filterLivreursDisponiblesDansZone,
  isLivreurDisponible,
  livreurZoneId,
} from '../src/utils/managerAssignment';

describe('manager assignment availability', () => {
  it('keeps only explicitly available couriers in the order zone', () => {
    const livreurs = [
      { id: 1, profil: { zone_id: 7, disponibilite: true } },
      { id: 2, profil: { zone_id: 7, disponibilite: false } },
      { id: 3, profil: { zone: { id: 8 }, disponibilite: true } },
      { id: 4, profil: { zone_id: 7, disponibilite: 1 } },
      { id: 5, profil: { zone_id: 7 } },
    ];

    expect(filterLivreursDisponiblesDansZone(livreurs, 7).map((livreur) => livreur.id)).toEqual([1, 4]);
    expect(filterLivreursDisponiblesDansZone(livreurs, null)).toEqual([]);
  });

  it('reads the supported zone shapes and fails closed for missing availability', () => {
    expect(livreurZoneId({ profil: { zone: { id: '12' } } })).toBe(12);
    expect(isLivreurDisponible({ profil: { disponibilite: 'true' } })).toBe(true);
    expect(isLivreurDisponible({ profil: {} })).toBe(false);
  });
});
