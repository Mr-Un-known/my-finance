import { describe, expect, it } from 'vitest';
import { parseUtterance } from './parse';

const HOY = '2026-09-18';
const p = (t: string) => parseUtterance(t, HOY);

describe('hablado — gastos', () => {
  it('la frase típica', () => {
    const r = p('gasté 45 mil en el almuerzo');
    expect(r.type).toBe('expense');
    expect(r.amount).toBe(45_000);
    expect(r.concept).toBe('Almuerzo');
    expect(r.date).toBe(HOY);
    expect(r.categoryIdSugerida).toBe('cat-alimentacion');
  });

  it('con método de pago', () => {
    const r = p('pagué 120 mil de mercado con la tarjeta');
    expect(r.amount).toBe(120_000);
    expect(r.metodo).toBe('credit');
    expect(r.concept).toBe('Mercado');
    expect(r.categoryIdSugerida).toBe('cat-alimentacion');
  });

  it('en efectivo', () => {
    expect(p('gasté 20 mil en taxi en efectivo').metodo).toBe('cash');
  });

  it('por Nequi', () => {
    expect(p('pagué 35 mil por nequi').metodo).toBe('transfer');
  });

  it('con débito', () => {
    expect(p('gasté 15000 en gasolina con la débito').metodo).toBe('debit');
  });

  it('monto en palabras', () => {
    const r = p('gasté cuarenta y cinco mil en cine');
    expect(r.amount).toBe(45_000);
    expect(r.categoryIdSugerida).toBe('cat-entretenimiento');
  });
});

describe('hablado — ingresos', () => {
  it('reconoce que entra plata', () => {
    const r = p('me llegaron dos millones y medio de nómina');
    expect(r.type).toBe('income');
    expect(r.amount).toBe(2_500_000);
  });

  it('"recibí" también', () => {
    expect(p('recibí 700 mil de un freelance').type).toBe('income');
  });

  it('sin verbo asume gasto, que es lo que más se registra', () => {
    expect(p('45 mil almuerzo').type).toBe('expense');
  });
});

describe('fechas habladas', () => {
  it('ayer', () => expect(p('gasté 10 mil ayer en café').date).toBe('2026-09-17'));
  it('anteayer', () => expect(p('gasté 10 mil anteayer').date).toBe('2026-09-16'));
  it('hace 3 días', () => expect(p('pagué 50 mil hace 3 dias').date).toBe('2026-09-15'));
  it('"el 5" es día del mes actual', () => expect(p('pagué 50 mil el 5').date).toBe('2026-09-05'));
  it('sin fecha es hoy', () => expect(p('gasté 10 mil en pan').date).toBe(HOY));
  it('la fecha no se cuela en el concepto', () => {
    expect(p('gasté 10 mil ayer en café').concept.toLowerCase()).not.toContain('ayer');
  });
});

describe('SMS de banco', () => {
  it('Bancolombia — compra', () => {
    const r = p('Bancolombia le informa Compra por $145.000 en EXITO 18/09/2026 14:32');
    expect(r.type).toBe('expense');
    expect(r.amount).toBe(145_000);
    expect(r.concept.toLowerCase()).toContain('exito');
    expect(r.categoryIdSugerida).toBe('cat-alimentacion');
    expect(r.date).toBe('2026-09-18');
  });

  it('Nequi — pago', () => {
    const r = p('Nequi: Pagaste $12.500 a RAPPI');
    expect(r.type).toBe('expense');
    expect(r.amount).toBe(12_500);
    expect(r.concept.toLowerCase()).toContain('rappi');
  });

  it('abono reconocido como ingreso', () => {
    const r = p('Bancolombia: Recibiste $2.800.000 por NOMINA');
    expect(r.type).toBe('income');
    expect(r.amount).toBe(2_800_000);
  });

  it('el nombre del banco no queda como concepto', () => {
    const r = p('Bancolombia le informa Compra por $89.900 en NETFLIX');
    expect(r.concept.toLowerCase()).not.toContain('bancolombia');
    expect(r.categoryIdSugerida).toBe('cat-suscripciones');
  });

  it('la fecha del SMS manda sobre hoy', () => {
    expect(p('Compra por $10.000 en D1 15/09/2026').date).toBe('2026-09-15');
  });
});

describe('cuando no alcanza', () => {
  it('sin monto lo dice, no inventa', () => {
    const r = p('gasté en el almuerzo');
    expect(r.amount).toBeNull();
    expect(r.concept).toBe('Almuerzo');
  });

  it('texto vacío no explota', () => {
    const r = p('');
    expect(r.amount).toBeNull();
    expect(r.concept).toBe('');
  });

  it('sin palabra conocida no sugiere categoría', () => {
    expect(p('gasté 10 mil en zzzz').categoryIdSugerida).toBeNull();
  });
});

describe('categorías por palabra clave', () => {
  const casos: Array<[string, string]> = [
    ['gasté 20 mil en uber', 'cat-transporte'],
    ['pagué 89 mil de netflix', 'cat-suscripciones'],
    ['pagué 1.800.000 de arriendo', 'cat-hogar'],
    ['pagué 120 mil de luz', 'cat-servicios'],
    ['gasté 50 mil en la droguería', 'cat-salud'],
    ['gasté 200 mil en ropa', 'cat-compras'],
    ['pagué 500 mil del curso', 'cat-educacion'],
  ];
  for (const [frase, esperada] of casos) {
    it(frase, () => expect(p(frase).categoryIdSugerida).toBe(esperada));
  }
});

describe('ruido de los SMS que no es el comercio', () => {
  it('la hora no se cuela en el concepto', () => {
    // Caso real: el primer SMS que probé quedó como "Rappi 19 40".
    const r = p('Bancolombia le informa Compra por $38.500 en RAPPI 18/09/2026 19:40');
    expect(r.concept.toLowerCase()).toBe('rappi');
    expect(r.amount).toBe(38_500);
  });

  it('la hora con am/pm tampoco', () => {
    expect(p('Compra por $10.000 en D1 15/09/2026 08:05 a.m.').concept.toLowerCase()).toBe('d1');
  });

  it('el número de autorización tampoco', () => {
    const r = p('Davivienda: Compra aprobada por $89.900 en NETFLIX Aut 123456');
    expect(r.concept.toLowerCase()).toBe('netflix');
  });

  it('el saldo que reporta el banco no se confunde con el comercio', () => {
    const r = p('Bancolombia Compra por $45.000 en EXITO. Saldo disponible 1200000');
    expect(r.amount).toBe(45_000);
    expect(r.concept.toLowerCase()).toBe('exito');
  });
});
