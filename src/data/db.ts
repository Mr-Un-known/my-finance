import Dexie, { type EntityTable } from 'dexie';
import type {
  Budget, Category, PaymentMethod, RecurringRule, Reminder, Settings, Transaction,
} from '@/domain/types';

/**
 * Nombre con prefijo propio: en GitHub Pages todos los proyectos de
 * <usuario>.github.io comparten origen, asi que la DB no puede llamarse
 * algo generico o chocaria con otro proyecto.
 */
export const DB_NAME = 'myfinance_v1';

export class MyFinanceDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  paymentMethods!: EntityTable<PaymentMethod, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  recurringRules!: EntityTable<RecurringRule, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  reminders!: EntityTable<Reminder, 'id'>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      settings: 'id',
      categories: 'id, sortOrder',
      paymentMethods: 'id, type',
      // El indice compuesto [recurringRuleId+periodKey] es UNICO: es lo que
      // hace imposible duplicar "Arriendo septiembre 2026".
      transactions:
        'id, date, type, status, categoryId, paymentMethodId, quincenaKey, cyclePaymentDate, &[recurringRuleId+periodKey]',
      recurringRules: 'id, frequency',
      budgets: 'id, [year+month], categoryId',
      reminders: 'id, remindAt, status, transactionId',
    });
  }
}

export const db = new MyFinanceDB();
