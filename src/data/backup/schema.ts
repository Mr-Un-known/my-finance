/**
 * Esquema de validacion del backup. Nunca escribimos nada a la base de
 * datos sin pasar por aqui primero — un JSON corrupto o de otra app no
 * debe poder romper IndexedDB.
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida');

export const SettingsSchema = z.object({
  id: z.literal('singleton'),
  // Opcionales con default: un backup exportado antes de que existieran
  // estos campos tiene que seguir importandose sin error.
  displayName: z.string().default(''),
  onboardedAt: z.string().nullable().default(null),
  currency: z.string().min(1),
  locale: z.string().min(1),
  quincenaStartDays: z.tuple([z.number().int().min(1).max(31), z.number().int().min(1).max(31)]),
  defaultPaymentMethodId: z.string().nullable(),
  reminderDefaultDaysBefore: z.number().int().min(0),
  theme: z.enum(['system', 'light', 'dark']),
});

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  kind: z.enum(['expense', 'income', 'both']),
  isArchived: z.boolean(),
  sortOrder: z.number(),
});

export const PaymentMethodSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['debit', 'credit', 'cash', 'transfer']),
  name: z.string().min(1),
  isDefault: z.boolean(),
  cutoffDay: z.number().int().min(1).max(31).optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
});

export const TransactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['income', 'expense']),
  concept: z.string().min(1),
  amount: z.number(),
  date: isoDate,
  categoryId: z.string().nullable(),
  paymentMethodId: z.string().nullable(),
  status: z.enum(['paid', 'pending', 'scheduled', 'cancelled']),
  notes: z.string().optional(),
  cycleCutoffDate: isoDate.optional(),
  cyclePaymentDate: isoDate.optional(),
  quincenaKey: z.string().nullable(),
  recurringRuleId: z.string().optional(),
  periodKey: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RecurringRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  categoryId: z.string().nullable(),
  paymentMethodId: z.string().nullable(),
  frequency: z.enum(['monthly', 'weekly', 'biweekly', 'yearly']),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startDate: isoDate,
  endDate: isoDate.optional(),
  isActive: z.boolean(),
});

export const BudgetSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amount: z.number(),
});

export const ReminderSchema = z.object({
  id: z.string().min(1),
  transactionId: z.string().min(1),
  remindAt: z.string(),
  status: z.enum(['scheduled', 'sent', 'dismissed', 'failed']),
  sentAt: z.string().optional(),
});

export const BackupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  settings: z.array(SettingsSchema),
  categories: z.array(CategorySchema),
  paymentMethods: z.array(PaymentMethodSchema),
  transactions: z.array(TransactionSchema),
  recurringRules: z.array(RecurringRuleSchema),
  budgets: z.array(BudgetSchema),
  reminders: z.array(ReminderSchema),
});

export type Backup = z.infer<typeof BackupSchema>;
