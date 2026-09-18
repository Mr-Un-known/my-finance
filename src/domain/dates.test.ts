import { describe, expect, it } from 'vitest';
import { addDays, clampDay, daysInMonth, parseISO, shiftMonth, toISO } from './dates';

describe('daysInMonth', () => {
  it('reconoce años bisiestos', () => {
    expect(daysInMonth(2024, 2)).toBe(29); // bisiesto
    expect(daysInMonth(2026, 2)).toBe(28); // no bisiesto
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});

describe('clampDay', () => {
  it('nunca produce un dia inexistente', () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
    expect(clampDay(2024, 2, 31)).toBe(29);
    expect(clampDay(2026, 4, 31)).toBe(30);
    expect(clampDay(2026, 1, 15)).toBe(15);
  });
});

describe('shiftMonth', () => {
  it('cruza de año hacia adelante', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
  });
  it('cruza de año hacia atras', () => {
    expect(shiftMonth(2027, 1, -1)).toEqual({ y: 2026, m: 12 });
  });
  it('avanza varios meses de una vez', () => {
    expect(shiftMonth(2026, 10, 4)).toEqual({ y: 2027, m: 2 });
  });
});

describe('addDays / toISO / parseISO', () => {
  it('cruza de mes correctamente', () => {
    expect(toISO(addDays(parseISO('2026-01-31'), 1))).toBe('2026-02-01');
  });
  it('cruza de año correctamente', () => {
    expect(toISO(addDays(parseISO('2026-12-31'), 1))).toBe('2027-01-01');
  });
  it('resta dias sin producir dia 0', () => {
    expect(toISO(addDays(parseISO('2026-03-01'), -1))).toBe('2026-02-28');
  });
  it('parseISO/toISO son inversas', () => {
    expect(toISO(parseISO('2026-09-17'))).toBe('2026-09-17');
  });
});
