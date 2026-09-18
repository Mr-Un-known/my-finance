import { describe, expect, it } from 'vitest';
import { buscarMonto } from './numbers';

const v = (t: string) => buscarMonto(t)?.valor ?? null;

describe('buscarMonto — dígitos', () => {
  it('numero pelado', () => expect(v('45000')).toBe(45_000));
  it('con punto de miles colombiano', () => expect(v('45.000')).toBe(45_000));
  it('con signo pesos', () => expect(v('$ 45.000')).toBe(45_000));
  it('millones con punto de miles', () => expect(v('2.800.000')).toBe(2_800_000));
  it('coma como separador de miles', () => expect(v('45,000')).toBe(45_000));
});

describe('buscarMonto — escalas', () => {
  it('"45 mil"', () => expect(v('45 mil')).toBe(45_000));
  it('"45mil" pegado', () => expect(v('45mil')).toBe(45_000));
  it('"45k"', () => expect(v('45k')).toBe(45_000));
  it('"45 lucas"', () => expect(v('45 lucas')).toBe(45_000));
  it('"1.2 millones" usa el punto como decimal', () => expect(v('1.2 millones')).toBe(1_200_000));
  it('"2 millones"', () => expect(v('2 millones')).toBe(2_000_000));
  it('"dos palos"', () => expect(v('dos palos')).toBe(2_000_000));
});

describe('buscarMonto — en palabras', () => {
  it('"cuarenta y cinco mil"', () => expect(v('cuarenta y cinco mil')).toBe(45_000));
  it('"veinte mil"', () => expect(v('veinte mil')).toBe(20_000));
  it('"un millon"', () => expect(v('un millon')).toBe(1_000_000));
  it('"dos millones y medio"', () => expect(v('dos millones y medio')).toBe(2_500_000));
  it('"ciento veinte mil"', () => expect(v('ciento veinte mil')).toBe(120_000));
  it('"mil" solo vale mil', () => expect(v('mil')).toBe(1_000));
  it('"quinientos mil"', () => expect(v('quinientos mil')).toBe(500_000));
  it('con tildes', () => expect(v('un millón')).toBe(1_000_000));
});

describe('buscarMonto — dentro de una frase', () => {
  it('saca el monto de una oración hablada', () => {
    expect(v('gasté 45 mil en el almuerzo')).toBe(45_000);
    expect(v('me llegaron dos millones y medio de nómina')).toBe(2_500_000);
  });

  it('saca el monto de un SMS de banco', () => {
    expect(v('Bancolombia le informa Compra por $145.000 en EXITO')).toBe(145_000);
    expect(v('Nequi: Pagaste $12.500 a RAPPI')).toBe(12_500);
  });
});

describe('buscarMonto — sin monto', () => {
  it('devuelve null', () => {
    expect(v('hola')).toBeNull();
    expect(v('')).toBeNull();
    expect(v('gasté en el almuerzo')).toBeNull();
  });
});
