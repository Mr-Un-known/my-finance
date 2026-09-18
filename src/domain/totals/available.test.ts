import { describe, expect, it } from 'vitest';
import { calculateMonthFlow } from './available';
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

describe('calculateMonthFlow', () => {
  it('separa recibido / por recibir / pagado / por pagar', () => {
    const f = calculateMonthFlow([
      tx({ type: 'income', amount: 3_000_000, status: 'paid' }),
      tx({ type: 'income', amount: 1_000_000, status: 'pending' }),
      tx({ type: 'expense', amount: 800_000, status: 'paid' }),
      tx({ type: 'expense', amount: 500_000, status: 'scheduled' }),
    ]);
    expect(f).toMatchObject({
      recibido: 3_000_000, porRecibir: 1_000_000, pagado: 800_000, porPagar: 500_000,
    });
  });

  it('ignora cancelados', () => {
    const f = calculateMonthFlow([tx({ type: 'expense', amount: 999, status: 'cancelled' })]);
    expect(f.pagado).toBe(0);
    expect(f.porPagar).toBe(0);
  });

  it('enCaja es lo ya ejecutado y proyectado es el mes completo', () => {
    const f = calculateMonthFlow([
      tx({ type: 'income', amount: 2_000_000, status: 'paid' }),
      tx({ type: 'income', amount: 2_000_000, status: 'pending' }),
      tx({ type: 'expense', amount: 3_000_000, status: 'paid' }),
      tx({ type: 'expense', amount: 500_000, status: 'pending' }),
    ]);
    expect(f.enCaja).toBe(-1_000_000);
    expect(f.proyectado).toBe(500_000);
  });

  it('los cuatro componentes nunca son negativos', () => {
    const f = calculateMonthFlow([
      tx({ type: 'expense', amount: 100, status: 'pending' }),
    ]);
    for (const n of [f.recibido, f.porRecibir, f.pagado, f.porPagar]) expect(n).toBeGreaterThanOrEqual(0);
  });
});
