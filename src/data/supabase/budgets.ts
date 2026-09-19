/**
 * Presupuestos en la nube, para sincronizar.
 *
 * Va aparte de supabaseRepository por lo mismo que deletions.ts: la
 * interfaz Repository expone listBudgets(year, month), que es lo que
 * necesita la PANTALLA, pero sincronizar necesita todos. Meter un
 * "listAllBudgets" en la interfaz obligaria a LocalRepository a
 * implementar algo que ninguna pantalla usa.
 */
import { getSupabase } from './client';
import { budgetFromRow, budgetToRow, type BudgetRow } from './mappers';
import type { Budget } from '@/domain/types';

async function currentUserId(): Promise<string> {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa de Supabase.');
  return session.user.id;
}

export async function listRemoteBudgets(): Promise<Budget[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw error;
  return (data as BudgetRow[]).map(budgetFromRow);
}

export async function saveRemoteBudgets(budgets: Budget[]): Promise<void> {
  if (budgets.length === 0) return;
  const [supabase, userId] = await Promise.all([getSupabase(), currentUserId()]);
  // En un solo upsert: son pocas filas (una por categoria y mes) y asi el
  // sync no hace una peticion por presupuesto.
  const { error } = await supabase
    .from('budgets')
    .upsert(budgets.map((b) => budgetToRow(userId, b)));
  if (error) throw error;
}
