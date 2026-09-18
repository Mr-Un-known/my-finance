/**
 * Kernel de fechas. Todo el resto del dominio pasa por aqui para
 * aritmetica de meses/dias. Usa exclusivamente metodos UTC de Date
 * (nunca metodos locales) para que el resultado no dependa de la
 * zona horaria de quien ejecuta el codigo.
 */
import type { ISODate } from './types';

export interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

export function parseISO(date: ISODate): YMD {
  const parts = date.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Fecha ISO invalida: "${date}" (se esperaba 'YYYY-MM-DD')`);
  }
  return { y, m, d };
}

export function toISO({ y, m, d }: YMD): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Ultimo dia del mes m (1-12) del año y. Maneja bisiestos automaticamente. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Clampea day al rango valido del mes, nunca produce un dia inexistente. */
export function clampDay(y: number, m: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(y, m));
}

/** Suma (o resta) meses de forma exacta, sin el "desborde" de Date nativo. */
export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta;
  const y2 = Math.floor(total / 12);
  const m2 = total - y2 * 12 + 1;
  return { y: y2, m: m2 };
}

export function addDays(ymd: YMD, days: number): YMD {
  const base = Date.UTC(ymd.y, ymd.m - 1, ymd.d);
  const shifted = new Date(base + days * 86_400_000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function weekdayOf({ y, m, d }: YMD): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 domingo .. 6 sabado
}
