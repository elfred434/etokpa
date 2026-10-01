import { describe, expect, it } from 'vitest';
import { orderLineName } from '../src/utils/orderLine';

describe('orderLineName', () => {
  it('uses the name copied on the order line', () => {
    expect(orderLineName({ nom: 'Tomates', product_id: 12 })).toBe('Tomates');
  });

  it('says the product was removed when the link is gone', () => {
    expect(orderLineName({ nom: null, product_id: null })).toBe('Produit retiré');
    expect(orderLineName({})).toBe('Produit retiré');
  });
});
