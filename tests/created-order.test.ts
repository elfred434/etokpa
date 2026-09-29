import { describe, expect, it } from 'vitest';
import { readCreatedOrder } from '../src/services/api/orders';

describe('readCreatedOrder', () => {
  it('reads the new backend shape with the payment already included', () => {
    const read = readCreatedOrder({
      order: {
        success: true,
        message: 'Commande créée avec succès.',
        data: { id: 90, montant_total: 960 },
      },
      payment: {
        payment: { id: 15, fedapay_ref: 'trx_1' },
        redirect_url: 'https://sandbox-checkout.fedapay.com/token',
        currency: 'XOF',
      },
    });

    expect(read.id).toBe(90);
    expect(read.montantTotal).toBe(960);
    expect(read.payment?.redirect_url).toContain('fedapay.com');
    expect(read.payment?.payment?.id).toBe(15);
  });

  it('still reads the old OrderResource shape', () => {
    const read = readCreatedOrder({
      success: true,
      data: { id: 12, montant_total: 450 },
    });

    expect(read.id).toBe(12);
    expect(read.montantTotal).toBe(450);
    expect(read.payment).toBeNull();
  });

  it('does not invent an order id', () => {
    expect(readCreatedOrder({ order: { data: {} }, payment: {} }).id).toBe(0);
    expect(readCreatedOrder(null).id).toBe(0);
  });
});
