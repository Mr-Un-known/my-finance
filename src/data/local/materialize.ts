/**
 * Convierte REGLAS recurrentes en INSTANCIAS reales dentro de una ventana
 * de tiempo.
 *
 * Nunca toca una instancia que ya existe (no pisa si el usuario ya la
 * marco pagada o la edito) — solo agrega las que faltan. La proteccion
 * real contra duplicados es el indice UNICO [recurringRuleId+periodKey]
 * en Dexie (ver data/db.ts); esto solo evita el trabajo de mas.
 *
 * La ventana es un parametro. Antes era fija en +95 dias desde hoy, asi
 * que una regla "sin fecha limite" creada en septiembre se cortaba en
 * diciembre y los meses siguientes salian vacios. Ahora la pantalla pide
 * explicitamente el mes que esta mirando (ensureMonthMaterialized).
 */
import { addDays, daysInMonth, parseISO, toISO } from '@/domain/dates';
import { calculateCreditCardCycle } from '@/domain/credit-card/cycle';
import { expandRecurringRule } from '@/domain/recurring/expansion';
import type { ISODate, Transaction } from '@/domain/types';
import { nowISO, todayISO } from '@/lib/todayISO';
import { db } from '../db';

const WINDOW_BEFORE_DAYS = 31; // por si una regla quedo sin materializar el mes pasado
const WINDOW_AFTER_DAYS = 95; // ~3 meses hacia adelante, para "proximos pagos"

export interface Range {
  from: ISODate;
  to: ISODate;
}

/** La ventana por defecto del arranque: el mes pasado y los ~3 siguientes. */
export function defaultRange(today = todayISO()): Range {
  const t = parseISO(today);
  return {
    from: toISO(addDays(t, -WINDOW_BEFORE_DAYS)),
    to: toISO(addDays(t, WINDOW_AFTER_DAYS)),
  };
}

export async function materializeRecurringRules(range: Range = defaultRange()): Promise<number> {
  const [allRules, paymentMethods] = await Promise.all([
    db.recurringRules.toArray(),
    db.paymentMethods.toArray(),
  ]);
  const rules = allRules.filter((r) => r.isActive);
  if (rules.length === 0) return 0;

  const methodById = new Map(paymentMethods.map((m) => [m.id, m]));

  // Una sola lectura de lo que ya existe, en vez de un query por ocurrencia.
  // Con una ventana de un año son ~12 ocurrencias por regla y antes eso
  // eran 12 round-trips a IndexedDB por regla, en cada cambio de mes.
  const existing = new Set<string>();
  await db.transactions.each((tx) => {
    if (tx.recurringRuleId && tx.periodKey) existing.add(`${tx.recurringRuleId}|${tx.periodKey}`);
  });

  const nuevas: Transaction[] = [];
  for (const rule of rules) {
    const method = rule.paymentMethodId ? methodById.get(rule.paymentMethodId) : undefined;
    for (const occ of expandRecurringRule(rule, range)) {
      if (existing.has(`${rule.id}|${occ.periodKey}`)) continue;
      existing.add(`${rule.id}|${occ.periodKey}`);

      const cycle = method?.type === 'credit'
        ? calculateCreditCardCycle(occ.date, method.cutoffDay, method.paymentDay)
        : null;

      const now = nowISO();
      nuevas.push({
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
      });
    }
  }

  if (nuevas.length === 0) return 0;
  // bulkAdd tolerante: si otra pestaña metio la misma instancia primero,
  // el indice unico rechaza esa fila sola en vez de tumbar todo el lote.
  await db.transactions.bulkAdd(nuevas).catch((e: unknown) => {
    if (!(e instanceof Error) || !e.name.includes('Bulk')) throw e;
  });
  return nuevas.length;
}

/**
 * Asegura que un mes concreto tenga sus instancias recurrentes. Lo llaman
 * Inicio y Movimientos cada vez que cambia el mes visible, para que
 * navegar a marzo del año que viene muestre el arriendo igual que hoy.
 *
 * Se pide el mes entero mas un colchon de 10 dias a cada lado: la
 * "quincena del 25" de un mes se estira hasta el 9 del siguiente.
 */
export async function ensureMonthMaterialized(year: number, month: number): Promise<number> {
  const from = toISO(addDays({ y: year, m: month, d: 1 }, -10));
  const to = toISO(addDays({ y: year, m: month, d: daysInMonth(year, month) }, 10));
  return materializeRecurringRules({ from, to });
}
