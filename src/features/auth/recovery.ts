import { useSyncExternalStore } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client';

/**
 * Modo "cambiar contraseña", el que se activa al abrir el enlace de
 * "olvidé mi contraseña".
 *
 * Tiene dos trampas, y las dos estaban:
 *
 * 1. El enlace de recuperación ABRE SESIÓN. Como AuthGate mostraba la app
 *    apenas había sesión, entrabas directo y nunca te preguntaba la
 *    contraseña nueva. Por eso este estado se consulta ANTES que la sesión.
 *
 * 2. supabase-js procesa el token y limpia la URL al construir el cliente.
 *    Suscribirse a onAuthStateChange dentro del .then() de getSupabase()
 *    llega tarde: el evento PASSWORD_RECOVERY ya pasó. Por eso la URL se
 *    lee al cargar el módulo, de forma síncrona, antes de que nada corra.
 */

/** ¿Esta URL es la de un enlace de recuperación? Pura, para poder probarla. */
export function esUrlDeRecuperacion(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  // Flujo implícito: el token viene en el fragmento (#access_token=...&type=recovery).
  const fragmento = new URLSearchParams(url.hash.replace(/^#/, ''));
  if (fragmento.get('type') === 'recovery') return true;
  // Flujo PKCE: ?code=...&type=recovery
  return url.searchParams.get('type') === 'recovery';
}

let enRecuperacion =
  typeof window !== 'undefined' && esUrlDeRecuperacion(window.location.href);

const oyentes = new Set<() => void>();

function avisar() {
  for (const o of oyentes) o();
}

export function entrarEnRecuperacion(): void {
  if (enRecuperacion) return;
  enRecuperacion = true;
  avisar();
}

/** Se llama al terminar de cambiar la contraseña, o al cancelar. */
export function salirDeRecuperacion(): void {
  if (!enRecuperacion) return;
  enRecuperacion = false;
  // Sin esto, recargar la página vuelve a entrar en modo recuperación
  // porque el token sigue en la URL.
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname);
  }
  avisar();
}

/** Segunda vía por si la URL ya venía limpia: el evento de supabase-js. */
if (isSupabaseConfigured() && typeof window !== 'undefined') {
  void getSupabase().then((supabase) => {
    supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') entrarEnRecuperacion();
    });
  });
}

export function useRecoveryMode(): boolean {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => enRecuperacion,
    () => false, // en SSR nunca hay recuperación
  );
}
