import { describe, expect, it } from 'vitest';
import { selectUpcoming } from './upcoming';
import type { Transaction } from '@/domain/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36), type: 'expense', concept: 'x', amount: 0,
    date: '2026-09-10', categoryId: null, paymentMethodId: null, status: 'pending',
    quincenaKey: null, createdAt: '', updatedAt: '', ...overrides,
  };
}

describe('selectUpcoming', () => {
  it('ordena por fecha de pago TC cuando existe, si no por la fecha del movimiento', () => {
    const result = selectUpcoming([
      tx({ id: 'a', date: '2026-09-20' }),
      tx({ id: 'b', date: '2026-09-05', cyclePaymentDate: '2026-11-02' }),
      tx({ id: 'c', date: '2026-09-15' }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('excluye pagados y cancelados', () => {
    const result = selectUpcoming([
      tx({ id: 'a', status: 'paid' }),
      tx({ id: 'b', status: 'cancelled' }),
      tx({ id: 'c', status: 'pending' }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['c']);
  });

  it('respeta el limite', () => {
    const many = Array.from({ length: 10 }, (_, i) => tx({ id: String(i), date: `2026-09-${10 + i}` }));
    expect(selectUpcoming(many, 3)).toHaveLength(3);
  });
});
