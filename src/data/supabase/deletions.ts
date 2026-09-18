/**
 * Lapidas en la nube. Va aparte de supabaseRepository a proposito: es una
 * operacion que solo tiene sentido sincronizando, y meterla en la interfaz
 * Repository obligaria a LocalRepository a implementar algo que no usa.
 */
import { getSupabase } from './client';
import type { DeletableEntity, Tombstone } from '../sync/tombstones';

interface DeletionRow {
  user_id: string;
  id: string;
  entity: string;
  entity_id: string;
  deleted_at: string;
}

async function currentUserId(): Promise<string> {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa de Supabase.');
  return session.user.id;
}

export async function listRemoteTombstones(): Promise<Tombstone[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('deletions').select('*');
  if (error) throw error;
  return (data as DeletionRow[]).map((r) => ({
    id: r.id, entity: r.entity as DeletableEntity, entityId: r.entity_id, deletedAt: r.deleted_at,
  }));
}

export async function saveRemoteTombstones(tombstones: Tombstone[]): Promise<void> {
  if (tombstones.length === 0) return;
  const [supabase, userId] = await Promise.all([getSupabase(), currentUserId()]);
  const rows: DeletionRow[] = tombstones.map((t) => ({
    user_id: userId, id: t.id, entity: t.entity, entity_id: t.entityId, deleted_at: t.deletedAt,
  }));
  const { error } = await supabase.from('deletions').upsert(rows);
  if (error) throw error;
}

/** Borra de verdad las filas que tienen lapida. */
export async function applyRemoteDeletions(tombstones: Tombstone[]): Promise<void> {
  if (tombstones.length === 0) return;
  const supabase = await getSupabase();
  const tablaDe: Record<DeletableEntity, string> = {
    transactions: 'transactions',
    categories: 'categories',
    paymentMethods: 'payment_methods',
    recurringRules: 'recurring_rules',
  };

  const porEntidad = new Map<DeletableEntity, string[]>();
  for (const t of tombstones) {
    const lista = porEntidad.get(t.entity) ?? [];
    lista.push(t.entityId);
    porEntidad.set(t.entity, lista);
  }

  for (const [entidad, ids] of porEntidad) {
    const { error } = await supabase.from(tablaDe[entidad]).delete().in('id', ids);
    if (error) throw error;
  }
}
