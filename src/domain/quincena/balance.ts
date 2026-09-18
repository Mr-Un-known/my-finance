/**
 * Restante por quincena y sobrante del mes.
 *
 * Regla (viene directo de tu Excel): el restante de una quincena es
 * ingresos - gastos de esa quincena, SIN filtrar por si ya estan pagados
 * (el checkbox "Ready" es seguimiento aparte, no cambia la matematica).
 * "Cancelado" si se excluye: un gasto cancelado nunca debio contar.
 *
 * "Sobrante del mes" = suma de los dos restantes. Verificado contra tu
 * hoja: 1.215.000 + 1.167.006 = 2.382.006.
 */
import { quincenaKey } from './quincena';
import type { QuincenaKey, Transaction } from '../types';

export interface QuincenaBalance {
  key: QuincenaKey;
  income: number;
  expense: number;
  restante: number;
}

export interface MonthBalance {
  year: number;
  month: number;
  income: number;
  expense: number;
  sobrante: number;
  quincenas: [QuincenaBalance, QuincenaBalance];
}

/**
 * transactions ya debe traer, para cada una, la quincena resuelta
 * (tx.quincenaKey manual, o la calculada con calculateQuincena en la capa
 * que lee de la base de datos). Este archivo no importa calculateQuincena
 * para no acoplar "sumar" con "calcular fecha" — se prueban por separado.
 */
export function calculateQuincenaBalance(
  transactionsWithKey: Array<Transaction & { resolvedQuincenaKey: QuincenaKey }>,
  key: QuincenaKey,
): QuincenaBalance {
  let income = 0;
  let expense = 0;
  for (const tx of transactionsWithKey) {
    if (tx.status === 'cancelled') continue;
    if (tx.resolvedQuincenaKey !== key) continue;
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  return { key, income, expense, restante: income - expense };
}

export function calculateMonthBalance(
  transactionsWithKey: Array<Transaction & { resolvedQuincenaKey: QuincenaKey }>,
  year: number,
  month: number,
): MonthBalance {
  const [k1, k2] = [quincenaKey(year, month, 1), quincenaKey(year, month, 2)];
  const q1 = calculateQuincenaBalance(transactionsWithKey, k1);
  const q2 = calculateQuincenaBalance(transactionsWithKey, k2);
  return {
    year,
    month,
    income: q1.income + q2.income,
    expense: q1.expense + q2.expense,
    sobrante: q1.restante + q2.restante,
    quincenas: [q1, q2],
  };
}
