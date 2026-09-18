import { describe, expect, it } from 'vitest';
import { calculateAvailableBalance } from './available';
import type { Transaction } from '../types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'expense',
    concept: 'x',
    amount: 0,
    date: '2026-09-01',
    categoryId: null,
    paymentMethodId: null,
    status: 'paid',
    quincenaKey: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('calculateAvailableBalance', () => {
  it('disponible = ingresos pagados - gastos pagados', () => {
    const result = calculateAvailableBalance([
      tx({ type: 'income', amount: 3_000_000, status: 'paid' }),
      tx({ type: 'expense', amount: 1_000_000, status: 'paid' }),
    ]);
    expect(result.disponible).toBe(2_000_000);
  });

  it('comprometido suma pendientes y programados, pero no pagados ni cancelados', () => {
    const result = calculateAvailableBalance([
      tx({ type: 'expense', amount: 500_000, status: 'pending' }),
      tx({ type: 'expense', amount: 300_000, status: 'scheduled' }),
      tx({ type: 'expense', amount: 100_000, status: 'paid' }), // ya esta en disponible, no aqui
      tx({ type: 'expense', amount: 999_999, status: 'cancelled' }),
    ]);
    expect(result.comprometido).toBe(800_000);
  });

  it('libre real = disponible - comprometido', () => {
    const result = calculateAvailableBalance([
      tx({ type: 'income', amount: 5_000_000, status: 'paid' }),
      tx({ type: 'expense', amount: 2_000_000, status: 'paid' }),
      tx({ type: 'expense', amount: 1_000_000, status: 'pending' }),
    ]);
    expect(result.disponible).toBe(3_000_000);
    expect(result.comprometido).toBe(1_000_000);
    expect(result.libreReal).toBe(2_000_000);
  });

  it('un ingreso pendiente no cuenta como disponible todavia', () => {
    const result = calculateAvailableBalance([
      tx({ type: 'income', amount: 1_000_000, status: 'pending' }),
    ]);
    expect(result.disponible).toBe(0);
  });
});
