/**
 * Los tres numeros del dashboard (Fase 0, seccion 4):
 *   Disponible   = ingresos ya recibidos (pagados) - gastos ya pagados
 *   Comprometido = gastos pendientes + programados (lo que ya no es tuyo
 *                  aunque no haya salido de la cuenta)
 *   Libre real   = Disponible - Comprometido
 *
 * "Libre real" es el numero grande del dashboard, no el saldo del banco.
 */
import type { Transaction } from '../types';

export interface AvailableBalance {
  disponible: number;
  comprometido: number;
  libreReal: number;
}

export function calculateAvailableBalance(transactions: Transaction[]): AvailableBalance {
  let paidIncome = 0;
  let paidExpense = 0;
  let comprometido = 0;

  for (const tx of transactions) {
    if (tx.status === 'cancelled') continue;

    if (tx.status === 'paid') {
      if (tx.type === 'income') paidIncome += tx.amount;
      else paidExpense += tx.amount;
    } else if (tx.type === 'expense' && (tx.status === 'pending' || tx.status === 'scheduled')) {
      comprometido += tx.amount;
    }
  }

  const disponible = paidIncome - paidExpense;
  return { disponible, comprometido, libreReal: disponible - comprometido };
}
