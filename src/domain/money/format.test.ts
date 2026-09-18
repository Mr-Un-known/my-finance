import { describe, expect, it } from 'vitest';
import { formatCompact, formatMoney, parseMoney } from './format';

describe('formatMoney', () => {
  it('usa formato colombiano con punto de miles', () => {
    expect(formatMoney(2_500_000)).toBe('$ 2.500.000');
  });

  it('no muestra decimales', () => {
    expect(formatMoney(9_900)).toBe('$ 9.900');
    expect(formatMoney(175_094)).toBe('$ 175.094');
  });

  it('maneja cero y negativos', () => {
    expect(formatMoney(0)).toBe('$ 0');
    expect(formatMoney(-48_000)).toBe('-$ 48.000');
  });
});

describe('parseMoney', () => {
  it('acepta lo que el usuario realmente escribe', () => {
    expect(parseMoney('85000')).toBe(85_000);
    expect(parseMoney('85.000')).toBe(85_000);
    expect(parseMoney('$ 85.000')).toBe(85_000);
    expect(parseMoney('1.500.000')).toBe(1_500_000);
  });

  it('devuelve null cuando no hay numero', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});

describe('formatCompact', () => {
  it('abrevia millones y miles', () => {
    expect(formatCompact(2_500_000)).toBe('$ 2,5 M');
    expect(formatCompact(85_000)).toBe('$ 85 k');
  });
});
