import { describe, expect, it } from 'vitest';
import { buildCsvContent } from '../src/utils/csvExport';

describe('csvExport', () => {
  it('prepends UTF-8 BOM and preserves French accents and quotes', () => {
    const csv = buildCsvContent(
      ['Référence', 'Statut', 'Détail'],
      [['#42', 'Livrée', 'Épinards "frais" à Cotonou']],
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Référence";"Statut";"Détail"');
    expect(csv).toContain('"#42";"Livrée";"Épinards ""frais"" à Cotonou"');
  });
});
