import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { listarPendientes, type EntradaBandeja } from '@/data/supabase/inbox';
import { useSession } from '@/features/auth/useSession';

/**
 * Lo que las automatizaciones dejaron esperando confirmación.
 *
 * Se recarga al entrar y al volver a la app — que es justo cuando puede
 * haber llegado algo, porque el Atajo corre con la app cerrada.
 */
export function useInbox() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [pendientes, setPendientes] = useState<EntradaBandeja[]>([]);

  const recargar = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) {
      setPendientes([]);
      return;
    }
    try {
      setPendientes(await listarPendientes());
    } catch {
      // Sin conexión no hay bandeja que mostrar; no es un error que
      // merezca interrumpir a nadie.
      setPendientes([]);
    }
  }, [userId]);

  useEffect(() => { void recargar(); }, [recargar]);

  useEffect(() => {
    if (!userId) return;
    function alVolver() {
      if (document.visibilityState === 'visible') void recargar();
    }
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [userId, recargar]);

  return { pendientes, recargar };
}
