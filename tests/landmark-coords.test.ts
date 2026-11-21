import { describe, expect, it, vi } from 'vitest';
import {
  isInCotonouSea,
  resolveOrderDestinationCoords,
  sanitizeLandmarkCoords,
} from '../src/utils/landmarkCoords';

describe('landmarkCoords — résolution fiable des zones et points de repère', () => {
  it('détecte les points erronés tombant dans l’océan Atlantique au large de Cotonou', () => {
    expect(isInCotonouSea(6.352, 2.45)).toBe(true); // Carrefour Akpakpa seedé en mer
    expect(isInCotonouSea(6.348, 2.455)).toBe(true); // Wologuèdè seedé en mer
    expect(isInCotonouSea(6.352, 2.428)).toBe(true); // Marina seedée en mer

    expect(isInCotonouSea(6.3679, 2.4488)).toBe(false); // Akpakpa sur terre
    expect(isInCotonouSea(6.3725, 2.4332)).toBe(false); // Dantokpa
    expect(isInCotonouSea(6.3573, 2.3844)).toBe(false); // Cadjehoun
  });

  it('corrige Carrefour Akpakpa hors de la mer tout en conservant les coordonnées valides sur terre', () => {
    const akpakpa = sanitizeLandmarkCoords('6.3520000', '2.4500000', 'Carrefour Akpakpa', 'Akpakpa');
    expect(akpakpa).toEqual([6.3679, 2.4488]);
    expect(isInCotonouSea(akpakpa![0], akpakpa![1])).toBe(false);

    const cadjehoun = sanitizeLandmarkCoords('6.3573000', '2.3844000', 'Carrefour Cadjehoun', 'Cadjehoun');
    expect(cadjehoun).toEqual([6.3573, 2.3844]);
  });

  it('résout le repère exact et la zone depuis GET /zones, GET /landmarks et description_lieu', async () => {
    const zones = [
      {
        id: 3,
        nom: 'Akpakpa',
        points_repere: [
          { id: 7, nom: 'Carrefour Akpakpa', latitude: '6.3520000', longitude: '2.4500000' },
        ],
      },
    ];

    // 1. Repère public Akpakpa (BDD en mer) → corrigé sur terre à Akpakpa
    const res1 = await resolveOrderDestinationCoords({
      order: { landmark: { id: 7, nom: 'Carrefour Akpakpa', zone_id: 3 }, description_lieu: null },
      zones,
      geocodeFn: vi.fn().mockResolvedValue([]),
    });
    expect(res1.zoneName).toBe('Akpakpa');
    expect(res1.coords).toEqual([6.3679, 2.4488]);
    expect(isInCotonouSea(res1.coords![0], res1.coords![1])).toBe(false);

    // 2. Repère personnel GET /landmarks absent de GET /zones
    const res2 = await resolveOrderDestinationCoords({
      order: { landmark: { id: 99, nom: 'Pharmacie Midombo', zone_id: 3 }, description_lieu: null },
      zones,
      userLandmarks: [
        { id: 99, nom: 'Pharmacie Midombo', zone_id: 3, latitude: '6.3705', longitude: '2.4512' },
      ],
      geocodeFn: vi.fn().mockResolvedValue([]),
    });
    expect(res2.zoneName).toBe('Akpakpa');
    expect(res2.coords).toEqual([6.3705, 2.4512]);

    // 3. Repère de profil personnalisé dans description_lieu → géocodé sur terre
    const geocodeFn = vi.fn().mockResolvedValue([
      { nom: 'SOBEPEC', detail: 'SOBEPEC, Akpakpa, Cotonou, Bénin', lat: 6.3642, lng: 2.4465 },
    ]);
    const res3 = await resolveOrderDestinationCoords({
      order: {
        landmark: { id: 7, nom: 'Carrefour Akpakpa', zone_id: 3 },
        description_lieu: 'SOBEPEC — Portail vert',
      },
      zones,
      geocodeFn,
    });
    expect(geocodeFn).toHaveBeenCalledWith('SOBEPEC, Akpakpa, Bénin');
    expect(res3.coords).toEqual([6.3642, 2.4465]);
  });
});
