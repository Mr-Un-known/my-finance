/**
 * Convierte REGLAS recurrentes en INSTANCIAS reales dentro de una ventana
 * de tiempo. Corre al abrir la app y cada vez que se crea/edita una regla.
 *
 * Nunca toca una instancia que ya existe (no pisa si el usuario ya la
 * marco pagada o la edito) — solo agrega las que faltan. La proteccion
 * real contra duplicados es el indice UNICO [recurringRuleId+periodKey]
 * en Dexie (ver data/db.ts); esto solo evita el trabajo de más.
 */
import { addDays, parseISO, toISO } from '@/domain/dates';
import { calculateCreditCardCycle } from '@/domain/credit-card/cycle';
import { expandRecurringRule } from '@/domain/recurring/expansion';
import type { Transaction } from '@/domain/types';
import { nowISO, todayISO } from '@/lib/todayISO';
import { db } from '../db';

const WINDOW_BEFORE_DAYS = 31; // por si una regla quedo sin materializar el mes pasado
const WINDOW_AFTER_DAYS = 95; // ~3 meses hacia adelante, para "proximos pagos"

export async function materializeRecurringRules(): Promise<number> {
  const today = todayISO();
  const range = {
    from: toISO(addDays(parseISO(today), -WINDOW_BEFORE_DAYS)),
    to: toISO(addDays(parseISO(today), WINDOW_AFTER_DAYS)),
  };

  const [allRules, paymentMethods] = await Promise.all([
    db.recurringRules.toArray(),
    db.paymentMethods.toArray(),
  ]);
  const rules = allRules.filter((r) => r.isActive);
  const methodById = new Map(paymentMethods.map((m) => [m.id, m]));

  let created = 0;
  for (const rule of rules) {
    if (!rule.isActive) continue;
    const occurrences = expandRecurringRule(rule, range);
    for (const occ of occurrences) {
      const exists = await db.transactions
        .where('[recurringRuleId+periodKey]')
        .equals([rule.id, occ.periodKey])
        .first();
      if (exists) continue;

      const method = rule.paymentMethodId ? methodById.get(rule.paymentMethodId) : undefined;
      const cycle = method?.type === 'credit'
        ? calculateCreditCardCycle(occ.date, method.cutoffDay, method.paymentDay)
        : null;

      const now = nowISO();
      const tx: Transaction = {
        id: crypto.randomUUID(),
        type: rule.type,
        concept: rule.name,
        amount: rule.amount,
        date: occ.date,
        categoryId: rule.categoryId,
        paymentMethodId: rule.paymentMethodId,
        status: 'pending',
        quincenaKey: null,
        recurringRuleId: rule.id,
        periodKey: occ.periodKey,
        cycleCutoffDate: cycle?.cycleCutoff,
        cyclePaymentDate: cycle?.paymentDate,
        createdAt: now,
        updatedAt: now,
      };
      await db.transactions.add(tx);
      created += 1;
    }
  }
  return created;
}
