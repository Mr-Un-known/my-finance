import { describe, expect, it } from 'vitest';
import { describir, describirFecha } from './describe';
import { parseUtterance } from './parse';
import type { Category, PaymentMethod } from '../types';

const HOY = '2026-09-18';
const CATS: Category[] = [
  { id: 'cat-alimentacion', name: 'Alimentación', icon: '🍽️', color: '#E0A23B', kind: 'expense', isArchived: false, sortOrder: 0 },
];
const METS: PaymentMethod[] = [
  { id: 'pm-debito', type: 'debit', name: 'Débito', isDefault: true },
];

describe('describirFecha', () => {
  it('usa palabras, no fechas, para lo cercano', () => {
    expect(describirFecha('2026-09-18', HOY)).toBe('hoy');
    expect(describirFecha('2026-09-17', HOY)).toBe('ayer');
    expect(describirFecha('2026-09-16', HOY)).toBe('anteayer');
    expect(describirFecha('2026-09-19', HOY)).toBe('mañana');
  });

  it('para lo lejano dice la fecha', () => {
    expect(describirFecha('2026-09-05', HOY)).toBe('el 5 de septiembre');
  });
});

describe('describir', () => {
  const ctx = {
    hoy: HOY, categorias: CATS, metodos: METS,
    categoryId: 'cat-alimentacion' as string | null,
    paymentMethodId: 'pm-debito' as string | null,
    aprendida: false,
  };

  it('resume lo que va a guardar', () => {
    const d = describir(parseUtterance('gasté 45 mil en el almuerzo', HOY), ctx);
    expect(d.resumen).toBe('Gasto de $ 45.000, en Almuerzo, hoy, con Débito.');
    expect(d.falta).toBeNull();
  });

  it('dice qué falta en vez de inventarlo', () => {
    const d = describir(parseUtterance('gasté en el almuerzo', HOY), ctx);
    expect(d.falta).toBe('¿Cuánto fue?');
  });

  it('avisa cuando repite lo que aprendió', () => {
    const d = describir(parseUtterance('gasté 45 mil en almuerzo', HOY), { ...ctx, aprendida: true });
    expect(d.nota).toBe('Lo puse en Alimentación, como la última vez.');
  });

  it('cuando no sabe la categoría, lo dice y pide ayuda', () => {
    const d = describir(parseUtterance('gasté 10 mil en zzzz', HOY), { ...ctx, categoryId: null });
    expect(d.nota).toContain('No le encontré categoría');
  });

  it('un ingreso se describe como ingreso', () => {
    const d = describir(parseUtterance('me llegaron 2 millones de nómina', HOY), { ...ctx, categoryId: null, paymentMethodId: null });
    expect(d.resumen).toContain('Ingreso de $ 2.000.000');
  });
});
