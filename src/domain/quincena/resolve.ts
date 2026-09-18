/**
 * Puente entre "calcular a que quincena pertenece una fecha" y "sumar por
 * quincena". Vive separado de balance.ts para que balance.ts se pueda
 * probar con datos de fixture sin depender de calculateQuincena.
 */
import { calculateQuincena } from './quincena';
import type { QuincenaKey, Transaction } from '../types';

export function resolveQuincenaKey(tx: Transaction, startDays: [number, number] = [10, 25]): QuincenaKey {
  return tx.quincenaKey ?? calculateQuincena(tx.date, startDays).key;
}

export function withResolvedQuincena<T extends Transaction>(
  transactions: T[],
  startDays: [number, number] = [10, 25],
): Array<T & { resolvedQuincenaKey: QuincenaKey }> {
  return transactions.map((tx) => ({ ...tx, resolvedQuincenaKey: resolveQuincenaKey(tx, startDays) }));
}
