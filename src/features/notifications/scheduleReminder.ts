/**
 * Crea/actualiza el recordatorio en la nube de un movimiento, si hay
 * Supabase configurado y sesion activa. Si no, no hace nada — sin
 * servidor no hay quien dispare la notificacion (ver docs/NOTIFICATIONS.md).
 *
 * Un movimiento tiene a lo sumo un recordatorio activo: se usa el mismo
 * id del movimiento como id del recordatorio, asi guardarlo de nuevo
 * (p.ej. si cambia la fecha) actualiza el mismo en vez de duplicarlo.
 */
import { calculateReminderTime } from '@/domain/reminders/schedule';
import type { Settings, Transaction } from '@/domain/types';
import { isSupabaseConfigured, getSupabase } from '@/data/supabase/client';
import { supabaseRepository } from '@/data/supabase/supabaseRepository';

export async function maybeScheduleReminder(tx: Transaction, settings: Settings): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (tx.status === 'paid' || tx.status === 'cancelled') return;

  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabaseRepository.saveReminder({
    id: tx.id,
    transactionId: tx.id,
    remindAt: calculateReminderTime(tx.date, settings.reminderDefaultDaysBefore),
    status: 'scheduled',
  });
}
