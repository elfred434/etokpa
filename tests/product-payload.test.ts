// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildProductMutationPayload } from '../src/utils/productPayload';

describe('product image payloads', () => {
  const fields = {
    nom: 'Tomate',
    description: 'Fraîche',
    prix: 500,
    prix_minimum: 400,
    stock: 12,
    categorie_id: 3,
  };

  it('sends a selected product image as multipart with string form fields', () => {
    const image = new File(['webp-bytes'], 'tomate.webp', { type: 'image/webp' });
    const payload = buildProductMutationPayload(fields, image, false);

    expect(payload).toBeInstanceOf(FormData);
    if (!(payload instanceof FormData)) throw new Error('Le payload aurait dû être multipart.');
    expect(payload.get('nom')).toBe('Tomate');
    expect(payload.get('prix')).toBe('500');
    expect(payload.get('image')).toBe(image);
  });

  it('sends image_url: null when an existing product image is removed', () => {
    const payload = buildProductMutationPayload(fields, null, true);
    expect(payload).toMatchObject({ nom: 'Tomate', image_url: null });
  });

  it('leaves the product payload unchanged when its image is kept', () => {
    expect(buildProductMutationPayload(fields, null, false)).toBe(fields);
  });
});
