import Dexie, { type EntityTable } from 'dexie';
import type {
  Budget, Category, PaymentMethod, RecurringRule, Reminder, Settings, Transaction,
} from '@/domain/types';
import type { ConceptIndexEntry } from '@/domain/inference/conceptInference';
import type { Tombstone } from './sync/tombstones';
import type { MetaFila } from './sync/dueno';

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
  conceptIndex!: EntityTable<ConceptIndexEntry, 'id'>;
  deletions!: EntityTable<Tombstone, 'id'>;
  /** Datos del dispositivo, nunca sincronizados. Ver sync/dueno.ts. */
  meta!: EntityTable<MetaFila, 'id'>;

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
    // v2: conceptIndex — memoria del form de gasto/ingreso para autofill.
    // Cada save de tx upsertea aquí, y el form al abrir consulta.
    this.version(2).stores({
      conceptIndex: 'id, lastUsedAt, count',
    });
    // v3: lapidas de borrado. Sin ellas, sincronizar resucita lo borrado
    // (ver data/sync/tombstones.ts).
    this.version(3).stores({
      deletions: 'id, entity, deletedAt',
    });
    // v4: de quién son estos datos. Sin esto, cerrar sesión y entrar con
    // otra cuenta en el mismo navegador subía los movimientos de la
    // primera persona a la cuenta de la segunda (ver sync/dueno.ts).
    this.version(4).stores({
      meta: 'id',
    });
  }
}

export const db = new MyFinanceDB();
