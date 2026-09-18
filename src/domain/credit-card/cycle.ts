/**
 * Ciclo de tarjeta de credito.
 *
 * Regla (generica, NUNCA hardcodeada para un año):
 *  - Una compra hecha el dia D pertenece al corte de este mes si D <= cutoffDay
 *    (clampeado al ultimo dia del mes). Si D > cutoffDay, pertenece al corte
 *    del mes siguiente.
 *  - El pago cae el paymentDay del mes SIGUIENTE al corte.
 *
 * Ejemplo con cutoffDay=15, paymentDay=2:
 *   14 ene -> corte 15 ene -> pago 2 feb
 *   16 ene -> corte 15 feb -> pago 2 mar
 */
import { addDays, clampDay, parseISO, shiftMonth, toISO } from '../dates';
import type { ISODate } from '../types';

export interface CreditCardCycle {
  /** Primer dia del ciclo al que pertenece la compra. */
  cycleStart: ISODate;
  /** Fecha de corte del ciclo (el dia D queda incluido si D <= cutoffDay). */
  cycleCutoff: ISODate;
  /** Fecha en la que ese ciclo se paga. */
  paymentDate: ISODate;
}

export function calculateCreditCardCycle(
  purchaseDate: ISODate,
  cutoffDay = 15,
  paymentDay = 2,
): CreditCardCycle {
  const { y, m, d } = parseISO(purchaseDate);

  const cutoffThisMonth = clampDay(y, m, cutoffDay);
  const cutoffYM = d <= cutoffThisMonth ? { y, m } : shiftMonth(y, m, 1);
  const cutoffDayClamped = clampDay(cutoffYM.y, cutoffYM.m, cutoffDay);

  const payYM = shiftMonth(cutoffYM.y, cutoffYM.m, 1);
  const paymentDayClamped = clampDay(payYM.y, payYM.m, paymentDay);

  const prevCutoffYM = shiftMonth(cutoffYM.y, cutoffYM.m, -1);
  const prevCutoffDay = clampDay(prevCutoffYM.y, prevCutoffYM.m, cutoffDay);
  const cycleStart = addDays({ ...prevCutoffYM, d: prevCutoffDay }, 1);

  return {
    cycleStart: toISO(cycleStart),
    cycleCutoff: toISO({ ...cutoffYM, d: cutoffDayClamped }),
    paymentDate: toISO({ ...payYM, d: paymentDayClamped }),
  };
}
