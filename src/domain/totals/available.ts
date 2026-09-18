/**
 * Flujo del mes: los cuatro numeros que el usuario realmente necesita.
 *
 * Antes existia "Disponible ahora" = pagados - comprometidos, que sobre un
 * mes suelto daba casi siempre negativo (los gastos se registran, el sueldo
 * del mes todavia no llego / no se marco recibido) y no significaba nada.
 * Se reemplaza por el desglose explicito: lo que ya entro, lo que falta
 * entrar, lo que ya salio, lo que falta salir. Ninguno de los cuatro puede
 * ser negativo, y el neto se muestra etiquetado, no como "disponible".
 */
import type { Transaction } from '../types';

export interface MonthFlow {
  /** Ingresos ya recibidos (status 'paid'). */
  recibido: number;
  /** Ingresos que aun esperas recibir (pendientes + programados). */
  porRecibir: number;
  /** Gastos ya pagados. */
  pagado: number;
  /** Gastos que aun esperas pagar (pendientes + programados). */
  porPagar: number;
  /** Lo que realmente se movio ya: recibido - pagado. Puede ser negativo. */
  enCaja: number;
  /** Como queda el mes si todo se cumple: (recibido+porRecibir) - (pagado+porPagar). */
  proyectado: number;
}

export function calculateMonthFlow(transactions: Transaction[]): MonthFlow {
  let recibido = 0;
  let porRecibir = 0;
  let pagado = 0;
  let porPagar = 0;

  for (const tx of transactions) {
    if (tx.status === 'cancelled') continue;
    const paid = tx.status === 'paid';
    if (tx.type === 'income') {
      if (paid) recibido += tx.amount;
      else porRecibir += tx.amount;
    } else {
      if (paid) pagado += tx.amount;
      else porPagar += tx.amount;
    }
  }

  return {
    recibido,
    porRecibir,
    pagado,
    porPagar,
    enCaja: recibido - pagado,
    proyectado: recibido + porRecibir - (pagado + porPagar),
  };
}
