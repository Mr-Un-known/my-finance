/**
 * Sincronizacion MANUAL, explicita, entre IndexedDB (fuente de verdad
 * offline) y Supabase (respaldo en la nube). No hay sync automatico en
 * tiempo real todavia — cada accion la dispara el usuario desde Ajustes.
 *
 * Estrategia: last-write-wins por updatedAt. "Subir" empuja lo local que
 * sea mas nuevo que lo remoto (o que no exista en remoto). "Bajar" hace
 * lo inverso. Es intencionalmente simple: para un usuario en un solo
 * dispositivo a la vez, esto ya cubre "no perder mis datos si cambio de
 * telefono" sin la complejidad de una sincronizacion en tiempo real.
 */
import { db } from '../db';
import { supabaseRepository } from '../supabase/supabaseRepository';
import type { Transaction } from '@/domain/types';

export interface SyncResult {
  pushed: number;
  pulled: number;
}

function newer(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}

export async function pushLocalToCloud(): Promise<SyncResult> {
  const [localTx, remoteTx, categories, methods, rules, settings] = await Promise.all([
    db.transactions.toArray(),
    supabaseRepository.listTransactions(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.recurringRules.toArray(),
    db.settings.get('singleton'),
  ]);

  await Promise.all(categories.map((c) => supabaseRepository.saveCategory(c)));
  await Promise.all(methods.map((m) => supabaseRepository.savePaymentMethod(m)));
  await Promise.all(rules.map((r) => supabaseRepository.saveRecurringRule(r)));
  if (settings) await supabaseRepository.saveSettings(settings);

  const remoteById = new Map(remoteTx.map((t) => [t.id, t]));
  let pushed = 0;
  for (const tx of localTx) {
    const remote = remoteById.get(tx.id);
    if (!remote || newer(tx.updatedAt, remote.updatedAt)) {
      await supabaseRepository.saveTransaction(tx);
      pushed += 1;
    }
  }
  return { pushed, pulled: 0 };
}

export async function pullCloudToLocal(): Promise<SyncResult> {
  const [remoteTx, categories, methods, rules, settings] = await Promise.all([
    supabaseRepository.listTransactions(),
    supabaseRepository.listCategories(),
    supabaseRepository.listPaymentMethods(),
    supabaseRepository.listRecurringRules(),
    supabaseRepository.getSettings(),
  ]);

  await db.categories.bulkPut(categories);
  await db.paymentMethods.bulkPut(methods);
  await db.recurringRules.bulkPut(rules);
  await db.settings.put(settings);

  const localAll = await db.transactions.toArray();
  const localById = new Map(localAll.map((t) => [t.id, t]));
  let pulled = 0;
  const toPut: Transaction[] = [];
  for (const tx of remoteTx) {
    const local = localById.get(tx.id);
    if (!local || newer(tx.updatedAt, local.updatedAt)) {
      toPut.push(tx);
      pulled += 1;
    }
  }
  if (toPut.length > 0) await db.transactions.bulkPut(toPut);
  return { pushed: 0, pulled };
}

export async function syncBidirectional(): Promise<SyncResult> {
  const pull = await pullCloudToLocal();
  const push = await pushLocalToCloud();
  return { pushed: push.pushed, pulled: pull.pulled };
}
