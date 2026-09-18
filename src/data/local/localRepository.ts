import { db } from '../db';
import type { Repository } from '../repository';
import type { Settings } from '@/domain/types';
import { importBackup } from '../backup/exportImport';
import { BackupSchema } from '../backup/schema';
import { normalize } from '@/domain/inference/conceptInference';
import { makeTombstone, type DeletableEntity } from '../sync/tombstones';

/**
 * Todo borrado deja lapida. Es lo que permite que el borrado viaje a los
 * otros dispositivos en vez de que ellos lo resuciten en el siguiente
 * sync (ver data/sync/tombstones.ts).
 */
async function borrarConLapida(entity: DeletableEntity, id: string): Promise<void> {
  await db.deletions.put(makeTombstone(entity, id, new Date().toISOString()));
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  displayName: '',
  currency: 'COP',
  locale: 'es-CO',
  quincenaStartDays: [10, 25], // quincena del 10 y quincena del 25
  defaultPaymentMethodId: null,
  reminderDefaultDaysBefore: 1,
  theme: 'system',
  onboardedAt: null,
  // Vacio a proposito: una fila que nunca se guardo no puede ganarle a
  // ninguna de la nube en la comparacion de "cual es mas nueva".
  updatedAt: '',
};

/**
 * Rellena con los defaults los campos que falten. Sin esto, cada campo
 * nuevo de Settings deja `undefined` en la base de quien ya venia usando
 * la app (displayName, onboardedAt...) y la UI se rompe en silencio.
 */
export function withDefaults(stored: Settings | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}), id: 'singleton' };
}

export const localRepository: Repository = {
  async getSettings() {
    return withDefaults(await db.settings.get('singleton'));
  },
  async saveSettings(settings) {
    // La marca de tiempo se pone aca y no en cada pantalla: es el unico
    // lugar por el que pasan todos los guardados, asi que es imposible
    // olvidarse y dejar un Settings que la sincronizacion no sepa fechar.
    await db.settings.put({ ...settings, updatedAt: new Date().toISOString() });
  },

  listCategories: () => db.categories.orderBy('sortOrder').toArray(),
  saveCategory: async (category) => { await db.categories.put(category); },
  deleteCategory: async (id) => { await db.categories.delete(id); await borrarConLapida('categories', id); },

  listPaymentMethods: () => db.paymentMethods.toArray(),
  savePaymentMethod: async (method) => { await db.paymentMethods.put(method); },
  deletePaymentMethod: async (id) => { await db.paymentMethods.delete(id); await borrarConLapida('paymentMethods', id); },

  listTransactions: (range) =>
    range
      ? db.transactions.where('date').between(range.from, range.to, true, true).toArray()
      : db.transactions.toArray(),
  saveTransaction: async (tx) => {
    await db.transactions.put(tx);
    // Actualiza el índice de conceptos para el smart-fill del form.
    // Solo entradas manuales del user (no las materializadas por reglas
    // recurrentes) alimentan el índice: si el user vuelve a ese concepto,
    // quiere recuperar la última categoría/método que usó.
    if (!tx.recurringRuleId && tx.concept.trim()) {
      const key = normalize(tx.concept);
      if (key) {
        const prev = await db.conceptIndex.get(key);
        await db.conceptIndex.put({
          id: key,
          displayName: tx.concept.trim(),
          categoryId: tx.categoryId,
          paymentMethodId: tx.paymentMethodId,
          count: (prev?.count ?? 0) + 1,
          lastUsedAt: tx.updatedAt,
        });
      }
    }
  },
  deleteTransaction: async (id) => { await db.transactions.delete(id); await borrarConLapida('transactions', id); },

  listRecurringRules: () => db.recurringRules.toArray(),
  saveRecurringRule: async (rule) => { await db.recurringRules.put(rule); },
  deleteRecurringRule: async (id) => { await db.recurringRules.delete(id); await borrarConLapida('recurringRules', id); },

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
