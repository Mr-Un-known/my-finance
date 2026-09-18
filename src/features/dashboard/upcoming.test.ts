import { describe, expect, it } from 'vitest';
import { selectUpcoming, upcomingTotals } from './upcoming';
import type { Transaction } from '@/domain/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36), type: 'expense', concept: 'x', amount: 0,
    date: '2026-09-10', categoryId: null, paymentMethodId: null, status: 'pending',
    quincenaKey: null, createdAt: '', updatedAt: '', ...overrides,
  };
}

describe('selectUpcoming', () => {
  it('ordena ascendente: primero lo mas cercano a la fecha', () => {
    const result = selectUpcoming([
      tx({ id: 'a', date: '2026-09-20' }),
      tx({ id: 'b', date: '2026-09-02' }),
      tx({ id: 'c', date: '2026-09-15' }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('usa la fecha de pago de TC cuando existe', () => {
    const result = selectUpcoming([
      tx({ id: 'tarde', date: '2026-09-01', cyclePaymentDate: '2026-11-02' }),
      tx({ id: 'pronto', date: '2026-09-20' }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['pronto', 'tarde']);
  });

  it('incluye ingresos, no solo gastos', () => {
    const result = selectUpcoming([tx({ id: 'sueldo', type: 'income' })]);
    expect(result.map((t) => t.id)).toEqual(['sueldo']);
  });

  it('excluye pagados y cancelados', () => {
    const result = selectUpcoming([
      tx({ id: 'a', status: 'paid' }),
      tx({ id: 'b', status: 'cancelled' }),
      tx({ id: 'c', status: 'pending' }),
      tx({ id: 'd', status: 'scheduled' }),
    ]);
    expect(result.map((t) => t.id)).toEqual(['c', 'd']);
  });

  it('respeta el limite', () => {
    const many = Array.from({ length: 10 }, (_, i) => tx({ id: String(i), date: `2026-09-${10 + i}` }));
    expect(selectUpcoming(many, 3)).toHaveLength(3);
  });
});

describe('upcomingTotals', () => {
  it('suma por separado lo que esperas recibir y lo que esperas gastar', () => {
    const totals = upcomingTotals([
      tx({ type: 'income', amount: 3_000_000 }),
      tx({ type: 'expense', amount: 400_000 }),
      tx({ type: 'expense', amount: 100_000, status: 'scheduled' }),
      tx({ type: 'expense', amount: 999, status: 'paid' }),
      tx({ type: 'income', amount: 999, status: 'cancelled' }),
    ]);
    expect(totals).toEqual({ income: 3_000_000, expense: 500_000 });
  });

  it('coincide con calculateMonthFlow sobre la misma lista', async () => {
    const { calculateMonthFlow } = await import('@/domain/totals/available');
    const list = [
      tx({ type: 'income', amount: 3_000_000, status: 'pending' }),
      tx({ type: 'expense', amount: 500_000, status: 'scheduled' }),
      tx({ type: 'expense', amount: 200_000, status: 'paid' }),
    ];
    const flow = calculateMonthFlow(list);
    const totals = upcomingTotals(list);
    expect(totals.income).toBe(flow.porRecibir);
    expect(totals.expense).toBe(flow.porPagar);
  });
});
