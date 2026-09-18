import { describe, expect, it } from 'vitest';
import { groupByQuincena } from './groupByQuincena';
import type { Transaction } from '@/domain/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36), type: 'expense', concept: 'x', amount: 0,
    date: '2026-09-10', categoryId: null, paymentMethodId: null, status: 'pending',
    quincenaKey: null, createdAt: '', updatedAt: '', ...overrides,
  };
}

describe('groupByQuincena', () => {
  it('agrupa por quincena y ordena del mas reciente al mas antiguo', () => {
    const groups = groupByQuincena([
      tx({ date: '2026-09-10', amount: 10_000 }),
      tx({ date: '2026-09-25', amount: 20_000 }),
      tx({ date: '2026-08-12', amount: 5_000 }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-09-Q2', '2026-09-Q1', '2026-08-Q1']);
  });

  it('asigna el color y la etiqueta correctos segun Q1/Q2', () => {
    const groups = groupByQuincena([tx({ date: '2026-09-10' }), tx({ date: '2026-09-25' })]);
    const q1 = groups.find((g) => g.key === '2026-09-Q1')!;
    const q2 = groups.find((g) => g.key === '2026-09-Q2')!;
    expect(q1.label).toBe('Quincena del 10');
    expect(q1.colorVar).toBe('--q10');
    expect(q2.label).toBe('Quincena del 25');
    expect(q2.colorVar).toBe('--q25');
  });

  it('el balance de cada grupo coincide con calculateQuincenaBalance', () => {
    const groups = groupByQuincena([
      tx({ date: '2026-09-10', type: 'income', amount: 1_000_000 }),
      tx({ date: '2026-09-12', type: 'expense', amount: 300_000 }),
    ]);
    const q1 = groups.find((g) => g.key === '2026-09-Q1')!;
    expect(q1.balance.restante).toBe(700_000);
  });

  it('sin transacciones no hay grupos', () => {
    expect(groupByQuincena([])).toEqual([]);
  });
});
