import { describe, expect, it, vi, beforeEach } from 'vitest';
import { paymentsApi } from '../src/services/api/payments';
import { apiClient } from '../src/services/api/client';

vi.mock('../src/services/api/client', () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }));

describe('payment API adapter', () => {
  beforeEach(() => vi.clearAllMocks());
  it('initializes payment for an existing order', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { redirect_url: '/payments/sandbox/tok' } });
    await expect(paymentsApi.initPayment({ order_id: 42 })).resolves.toEqual({ redirect_url: '/payments/sandbox/tok' });
    // L'adaptateur transmet un 3e argument (en-têtes) : sans clé d'idempotence,
    // la valeur est `undefined` — c'est le comportement voulu depuis l'ajout
    // de l'idempotence sur les paiements.
    expect(apiClient.post).toHaveBeenCalledWith('/payments/init', { order_id: 42 }, { headers: undefined });
  });
  it('transmet la clé d’idempotence quand elle est fournie', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 9 } });
    await paymentsApi.initPayment({ order_id: 7 }, 'commande-7-paiement');
    expect(apiClient.post).toHaveBeenCalledWith('/payments/init', { order_id: 7 }, {
      headers: { 'Idempotency-Key': 'commande-7-paiement' },
    });
  });
  it('loads payment details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 3, statut: 'en_attente' } });
    await paymentsApi.getPayment(3);
    expect(apiClient.get).toHaveBeenCalledWith('/payments/3');
  });
});
