/**
 * Tipos del dominio. Esta carpeta NO importa React ni Supabase.
 *
 * Reglas duras:
 *  - El dinero es siempre un entero (pesos). Nunca float.
 *  - Las fechas de negocio son strings 'YYYY-MM-DD', nunca Date con hora.
 *    Esto evita que una compra del 15 a las 11pm caiga en el ciclo equivocado
 *    por zona horaria (Colombia = UTC-5).
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type Id = string;

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending' | 'scheduled' | 'cancelled';
export type PaymentMethodType = 'debit' | 'credit' | 'cash' | 'transfer';
export type Frequency = 'monthly' | 'biweekly' | 'weekly' | 'yearly';

/** Ej: '2026-09-Q1' (quincena del 10) | '2026-09-Q2' (quincena del 25) */
export type QuincenaKey = string;

export interface Settings {
  id: 'singleton';
  currency: string; // 'COP'
  locale: string; // 'es-CO'
  /** Dia en que arranca cada quincena. Por defecto [10, 25]. */
  quincenaStartDays: [number, number];
  defaultPaymentMethodId: Id | null;
  reminderDefaultDaysBefore: number;
  theme: 'system' | 'light' | 'dark';
}

export interface Category {
  id: Id;
  name: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income' | 'both';
  isArchived: boolean;
  sortOrder: number;
}

export interface PaymentMethod {
  id: Id;
  type: PaymentMethodType;
  name: string;
  isDefault: boolean;
  /** Solo si type === 'credit'. Configurables, nunca hardcodeados. */
  cutoffDay?: number; // 15
  paymentDay?: number; // 2
}

export interface Transaction {
  id: Id;
  type: TransactionType;
  concept: string;
  amount: number; // pesos enteros
  date: ISODate; // fecha de la compra / del ingreso
  categoryId: Id | null;
  paymentMethodId: Id | null;
  status: TransactionStatus;
  notes?: string;

  /** Derivados de TC, persistidos para que cambiar el corte no reescriba la historia. */
  cycleCutoffDate?: ISODate;
  cyclePaymentDate?: ISODate;

  /** null = se calcula por fecha. Con valor = el usuario lo movio a mano. */
  quincenaKey: QuincenaKey | null;

  /** Trazabilidad de recurrencia. UNIQUE(recurringRuleId, periodKey) en la DB. */
  recurringRuleId?: Id;
  periodKey?: string; // '2026-09'

  createdAt: string;
  updatedAt: string;
}

export interface RecurringRule {
  id: Id;
  name: string;
  type: TransactionType;
  amount: number;
  categoryId: Id | null;
  paymentMethodId: Id | null;
  frequency: Frequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: ISODate;
  endDate?: ISODate;
  isActive: boolean;
}

export interface Budget {
  id: Id;
  categoryId: Id;
  year: number;
  month: number; // 1-12
  amount: number;
}

export interface Reminder {
  id: Id;
  transactionId: Id;
  remindAt: string; // ISO datetime
  status: 'scheduled' | 'sent' | 'dismissed' | 'failed';
  sentAt?: string;
}
