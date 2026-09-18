/**
 * Sincronizacion entre IndexedDB (fuente de verdad offline) y Supabase.
 *
 * Estrategia: last-write-wins por updatedAt, mas lapidas para los
 * borrados (sin ellas, el dispositivo que todavia tiene la fila la
 * resucita en el siguiente push — ver tombstones.ts).
 *
 * Orden de un ciclo completo:
 *   1. bajar lapidas remotas y aplicarlas aca
 *   2. bajar filas y quedarse con las mas nuevas que las locales
 *   3. subir las lapidas locales y borrar esas filas alla
 *   4. subir las filas locales mas nuevas que las remotas
 *
 * Las lapidas van ANTES que las filas en cada direccion: si no, se sube
 * una fila y acto seguido se borra, o peor, se baja una fila que ya
 * estaba borrada.
 */
import { db } from '../db';
import { supabaseRepository } from '../supabase/supabaseRepository';
import { applyRemoteDeletions, listRemoteTombstones, saveRemoteTombstones } from '../supabase/deletions';
import { deletedIdsOf, mergeTombstones, type Tombstone } from './tombstones';
import type { Transaction } from '@/domain/types';

export interface SyncResult {
  pushed: number;
  pulled: number;
  deleted: number;
}

function newer(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}

/** Aplica localmente los borrados que vienen de otro dispositivo. */
async function applyTombstonesLocally(tombstones: Tombstone[]): Promise<number> {
  if (tombstones.length === 0) return 0;
  const tabla = {
    transactions: db.transactions,
    categories: db.categories,
    paymentMethods: db.paymentMethods,
    recurringRules: db.recurringRules,
  } as const;

  let borrados = 0;
  for (const t of tombstones) {
    const existe = await tabla[t.entity].get(t.entityId);
    if (existe) {
      await tabla[t.entity].delete(t.entityId);
      borrados += 1;
    }
  }
  return borrados;
}

export async function pullCloudToLocal(): Promise<SyncResult> {
  const remoteTombstones = await listRemoteTombstones();
  const localTombstones = await db.deletions.toArray();
  const todas = mergeTombstones(localTombstones, remoteTombstones);
  await db.deletions.bulkPut(todas);
  const deleted = await applyTombstonesLocally(remoteTombstones);

  const [remoteTx, categories, methods, rules, settings] = await Promise.all([
    supabaseRepository.listTransactions(),
    supabaseRepository.listCategories(),
    supabaseRepository.listPaymentMethods(),
    supabaseRepository.listRecurringRules(),
    supabaseRepository.getSettings(),
  ]);

  // Nada que este borrado vuelve a entrar, venga de donde venga.
  const borradoTx = deletedIdsOf(todas, 'transactions');
  const borradoCat = deletedIdsOf(todas, 'categories');
  const borradoPm = deletedIdsOf(todas, 'paymentMethods');
  const borradoRr = deletedIdsOf(todas, 'recurringRules');

  await db.categories.bulkPut(categories.filter((c) => !borradoCat.has(c.id)));
  await db.paymentMethods.bulkPut(methods.filter((m) => !borradoPm.has(m.id)));
  await db.recurringRules.bulkPut(rules.filter((r) => !borradoRr.has(r.id)));
  await db.settings.put(settings);

  const localAll = await db.transactions.toArray();
  const localById = new Map(localAll.map((t) => [t.id, t]));
  const toPut: Transaction[] = [];
  for (const tx of remoteTx) {
    if (borradoTx.has(tx.id)) continue;
    const local = localById.get(tx.id);
    if (!local || newer(tx.updatedAt, local.updatedAt)) toPut.push(tx);
  }
  if (toPut.length > 0) await db.transactions.bulkPut(toPut);

  return { pushed: 0, pulled: toPut.length, deleted };
}

export async function pushLocalToCloud(): Promise<SyncResult> {
  // 1. Los borrados primero: subir la lápida y borrar allá.
  const tombstones = await db.deletions.toArray();
  await saveRemoteTombstones(tombstones);
  await applyRemoteDeletions(tombstones);

  const borradoTx = deletedIdsOf(tombstones, 'transactions');
  const borradoCat = deletedIdsOf(tombstones, 'categories');
  const borradoPm = deletedIdsOf(tombstones, 'paymentMethods');
  const borradoRr = deletedIdsOf(tombstones, 'recurringRules');

  const [localTx, remoteTx, categories, methods, rules, settings] = await Promise.all([
    db.transactions.toArray(),
    supabaseRepository.listTransactions(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.recurringRules.toArray(),
    db.settings.get('singleton'),
  ]);

  // Categorías y métodos antes que transacciones: las FK de Postgres
  // rechazan una transacción cuya categoría todavía no existe allá.
  for (const c of categories.filter((c) => !borradoCat.has(c.id))) await supabaseRepository.saveCategory(c);
  for (const m of methods.filter((m) => !borradoPm.has(m.id))) await supabaseRepository.savePaymentMethod(m);
  for (const r of rules.filter((r) => !borradoRr.has(r.id))) await supabaseRepository.saveRecurringRule(r);
  if (settings) await supabaseRepository.saveSettings(settings);

  const remoteById = new Map(remoteTx.map((t) => [t.id, t]));
  let pushed = 0;
  for (const tx of localTx) {
    if (borradoTx.has(tx.id)) continue;
    const remote = remoteById.get(tx.id);
    if (!remote || newer(tx.updatedAt, remote.updatedAt)) {
      await supabaseRepository.saveTransaction(tx);
      pushed += 1;
    }
  }
  return { pushed, pulled: 0, deleted: tombstones.length };
}

export async function syncBidirectional(): Promise<SyncResult> {
  const pull = await pullCloudToLocal();
  const push = await pushLocalToCloud();
  return { pushed: push.pushed, pulled: pull.pulled, deleted: pull.deleted };
}
