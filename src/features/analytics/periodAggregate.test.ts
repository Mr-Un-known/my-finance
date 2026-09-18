import { describe, expect, it } from 'vitest';
import { toQuarterlyPoints, toYearlyPoints } from './periodAggregate';
import type { MonthPoint } from '@/domain/analytics/series';

describe('toQuarterlyPoints', () => {
  it('agrupa meses en su trimestre correcto', () => {
    const points: MonthPoint[] = [
      { year: 2026, month: 1, income: 100, expense: 50 },
      { year: 2026, month: 2, income: 100, expense: 50 },
      { year: 2026, month: 4, income: 200, expense: 0 },
    ];
    const result = toQuarterlyPoints(points);
    expect(result).toEqual([
      { label: 'T1 26', income: 200, expense: 100 },
      { label: 'T2 26', income: 200, expense: 0 },
    ]);
  });
});

describe('toYearlyPoints', () => {
  it('agrupa meses por año', () => {
    const points: MonthPoint[] = [
      { year: 2025, month: 12, income: 100, expense: 0 },
      { year: 2026, month: 1, income: 50, expense: 20 },
    ];
    expect(toYearlyPoints(points)).toEqual([
      { label: '2025', income: 100, expense: 0 },
      { label: '2026', income: 50, expense: 20 },
    ]);
  });
});
