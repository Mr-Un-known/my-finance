/**
 * Puente entre "a que periodo pertenece esta fecha" y "sumar por periodo".
 * Vive separado de balance.ts para que aquel se pueda probar con datos de
 * fixture sin depender del calculo de fechas.
 */
import { calcularPeriodo, DIAS_DE_PAGO_POR_DEFECTO, type DiasDePago } from './periodo';
import type { QuincenaKey, Transaction } from '../types';

/**
 * tx.quincenaKey manda si esta puesta a mano; si no, se calcula.
 *
 * El nombre del campo sigue siendo quincenaKey porque asi se llama la
 * columna en Postgres y renombrarla pediria una migracion sin ganar nada:
 * el contenido es, y siempre fue, la clave del periodo.
 */
export function resolverPeriodo(tx: Transaction, dias: DiasDePago = DIAS_DE_PAGO_POR_DEFECTO): QuincenaKey {
  return tx.quincenaKey ?? calcularPeriodo(tx.date, dias).key;
}

export function conPeriodoResuelto<T extends Transaction>(
  transactions: T[],
  dias: DiasDePago = DIAS_DE_PAGO_POR_DEFECTO,
): Array<T & { resolvedQuincenaKey: QuincenaKey }> {
  return transactions.map((tx) => ({ ...tx, resolvedQuincenaKey: resolverPeriodo(tx, dias) }));
}
