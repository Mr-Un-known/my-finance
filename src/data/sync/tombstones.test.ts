import { describe, expect, it } from 'vitest';
import { deletedIdsOf, makeTombstone, mergeTombstones, tombstoneId } from './tombstones';

describe('tombstoneId', () => {
  it('es estable e idempotente', () => {
    expect(tombstoneId('transactions', 'abc')).toBe('transactions:abc');
    expect(makeTombstone('transactions', 'abc', '2026-01-01').id).toBe('transactions:abc');
  });

  it('no mezcla entidades con el mismo id', () => {
    expect(tombstoneId('categories', 'x')).not.toBe(tombstoneId('transactions', 'x'));
  });
});

describe('deletedIdsOf', () => {
  it('filtra por entidad', () => {
    const ts = [
      makeTombstone('transactions', 't1', '2026-01-01'),
      makeTombstone('categories', 'c1', '2026-01-01'),
      makeTombstone('transactions', 't2', '2026-01-01'),
    ];
    expect(deletedIdsOf(ts, 'transactions')).toEqual(new Set(['t1', 't2']));
    expect(deletedIdsOf(ts, 'categories')).toEqual(new Set(['c1']));
  });
});

describe('mergeTombstones', () => {
  it('se queda con la fecha del borrado original', () => {
    const viejo = makeTombstone('transactions', 't1', '2026-01-01T00:00:00Z');
    const copia = makeTombstone('transactions', 't1', '2026-05-05T00:00:00Z');
    expect(mergeTombstones([copia], [viejo])).toEqual([viejo]);
  });

  it('une sin duplicar', () => {
    const a = [makeTombstone('transactions', 't1', '2026-01-01')];
    const b = [makeTombstone('categories', 'c1', '2026-01-01')];
    expect(mergeTombstones(a, b)).toHaveLength(2);
  });
});
