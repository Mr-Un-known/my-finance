import { useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { syncBidirectional } from '@/data/sync/syncService';

/**
 * Solo aparece si el proyecto tiene Supabase configurado. La sincronizacion
 * ya corre sola (ver useCloudSync); esto es el boton de "ahora mismo" y el
 * lugar donde ver con que cuenta estas y cerrar sesion.
 */
export function CloudSection() {
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const { session } = useSession();

  if (!isSupabaseConfigured()) return null;

  async function sincronizarAhora() {
    setOcupado(true);
    setMensaje('');
    try {
      const r = await syncBidirectional();
      setMensaje(`Listo. Subidos ${r.pushed}, bajados ${r.pulled}${r.deleted ? `, borrados ${r.deleted}` : ''}.`);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo sincronizar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section style={{ marginBottom: 'var(--gap-xl)' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px' }}>Tu cuenta</h2>

      {session && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Sesión iniciada como <strong>{session.user.email}</strong>. Entra con este correo y contraseña
          en cualquier dispositivo y verás los mismos datos.
        </p>
      )}

      <button type="button" onClick={sincronizarAhora} disabled={ocupado} style={{ ...btnStyle, width: '100%', marginBottom: 8 }}>
        {ocupado ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>

      <button
        type="button"
        onClick={() => { void getSupabase().then((supabase) => supabase.auth.signOut()); }}
        style={{ ...btnStyle, width: '100%', color: 'var(--danger)' }}
      >
        Cerrar sesión
      </button>

      {mensaje && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8 }}>{mensaje}</p>}
    </section>
  );
}

const btnStyle: React.CSSProperties = {
  flex: 1, minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
};
