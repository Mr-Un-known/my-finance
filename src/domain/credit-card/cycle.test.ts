import { describe, expect, it } from 'vitest';
import { calculateCreditCardCycle } from './cycle';
import { addDays, compareISO, parseISO, toISO } from '../dates';

/** Los 10 casos exactos que pediste, con cutoff=15 / pago=2. */
describe('calculateCreditCardCycle — casos del enunciado (cutoff 15, pago 2)', () => {
  const cases: Array<[string, string, string]> = [
    ['2026-01-14', '2026-01-15', '2026-02-02'],
    ['2026-01-15', '2026-01-15', '2026-02-02'],
    ['2026-01-16', '2026-02-15', '2026-03-02'],
    ['2026-01-31', '2026-02-15', '2026-03-02'],
    ['2026-02-01', '2026-02-15', '2026-03-02'],
    ['2026-02-15', '2026-02-15', '2026-03-02'],
    ['2026-02-16', '2026-03-15', '2026-04-02'],
    ['2026-02-28', '2026-03-15', '2026-04-02'],
    ['2024-02-29', '2024-03-15', '2024-04-02'], // 29 feb en año bisiesto
    ['2026-12-31', '2027-01-15', '2027-02-02'], // cambio de año
  ];

  for (const [purchase, expectedCutoff, expectedPayment] of cases) {
    it(`compra ${purchase} -> corte ${expectedCutoff} -> pago ${expectedPayment}`, () => {
      const result = calculateCreditCardCycle(purchase, 15, 2);
      expect(result.cycleCutoff).toBe(expectedCutoff);
      expect(result.paymentDate).toBe(expectedPayment);
    });
  }
});

describe('calculateCreditCardCycle — genericidad (no hardcodeado a 2026 ni a 15/2)', () => {
  it('funciona igual en cualquier año', () => {
    expect(calculateCreditCardCycle('2030-01-16', 15, 2).paymentDate).toBe('2030-03-02');
    expect(calculateCreditCardCycle('2019-01-16', 15, 2).paymentDate).toBe('2019-03-02');
  });

  it('respeta un cutoffDay/paymentDay distinto', () => {
    // corte dia 5, pago dia 20
    expect(calculateCreditCardCycle('2026-09-04', 5, 20)).toEqual({
      cycleStart: '2026-08-06',
      cycleCutoff: '2026-09-05',
      paymentDate: '2026-10-20', // el pago es el mes SIGUIENTE al corte, no el mismo mes
    });
    expect(calculateCreditCardCycle('2026-09-06', 5, 20).cycleCutoff).toBe('2026-10-05');
  });

  it('clampea cutoffDay=31 en meses cortos (ej. febrero)', () => {
    // compra el 28 feb (ultimo dia posible) con corte configurado en 31
    const result = calculateCreditCardCycle('2026-02-28', 31, 5);
    expect(result.cycleCutoff).toBe('2026-02-28'); // clampeado al ultimo dia real
  });

  it('clampea paymentDay=31 en un mes de pago con menos dias', () => {
    // corte 15 enero -> pago cae en febrero, que solo tiene 28 dias en 2026
    const result = calculateCreditCardCycle('2026-01-10', 15, 31);
    expect(result.paymentDate).toBe('2026-02-28');
  });
});

describe('calculateCreditCardCycle — invariantes (property-based sobre un año completo)', () => {
  it('la fecha de compra siempre cae dentro de [cycleStart, cycleCutoff], y el pago siempre es posterior al corte', () => {
    let cursor = parseISO('2026-01-01');
    for (let i = 0; i < 400; i++) {
      const purchase = toISO(cursor);
      const { cycleStart, cycleCutoff, paymentDate } = calculateCreditCardCycle(purchase, 15, 2);

      expect(compareISO(cycleStart, purchase)).toBeLessThanOrEqual(0);
      expect(compareISO(purchase, cycleCutoff)).toBeLessThanOrEqual(0);
      expect(compareISO(paymentDate, cycleCutoff)).toBeGreaterThan(0);

      cursor = addDays(cursor, 1);
    }
  });
});
