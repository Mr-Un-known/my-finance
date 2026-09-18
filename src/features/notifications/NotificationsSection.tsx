import { isSupabaseConfigured } from '@/data/supabase/client';
import { isIOS, isStandalone } from '@/lib/platform';
import { usePushNotifications } from './usePushNotifications';

/**
 * Solo tiene sentido si hay Supabase configurado (el scheduler vive en el
 * servidor) y el navegador soporta Push. En iOS, ademas, la PWA debe estar
 * instalada en pantalla de inicio — si no, ni intentamos: explicamos por que.
 */
export function NotificationsSection() {
  const { state, busy, error, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupabaseConfigured()) return null;
  if (state === 'unsupported') return null;

  const iosNotInstalled = isIOS() && !isStandalone();

  return (
    <section style={{ marginBottom: 'var(--gap-xl)' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px' }}>Recordatorios</h2>

      {iosNotInstalled ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Instala la app en tu pantalla de inicio (ver el aviso arriba) para poder activar los recordatorios.
        </p>
      ) : state === 'unconfigured' ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Configuración de notificaciones pendiente.</p>
      ) : state === 'denied' ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Bloqueaste las notificaciones para esta app. Actívalas desde los ajustes de tu sistema si cambias de opinión.
        </p>
      ) : state === 'granted' ? (
        <button type="button" onClick={unsubscribe} disabled={busy} style={btnStyle}>
          {busy ? 'Desactivando…' : 'Desactivar recordatorios en este dispositivo'}
        </button>
      ) : (
        <button type="button" onClick={subscribe} disabled={busy} style={btnStyle}>
          {busy ? 'Activando…' : 'Activar recordatorios'}
        </button>
      )}
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
    </section>
  );
}

const btnStyle: React.CSSProperties = {
  width: '100%', minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
};
