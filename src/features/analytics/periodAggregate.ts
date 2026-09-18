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

/* ---------------------------------------------------------------------
   Ventana del selector Mes / Trimestre / Año.

   Bug que arregla: el filtro anterior era solo `t.date >= inicio`, sin
   tope superior. Como materialize.ts crea recurrentes hasta 95 dias
   adelante, las tres opciones terminaban incluyendo el mismo futuro y
   las tarjetas (balance por categoria, distribucion de gastos, fijos vs
   variables) mostraban exactamente lo mismo en Mes, Trimestre y Año.
   Con `to` acotado, cada rango cubre solo su periodo.
--------------------------------------------------------------------- */
import { daysInMonth } from '@/domain/dates';
import type { Transaction } from '@/domain/types';

export type Range = 'mes' | 'trimestre' | 'año';

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Limites inclusivos [from, to] del rango que contiene a `today` ('YYYY-MM-DD'). */
export function rangeBounds(range: Range, today: string): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number) as [number, number];
  if (range === 'mes') {
    return { from: iso(y, m, 1), to: iso(y, m, daysInMonth(y, m)) };
  }
  if (range === 'trimestre') {
    const first = m - ((m - 1) % 3);
    const last = first + 2;
    return { from: iso(y, first, 1), to: iso(y, last, daysInMonth(y, last)) };
  }
  return { from: iso(y, 1, 1), to: iso(y, 12, 31) };
}

export function filterByRange(transactions: Transaction[], range: Range, today: string): Transaction[] {
  const { from, to } = rangeBounds(range, today);
  return transactions.filter((t) => t.date >= from && t.date <= to);
}
