/**
 * Selecciona los proximos pagos para el dashboard: pendientes o
 * programados, ordenados por la fecha que realmente importa (la de pago
 * de TC si existe, si no la fecha del movimiento).
 */
import { compareISO } from '@/domain/dates';
import type { Transaction } from '@/domain/types';

export function relevantDate(tx: Transaction): string {
  return tx.cyclePaymentDate ?? tx.date;
}

export function selectUpcoming(transactions: Transaction[], limit = 5): Transaction[] {
  return transactions
    .filter((t) => t.status === 'pending' || t.status === 'scheduled')
    .slice()
    .sort((a, b) => compareISO(relevantDate(a), relevantDate(b)))
    .slice(0, limit);
}
