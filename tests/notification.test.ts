import { describe, expect, it } from 'vitest';
import { describeNotification } from '../src/utils/notificationText';

describe('notification descriptions', () => {
  it('describes order status notifications in French', () => {
    const result = describeNotification({ type: 'order.status', data: { order_id: 12, statut: 'livre' } } as any, true);
    expect(result.title).toContain('#12');
    expect(result.message).toContain('livrée');
    expect(result.orderId).toBe(12);
  });
  it('links accepted negotiations to their order', () => expect(describeNotification({ type: 'budget.response', data: { order_id: 8, statut: 'accepte' } } as any, true).orderId).toBe(8));
  it('describes role.changed notifications in French and English', () => {
    const fr = describeNotification(
      { type: 'role.changed', data: { role: 'admin', message: 'Vous êtes maintenant administrateur.' } } as any,
      true,
    );
    expect(fr.type).toBe('security');
    expect(fr.title).toBe('Rôle mis à jour');
    expect(fr.message).toBe('Vous êtes maintenant administrateur.');

    const en = describeNotification({ type: 'role.changed', data: { role: 'manager' } } as any, false);
    expect(en.type).toBe('security');
    expect(en.title).toBe('Role updated');
    expect(en.message).toBe('You are now a manager.');
  });
  it('has a safe fallback for unknown types', () => expect(describeNotification({ type: 'unknown', data: {} } as any, true).title).toContain('TOKPa'));
});
