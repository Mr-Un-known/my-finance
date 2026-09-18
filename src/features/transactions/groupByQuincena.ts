/**
 * Agrupa transacciones por quincena para la lista. Presentacion (labels,
 * colores), no logica de negocio — la matematica real vive en
 * domain/quincena/*. Este archivo solo la organiza para pantalla.
 */
import { compareISO } from '@/domain/dates';
import { calculateQuincenaBalance, type QuincenaBalance } from '@/domain/quincena/balance';
import { rangeOfQuincenaKey } from '@/domain/quincena/quincena';
import { withResolvedQuincena } from '@/domain/quincena/resolve';
import type { QuincenaKey, Transaction } from '@/domain/types';

import { formatShortDate } from '@/lib/formatShortDate';

function formatRangeLabel(start: string, end: string): string {
  const s = formatShortDate(start);
  const e = formatShortDate(end);
  return s.month === e.month ? `${s.day} - ${e.day} ${s.month}` : `${s.day} ${s.month} - ${e.day} ${e.month}`;
}

export interface QuincenaGroup {
  key: QuincenaKey;
  label: string;
  rangeLabel: string;
  start: string;
  colorVar: '--q10' | '--q25';
  softVar: '--q10-soft' | '--q25-soft';
  balance: QuincenaBalance;
  transactions: Transaction[];
}

export function groupByQuincena(
  transactions: Transaction[],
  startDays: [number, number] = [10, 25],
): QuincenaGroup[] {
  const [a, b] = startDays[0] < startDays[1] ? startDays : [startDays[1], startDays[0]];
  const resolved = withResolvedQuincena(transactions, startDays);

  const byKey = new Map<QuincenaKey, Transaction[]>();
  for (const tx of resolved) {
    const list = byKey.get(tx.resolvedQuincenaKey) ?? [];
    list.push(tx);
    byKey.set(tx.resolvedQuincenaKey, list);
  }

  const groups: QuincenaGroup[] = [];
  for (const key of byKey.keys()) {
    const range = rangeOfQuincenaKey(key, startDays);
    const isQ1 = key.endsWith('Q1');
    const txs = (byKey.get(key) ?? []).slice().sort((x, y) => compareISO(y.date, x.date));
    groups.push({
      key,
      label: `Quincena del ${isQ1 ? a : b}`,
      rangeLabel: formatRangeLabel(range.start, range.end),
      start: range.start,
      colorVar: isQ1 ? '--q10' : '--q25',
      softVar: isQ1 ? '--q10-soft' : '--q25-soft',
      balance: calculateQuincenaBalance(resolved, key),
      transactions: txs,
    });
  }

  // Cronologico: la quincena del 10 antes que la del 25.
  //
  // Antes iba al reves (mas reciente primero), que es lo correcto para un
  // feed infinito pero no para un mes: la lista se abre en la quincena del
  // 25 y hay que bajar para ver como empezo el mes. Con la ventana de mes
  // ya acotada, leer en orden es lo natural.
  return groups.sort((x, y) => compareISO(x.start, y.start));
}
