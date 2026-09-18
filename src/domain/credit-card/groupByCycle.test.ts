import { describe, expect, it } from 'vitest';
import { groupByCycle } from './groupByCycle';
import type { Transaction } from '../types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36), type: 'expense', concept: 'x', amount: 0,
    date: '2026-09-01', categoryId: null, paymentMethodId: 'pm-tc', status: 'pending',
    quincenaKey: null, createdAt: '', updatedAt: '', ...overrides,
  };
}

describe('groupByCycle', () => {
  it('agrupa por fecha de pago y suma el total del ciclo', () => {
    const groups = groupByCycle([
      tx({ amount: 150_000, cyclePaymentDate: '2026-11-02' }),
      tx({ amount: 210_000, cyclePaymentDate: '2026-11-02' }),
      tx({ amount: 80_000, cyclePaymentDate: '2026-12-02' }),
    ]);
    expect(groups).toHaveLength(2);
    const nov = groups.find((g) => g.paymentDate === '2026-11-02')!;
    expect(nov.total).toBe(360_000);
    expect(nov.count).toBe(2);
  });

  it('ordena los ciclos del mas proximo al mas lejano', () => {
    const groups = groupByCycle([
      tx({ cyclePaymentDate: '2027-01-02' }),
      tx({ cyclePaymentDate: '2026-11-02' }),
    ]);
    expect(groups.map((g) => g.paymentDate)).toEqual(['2026-11-02', '2027-01-02']);
  });

  it('ignora canceladas y las que no tienen fecha de pago (no son TC)', () => {
    const groups = groupByCycle([
      tx({ cyclePaymentDate: '2026-11-02', status: 'cancelled' }),
      tx({ cyclePaymentDate: undefined }),
    ]);
    expect(groups).toEqual([]);
  });
});
