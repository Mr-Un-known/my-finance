import { db } from '../db';
import type { Repository } from '../repository';
import type { Settings } from '@/domain/types';
import { importBackup } from '../backup/exportImport';
import { BackupSchema } from '../backup/schema';

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  currency: 'COP',
  locale: 'es-CO',
  quincenaStartDays: [10, 25], // quincena del 10 y quincena del 25
  defaultPaymentMethodId: null,
  reminderDefaultDaysBefore: 1,
  theme: 'system',
};

export const localRepository: Repository = {
  async getSettings() {
    return (await db.settings.get('singleton')) ?? DEFAULT_SETTINGS;
  },
  async saveSettings(settings) {
    await db.settings.put(settings);
  },

  listCategories: () => db.categories.orderBy('sortOrder').toArray(),
  saveCategory: async (category) => { await db.categories.put(category); },
  deleteCategory: async (id) => { await db.categories.delete(id); },

  listPaymentMethods: () => db.paymentMethods.toArray(),
  savePaymentMethod: async (method) => { await db.paymentMethods.put(method); },
  deletePaymentMethod: async (id) => { await db.paymentMethods.delete(id); },

  listTransactions: (range) =>
    range
      ? db.transactions.where('date').between(range.from, range.to, true, true).toArray()
      : db.transactions.toArray(),
  saveTransaction: async (tx) => { await db.transactions.put(tx); },
  deleteTransaction: async (id) => { await db.transactions.delete(id); },

  listRecurringRules: () => db.recurringRules.toArray(),
  saveRecurringRule: async (rule) => { await db.recurringRules.put(rule); },
  deleteRecurringRule: async (id) => { await db.recurringRules.delete(id); },

  listBudgets: (year, month) =>
    db.budgets.where('[year+month]').equals([year, month]).toArray(),
  saveBudget: async (budget) => { await db.budgets.put(budget); },

  listReminders: () => db.reminders.toArray(),
  saveReminder: async (reminder) => { await db.reminders.put(reminder); },

  async exportAll() {
    const [settings, categories, paymentMethods, transactions, recurringRules, budgets, reminders] =
      await Promise.all([
        db.settings.toArray(), db.categories.toArray(), db.paymentMethods.toArray(),
        db.transactions.toArray(), db.recurringRules.toArray(), db.budgets.toArray(),
        db.reminders.toArray(),
      ]);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings, categories, paymentMethods, transactions, recurringRules, budgets, reminders,
    };
  },

  async importAll(data) {
    const parsed = BackupSchema.parse(data); // el caller (UI) ya debe haber validado con parseBackupFile
    await importBackup(parsed);
  },
};
