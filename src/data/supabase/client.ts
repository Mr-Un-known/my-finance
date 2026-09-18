/**
 * Cliente de Supabase. Todo el resto de la app pregunta
 * isSupabaseConfigured() antes de usar esto — sin las env vars, la app
 * sigue funcionando 100% local (comportamiento de las Fases 1-12).
 *
 * IMPORTANTE: getSupabase() es async a proposito. @supabase/supabase-js
 * pesa ~240kB — si se importara de forma estatica aqui, quedaria en el
 * bundle principal de TODOS los usuarios, incluso los que nunca
 * configuran Supabase. El import() dinamico lo separa en su propio chunk,
 * que solo se descarga si realmente se llega a llamar esta funcion.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

/** Lanza si se llama sin configurar — siempre revisar isSupabaseConfigured() primero. */
export async function getSupabase(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no esta configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url!, anonKey!);
  }
  return client;
}
