const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** '2026-09-17' -> '17 sep'. Solo para UI; nunca usar esto en domain/. */
export function formatShortDate(iso: string): { day: number; month: string; monthIndex: number } {
  const parts = iso.split('-').map(Number);
  const m = parts[1];
  const d = parts[2];
  if (m === undefined || d === undefined) throw new Error(`Fecha invalida: "${iso}"`);
  const monthName = MONTHS[m - 1];
  if (monthName === undefined) throw new Error(`Mes invalido en fecha: "${iso}"`);
  return { day: d, month: monthName, monthIndex: m };
}
