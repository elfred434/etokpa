import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MAP_FILES = [
  'src/components/client/commandes/RealBeninMap.tsx',
  'src/pages/admin/AdminZonesPage.tsx',
];

describe('Map tile providers — keyless production safety', () => {
  it('does not use CARTO basemaps without API key or blocked OSM volunteer tiles', () => {
    for (const rel of MAP_FILES) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      expect(content).not.toContain('basemaps.cartocdn.com');
      expect(content).not.toMatch(/https:\/\/(\{s\}\.)?tile\.openstreetmap\.org\//);
    }
  });
});
