import { describe, expect, it } from 'vitest';
import { inferFromConcept, normalize, topRecents, type ConceptIndexEntry } from './conceptInference';

describe('normalize', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Uber  ')).toBe('uber');
  });
  it('removes accents', () => {
    expect(normalize('Café')).toBe('cafe');
    expect(normalize('Panadería')).toBe('panaderia');
  });
  it('removes punctuation', () => {
    expect(normalize("Rappi!!")).toBe('rappi');
    expect(normalize('Mc-Donalds')).toBe('mcdonalds');
  });
  it('collapses whitespace', () => {
    expect(normalize('  Uber   Eats  ')).toBe('uber eats');
  });
});

const idx: ConceptIndexEntry[] = [
  { id: 'uber', displayName: 'Uber', categoryId: 'c-transp', paymentMethodId: 'pm-tc', count: 12, lastUsedAt: '2026-09-15T10:00:00.000Z' },
  { id: 'uber eats', displayName: 'Uber Eats', categoryId: 'c-comida', paymentMethodId: 'pm-tc', count: 4, lastUsedAt: '2026-09-14T10:00:00.000Z' },
  { id: 'cafe', displayName: 'Café', categoryId: 'c-comida', paymentMethodId: 'pm-efectivo', count: 30, lastUsedAt: '2026-09-16T10:00:00.000Z' },
];

const fallback = { categoryId: 'c-default', paymentMethodId: 'pm-default' };

describe('inferFromConcept', () => {
  it('matches exact (case insensitive, accent insensitive)', () => {
    expect(inferFromConcept('Uber', idx, fallback)).toMatchObject({ categoryId: 'c-transp', paymentMethodId: 'pm-tc', confidence: 'exact' });
    expect(inferFromConcept('cafe', idx, fallback)).toMatchObject({ categoryId: 'c-comida', paymentMethodId: 'pm-efectivo', confidence: 'exact' });
    expect(inferFromConcept('Café', idx, fallback)).toMatchObject({ confidence: 'exact' });
  });

  it('matches prefix when >=3 chars, tie-breaks by count then recency', () => {
    // "ube" matches both "uber" and "uber eats"; "uber" wins by count (12 > 4).
    expect(inferFromConcept('ube', idx, fallback)).toMatchObject({ categoryId: 'c-transp', confidence: 'prefix' });
  });

  it('falls back when no match', () => {
    expect(inferFromConcept('Xyz', idx, fallback)).toMatchObject({ categoryId: 'c-default', confidence: 'fallback' });
  });

  it('falls back on empty or very short input', () => {
    expect(inferFromConcept('', idx, fallback)).toMatchObject({ confidence: 'fallback' });
    expect(inferFromConcept('ub', idx, fallback)).toMatchObject({ confidence: 'fallback' });
  });
});

describe('topRecents', () => {
  it('sorts by lastUsedAt desc', () => {
    expect(topRecents(idx, 2).map((e) => e.id)).toEqual(['cafe', 'uber']);
  });
});
