import { describe, expect, it } from 'vitest';
import { apiOriginFromBase, normalizeApiBaseUrl } from '../src/utils/apiBaseUrl';
import { resolveImageUrl } from '../src/utils/imageUrl';

describe('API base URL and product image URLs', () => {
  it('trims accidental whitespace and trailing slashes from the API base', () => {
    expect(normalizeApiBaseUrl('  /api/  ')).toBe('/api');
    expect(normalizeApiBaseUrl('  http://localhost:8000/api/  ')).toBe('http://localhost:8000/api');
  });

  it('uses same-origin storage URLs when the API is configured behind the Vite proxy', () => {
    expect(apiOriginFromBase(' /api ')).toBe('');
    expect(resolveImageUrl(' /storage/products/tomate.webp ', ' /api ')).toBe('/storage/products/tomate.webp');
  });

  it('uses the API host for local storage paths when the API base is absolute', () => {
    expect(apiOriginFromBase(' http://localhost:8000/api/ ')).toBe('http://localhost:8000');
    expect(resolveImageUrl('/storage/products/tomate.webp', ' http://localhost:8000/api ')).toBe(
      'http://localhost:8000/storage/products/tomate.webp',
    );
  });

  it('preserves absolute CDN URLs and treats blank image fields as missing', () => {
    expect(resolveImageUrl(' https://cdn.test/tomate.webp ', '/api')).toBe('https://cdn.test/tomate.webp');
    expect(resolveImageUrl('   ', '/api')).toBeNull();
    expect(resolveImageUrl(null, '/api')).toBeNull();
  });
});
