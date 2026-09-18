/**
 * Agrega la serie mensual en trimestres o años. Presentacion, no dominio:
 * toma lo que ya calculo monthlySeries y lo reagrupa para la vista
 * seleccionada (Mes / Trimestre / Año).
 */
import type { MonthPoint } from '@/domain/analytics/series';

export interface PeriodPoint {
  label: string;
  income: number;
  expense: number;
}

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function toMonthlyPoints(points: MonthPoint[]): PeriodPoint[] {
  return points.map((p) => ({
    label: `${MONTH_ABBR[p.month - 1]} ${String(p.year).slice(2)}`,
    income: p.income,
    expense: p.expense,
  }));
}

export function toQuarterlyPoints(points: MonthPoint[]): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>();
  for (const p of points) {
    const q = Math.floor((p.month - 1) / 3) + 1;
    const key = `${p.year}-Q${q}`;
    const existing = map.get(key) ?? { label: `T${q} ${String(p.year).slice(2)}`, income: 0, expense: 0 };
    existing.income += p.income;
    existing.expense += p.expense;
    map.set(key, existing);
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
}

export function toYearlyPoints(points: MonthPoint[]): PeriodPoint[] {
  const map = new Map<number, PeriodPoint>();
  for (const p of points) {
    const existing = map.get(p.year) ?? { label: String(p.year), income: 0, expense: 0 };
    existing.income += p.income;
    existing.expense += p.expense;
    map.set(p.year, existing);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([, v]) => v);
}
