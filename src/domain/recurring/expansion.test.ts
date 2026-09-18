import { describe, expect, it } from 'vitest';
import { expandRecurringRule } from './expansion';
import type { RecurringRule } from '../types';

function rule(overrides: Partial<RecurringRule>): RecurringRule {
  return {
    id: 'r1',
    name: 'Arriendo',
    type: 'expense',
    amount: 2_500_000,
    categoryId: null,
    paymentMethodId: null,
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: '2026-01-01',
    isActive: true,
    ...overrides,
  };
}

describe('expandRecurringRule — mensual', () => {
  it('genera una instancia por mes con periodKey YYYY-MM', () => {
    const occ = expandRecurringRule(rule({}), { from: '2026-01-01', to: '2026-12-31' });
    expect(occ).toHaveLength(12);
    expect(occ[0]).toEqual({ periodKey: '2026-01', date: '2026-01-01' });
    expect(occ[11]).toEqual({ periodKey: '2026-12', date: '2026-12-01' });
  });

  it('clampea dayOfMonth en meses cortos (31 -> 28/30 segun el mes)', () => {
    const occ = expandRecurringRule(
      rule({ dayOfMonth: 31, startDate: '2026-01-01' }),
      { from: '2026-01-01', to: '2026-04-30' },
    );
    expect(occ.map((o) => o.date)).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30',
    ]);
  });

  it('respeta endDate: no genera instancias despues de que la regla termino', () => {
    const occ = expandRecurringRule(
      rule({ dayOfMonth: 1, endDate: '2026-03-15' }),
      { from: '2026-01-01', to: '2026-06-30' },
    );
    expect(occ.map((o) => o.periodKey)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('una regla inactiva no genera nada', () => {
    const occ = expandRecurringRule(rule({ isActive: false }), { from: '2026-01-01', to: '2026-12-31' });
    expect(occ).toEqual([]);
  });

  it('es idempotente: llamarla dos veces con el mismo rango da exactamente el mismo resultado', () => {
    const r = rule({});
    const range = { from: '2026-01-01', to: '2026-06-30' };
    expect(expandRecurringRule(r, range)).toEqual(expandRecurringRule(r, range));
  });

  it('no genera nada antes de startDate', () => {
    const occ = expandRecurringRule(
      rule({ dayOfMonth: 1, startDate: '2026-06-01' }),
      { from: '2026-01-01', to: '2026-12-31' },
    );
    expect(occ.map((o) => o.periodKey)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
  });
});

describe('expandRecurringRule — semanal / quincenal', () => {
  it('semanal genera cada 7 dias desde el ancla', () => {
    const occ = expandRecurringRule(
      rule({ frequency: 'weekly', startDate: '2026-09-07', dayOfMonth: undefined }),
      { from: '2026-09-01', to: '2026-09-30' },
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('quincenal genera cada 14 dias', () => {
    const occ = expandRecurringRule(
      rule({ frequency: 'biweekly', startDate: '2026-09-01', dayOfMonth: undefined }),
      { from: '2026-09-01', to: '2026-10-31' },
    );
    expect(occ.map((o) => o.date)).toEqual(['2026-09-01', '2026-09-15', '2026-09-29', '2026-10-13', '2026-10-27']);
  });
});

describe('expandRecurringRule — anual', () => {
  it('genera una instancia por año en el aniversario', () => {
    const occ = expandRecurringRule(
      rule({ frequency: 'yearly', startDate: '2024-06-09', dayOfMonth: undefined }),
      { from: '2024-01-01', to: '2027-12-31' },
    );
    expect(occ.map((o) => o.date)).toEqual(['2024-06-09', '2025-06-09', '2026-06-09', '2027-06-09']);
  });

  it('clampea 29 de febrero en años no bisiestos', () => {
    const occ = expandRecurringRule(
      rule({ frequency: 'yearly', startDate: '2024-02-29', dayOfMonth: undefined }),
      { from: '2024-01-01', to: '2027-12-31' },
    );
    expect(occ.map((o) => o.date)).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28']);
  });
});
