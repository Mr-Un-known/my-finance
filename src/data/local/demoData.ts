/**
 * Datos de EJEMPLO (Fase 0, seccion 33). A proposito usa montos ficticios
 * distintos a los reales del usuario — el pedido explicito fue "no
 * inventes mis finanzas reales", asi que estos numeros son solo para
 * mostrar como se ve la app funcionando.
 */
import { addDays, parseISO, toISO } from '@/domain/dates';
import { calculateCreditCardCycle } from '@/domain/credit-card/cycle';
import type { Transaction } from '@/domain/types';
import { todayISO, nowISO } from '@/lib/todayISO';
import { db } from '../db';

function relativeDate(daysFromToday: number): string {
  return toISO(addDays(parseISO(todayISO()), daysFromToday));
}

export async function seedDemoTransactions(): Promise<void> {
  const now = nowISO();
  const tcPurchaseDate = relativeDate(-2);
  const tcCycle = calculateCreditCardCycle(tcPurchaseDate, 15, 2);

  const demo: Transaction[] = [
    {
      id: crypto.randomUUID(), type: 'income', concept: 'Ingreso de ejemplo',
      amount: 2_800_000, date: relativeDate(-5), categoryId: null, paymentMethodId: 'pm-debito',
      status: 'paid', quincenaKey: null, createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Arriendo (ejemplo)',
      amount: 1_800_000, date: relativeDate(-4), categoryId: 'cat-hogar', paymentMethodId: 'pm-debito',
      status: 'paid', quincenaKey: null, createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Suscripción streaming',
      amount: 24_900, date: relativeDate(-6), categoryId: 'cat-suscripciones', paymentMethodId: 'pm-debito',
      status: 'paid', quincenaKey: null, createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Mercado',
      amount: 145_000, date: relativeDate(-1), categoryId: 'cat-alimentacion', paymentMethodId: 'pm-debito',
      status: 'pending', quincenaKey: null, createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Gasolina',
      amount: 60_000, date: relativeDate(-3), categoryId: 'cat-transporte', paymentMethodId: 'pm-debito',
      status: 'paid', quincenaKey: null, createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Cine',
      amount: 38_000, date: relativeDate(0), categoryId: 'cat-entretenimiento', paymentMethodId: 'pm-tc',
      status: 'pending', quincenaKey: null,
      cycleCutoffDate: calculateCreditCardCycle(relativeDate(0), 15, 2).cycleCutoff,
      cyclePaymentDate: calculateCreditCardCycle(relativeDate(0), 15, 2).paymentDate,
      createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Zapatos (ejemplo)',
      amount: 210_000, date: tcPurchaseDate, categoryId: 'cat-compras', paymentMethodId: 'pm-tc',
      status: 'pending', quincenaKey: null,
      cycleCutoffDate: tcCycle.cycleCutoff, cyclePaymentDate: tcCycle.paymentDate,
      createdAt: now, updatedAt: now,
    },
    {
      id: crypto.randomUUID(), type: 'expense', concept: 'Gasto programado (ejemplo)',
      amount: 200_000, date: relativeDate(6), categoryId: 'cat-otros', paymentMethodId: 'pm-debito',
      status: 'scheduled', quincenaKey: null, createdAt: now, updatedAt: now,
    },
  ];

  await db.transactions.bulkPut(demo);
}
