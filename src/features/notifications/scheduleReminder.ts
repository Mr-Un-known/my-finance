/**
 * Crea/actualiza el recordatorio de un movimiento.
 *
 * Se guarda PRIMERO en local y la sincronizacion lo sube despues. Antes
 * iba directo a la nube, y eso se perdia sin conexion: getSession()
 * devuelve la sesion cacheada aunque no haya red, asi que pasaba el guard
 * y reventaba el upsert; el llamador se tragaba el error con un
 * console.error y nadie reintentaba nunca. Un gasto anotado en el bus se
 * quedaba sin recordatorio para siempre, en silencio.
 *
 * Quien DISPARA la notificacion sigue siendo el servidor (ver
 * docs/NOTIFICATIONS.md); lo local es solo donde nace el dato, como con
 * todo lo demas en esta app.
 *
 * Un movimiento tiene a lo sumo un recordatorio activo: se usa el mismo
 * id del movimiento como id del recordatorio, asi guardarlo de nuevo
 * (p.ej. si cambia la fecha) actualiza el mismo en vez de duplicarlo. Y
 * como el id viene del movimiento, dos dispositivos generan el MISMO id
 * para el mismo recordatorio: no hay forma de duplicarlo al sincronizar.
 */
import { calculateReminderTime } from '@/domain/reminders/schedule';
import type { Settings, Transaction } from '@/domain/types';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { localRepository } from '@/data/local/localRepository';

export async function maybeScheduleReminder(tx: Transaction, settings: Settings): Promise<void> {
  // Sin Supabase no hay servidor que dispare nada, asi que el dato no
  // serviria para nada (ver docs/NOTIFICATIONS.md).
  if (!isSupabaseConfigured()) return;
  if (tx.status === 'paid' || tx.status === 'cancelled') return;

  await localRepository.saveReminder({
    id: tx.id,
    transactionId: tx.id,
    remindAt: calculateReminderTime(tx.date, settings.reminderDefaultDaysBefore),
    status: 'scheduled',
    // La fecha real la estampa localRepository.saveReminder.
    updatedAt: '',
  });
}
