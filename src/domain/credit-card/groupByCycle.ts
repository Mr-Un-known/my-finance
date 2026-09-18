/**
 * Agrupa compras de TC por su fecha de pago (el ciclo al que pertenecen).
 * Es la mitad "agregada" de la vista hibrida que pediste: cada compra se
 * ve individual, pero tambien como parte de un total por ciclo — el
 * equivalente calculado de la fila "Pago compras TC" de tu Excel.
 */
import { compareISO } from '../dates';
import type { Transaction } from '../types';

export interface CreditCycleGroup {
  paymentDate: string;
  total: number;
  count: number;
  transactions: Transaction[];
}

export function groupByCycle(creditTransactions: Transaction[]): CreditCycleGroup[] {
  const byDate = new Map<string, Transaction[]>();
  for (const tx of creditTransactions) {
    if (tx.status === 'cancelled' || !tx.cyclePaymentDate) continue;
    const list = byDate.get(tx.cyclePaymentDate) ?? [];
    list.push(tx);
    byDate.set(tx.cyclePaymentDate, list);
  }

  const groups: CreditCycleGroup[] = [];
  for (const [paymentDate, txs] of byDate) {
    const sorted = txs.slice().sort((a, b) => compareISO(a.date, b.date));
    groups.push({
      paymentDate,
      total: sorted.reduce((acc, t) => acc + t.amount, 0),
      count: sorted.length,
      transactions: sorted,
    });
  }
  return groups.sort((a, b) => compareISO(a.paymentDate, b.paymentDate));
}
