/**
 * Bandeja de entrada: lo que mandan las automatizaciones (Atajos de iOS)
 * y todavía nadie confirmó.
 *
 * Vive solo en la nube, no en Dexie: son pocas filas, efímeras, y sin
 * conexión no hay nada que recoger de todos modos. Duplicarlas localmente
 * sería inventar un problema de sincronización que no existe.
 */
import { getSupabase } from './client';

export interface EntradaBandeja {
  id: string;
  texto: string;
  origen: string;
  createdAt: string;
}

async function userId(): Promise<string> {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa de Supabase.');
  return session.user.id;
}

export async function listarPendientes(): Promise<EntradaBandeja[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('inbox')
    .select('id, texto, origen, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Array<{ id: string; texto: string; origen: string; created_at: string }>).map((r) => ({
    id: r.id, texto: r.texto, origen: r.origen, createdAt: r.created_at,
  }));
}

export async function cerrarEntrada(id: string, como: 'done' | 'discarded'): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('inbox').update({ status: como }).eq('id', id);
  if (error) throw error;
}

/* ─────────────── Token para los Atajos ─────────────── */

async function hashHex(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Crea un token nuevo y devuelve el texto en claro UNA sola vez: en la
 * base queda el hash. Si el usuario lo pierde, genera otro; no hay forma
 * de recuperarlo, y eso es a propósito.
 */
export async function crearToken(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = `mf_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

  const [supabase, uid] = await Promise.all([getSupabase(), userId()]);
  // Uno solo por cuenta: generar otro reemplaza el anterior, así que un
  // token viejo que se haya filtrado deja de servir.
  await supabase.from('ingest_tokens').delete().eq('user_id', uid);
  const { error } = await supabase
    .from('ingest_tokens')
    .insert({ user_id: uid, token_hash: await hashHex(token) });
  if (error) throw error;
  return token;
}

export async function hayToken(): Promise<boolean> {
  const supabase = await getSupabase();
  const { count, error } = await supabase
    .from('ingest_tokens')
    .select('id', { count: 'exact', head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}

/** La URL de la función que el Atajo va a llamar. */
export function urlIngesta(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? `${base}/functions/v1/ingest` : '';
}
