import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../supabase/client';
import { useSession } from '@/features/auth/useSession';
import { syncBidirectional } from './syncService';

export type EstadoSync = 'inactivo' | 'sincronizando' | 'ok' | 'error';

const MIN_ENTRE_SYNCS_MS = 60_000;

/**
 * Forzar una subida desde fuera del arbol de React.
 *
 * Hace falta porque el sync automatico solo corre al entrar, al volver a
 * la app y al dejarla — y la configuracion inicial se completa en el
 * medio. El push que sube los Settings pasa AL ENTRAR, o sea antes de que
 * exista la configuracion, asi que subia onboardedAt = null; despues nada
 * la volvia a subir hasta que el navegador disparara un visibilitychange,
 * que al cerrar la pestaña de golpe puede no llegar nunca. Resultado: cada
 * login en un dispositivo nuevo volvia a pedir nombre, moneda y categorias.
 */
let forzarSyncActual: (() => void) | null = null;

export function pedirSync(): void {
  forzarSyncActual?.();
}

/**
 * Sincroniza solo, sin que el usuario toque un boton.
 *
 * Cuando: al iniciar sesion, al volver a la app (visibilitychange) y al
 * dejarla. Ese es el ciclo que hace que "abro la app en otro dispositivo
 * y esta todo" sea cierto — con los botones manuales de Ajustes bastaba
 * con olvidarse una vez para perder el trabajo del dia.
 *
 * Los botones manuales siguen existiendo para forzar el sync.
 */
export function useCloudSync() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const [estado, setEstado] = useState<EstadoSync>('inactivo');
  const [error, setError] = useState('');
  // La primera bajada tiene que terminar antes de decidir si mostrar la
  // configuracion inicial: si no, un dispositivo nuevo la pregunta otra vez
  // aunque la cuenta ya este configurada en la nube.
  const [primeraHecha, setPrimeraHecha] = useState(!isSupabaseConfigured());
  const ultimaRef = useRef(0);
  const corriendoRef = useRef(false);

  const sincronizar = useCallback(async (forzar = false) => {
    if (!isSupabaseConfigured() || !userId) return;
    if (corriendoRef.current) return;
    if (!forzar && Date.now() - ultimaRef.current < MIN_ENTRE_SYNCS_MS) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    corriendoRef.current = true;
    setEstado('sincronizando');
    setError('');
    try {
      await syncBidirectional();
      ultimaRef.current = Date.now();
      setEstado('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar.');
      setEstado('error');
    } finally {
      corriendoRef.current = false;
      setPrimeraHecha(true);
    }
  }, [userId]);

  // Registrar el disparador manual mientras este hook esté montado.
  useEffect(() => {
    const mio = () => void sincronizar(true);
    forzarSyncActual = mio;
    // Comparar identidad, no "hay algo seteado": si algun dia este hook se
    // monta en dos lugares, el cleanup del primero borraria el callback que
    // el segundo acaba de registrar y "Sincronizar ahora" quedaria mudo sin
    // ningun error visible.
    return () => {
      if (forzarSyncActual === mio) forzarSyncActual = null;
    };
  }, [sincronizar]);

  // Al entrar la sesión: bajar todo antes de que el usuario vea nada.
  useEffect(() => {
    if (!userId) {
      setEstado('inactivo');
      setPrimeraHecha(true); // sin cuenta no hay nada que bajar
      return;
    }
    void sincronizar(true);
  }, [userId, sincronizar]);

  // Al volver a la app y al dejarla. Lo segundo es lo que salva el caso
  // "agregué tres gastos y cerré": sin esto se quedaban solo aquí.
  useEffect(() => {
    if (!userId) return;
    function onVisibility() {
      void sincronizar(document.visibilityState === 'hidden');
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onVisibility);
    };
  }, [userId, sincronizar]);

  return { estado, error, primeraHecha, sincronizar };
}
