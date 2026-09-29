import { describe, expect, it, beforeEach } from 'vitest';
import { loadConfirmation, saveConfirmation, statutFromFedaPayReturn } from '../src/pages/client/confirmation-commande/confirmationMemory';

describe('confirmation memory', () => {
  beforeEach(() => localStorage.clear());

  it('restores the order that matches the FedaPay return id', () => {
    saveConfirmation({
      orderId: 29,
      total: 4520,
      zoneNom: 'Akpakpa',
      landmarkNom: 'Wologuèdè',
      paymentRef: '515107',
      paymentId: 8,
    });
    const found = loadConfirmation('515107');
    expect(found?.orderId).toBe(29);
    expect(found?.total).toBe(4520);
    expect(found?.landmarkNom).toBe('Wologuèdè');
    expect(loadConfirmation('999')).toBeNull();
  });

  it('maps the FedaPay return status', () => {
    expect(statutFromFedaPayReturn('approved')).toBe('reussi');
    expect(statutFromFedaPayReturn('declined')).toBe('echoue');
    expect(statutFromFedaPayReturn(undefined)).toBeNull();
  });
});
