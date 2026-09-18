import { describe, expect, it } from 'vitest';
import { categoriaFinal, metodoPorTipo } from './resolve';
import type { PaymentMethod } from '../types';

const METODOS: PaymentMethod[] = [
  { id: 'pm-debito', type: 'debit', name: 'Débito', isDefault: true },
  { id: 'pm-tc', type: 'credit', name: 'Tarjeta de crédito', isDefault: false },
];

describe('metodoPorTipo', () => {
  it('encuentra el método real del usuario', () => {
    expect(metodoPorTipo(METODOS, 'credit')).toBe('pm-tc');
    expect(metodoPorTipo(METODOS, 'debit')).toBe('pm-debito');
  });

  it('sin mención, no elige nada: manda el default del form', () => {
    expect(metodoPorTipo(METODOS, null)).toBeNull();
  });

  it('un tipo que el usuario no tiene configurado no inventa uno', () => {
    expect(metodoPorTipo(METODOS, 'cash')).toBeNull();
  });
});

describe('categoriaFinal', () => {
  const existentes = ['cat-alimentacion', 'cat-transporte'];

  it('lo aprendido le gana a la palabra clave', () => {
    expect(categoriaFinal('cat-transporte', 'cat-alimentacion', existentes)).toBe('cat-transporte');
  });

  it('sin nada aprendido usa la palabra clave', () => {
    expect(categoriaFinal(null, 'cat-alimentacion', existentes)).toBe('cat-alimentacion');
  });

  it('no propone una categoría que el usuario borró', () => {
    expect(categoriaFinal('cat-viajes', 'cat-alimentacion', existentes)).toBe('cat-alimentacion');
    expect(categoriaFinal(null, 'cat-viajes', existentes)).toBeNull();
  });

  it('sin nada, no propone nada', () => {
    expect(categoriaFinal(null, null, existentes)).toBeNull();
  });
});
