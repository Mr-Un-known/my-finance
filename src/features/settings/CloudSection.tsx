import { useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { pushLocalToCloud, pullCloudToLocal } from '@/data/sync/syncService';

/**
 * Solo aparece si el usuario configuro las env vars de Supabase (Fase 13).
 * Sin eso, esta seccion no existe y la app sigue siendo 100% local.
 */
export function CloudSection() {
  const [busy, setBusy] = useState<'push' | 'pull' | null>(null);
  const [message, setMessage] = useState('');
  const { session } = useSession();

  if (!isSupabaseConfigured()) return null;

  async function handlePush() {
    setBusy('push'); setMessage('');
    try {
      const result = await pushLocalToCloud();
      setMessage(`Subidos ${result.pushed} movimientos nuevos o actualizados.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo subir.');
    } finally { setBusy(null); }
  }
  async function handlePull() {
    setBusy('pull'); setMessage('');
    try {
      const result = await pullCloudToLocal();
      setMessage(`Bajados ${result.pulled} movimientos nuevos o actualizados.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo bajar.');
    } finally { setBusy(null); }
  }

  return (
    <section style={{ marginBottom: 'var(--gap-xl)' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px' }}>Nube</h2>
      {session && (
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '0 0 10px' }}>
          Sesión: {session.user.email}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={handlePush} disabled={busy !== null} style={btnStyle}>
          {busy === 'push' ? 'Subiendo…' : 'Subir a la nube'}
        </button>
        <button type="button" onClick={handlePull} disabled={busy !== null} style={btnStyle}>
          {busy === 'pull' ? 'Bajando…' : 'Bajar de la nube'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => { void getSupabase().then((supabase) => supabase.auth.signOut()); }}
        style={{ ...btnStyle, width: '100%', color: 'var(--danger)' }}
      >
        Cerrar sesión
      </button>
      {message && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{message}</p>}
    </section>
  );
}

const btnStyle: React.CSSProperties = {
  flex: 1, minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
};
