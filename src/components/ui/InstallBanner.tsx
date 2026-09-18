import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from '@/lib/platform';

const DISMISS_KEY = 'myfinance:install-banner-dismissed';

/**
 * iOS no dispara "beforeinstallprompt" ni permite programar notificaciones
 * si la pagina esta abierta en una pestaña normal de Safari — hay que
 * estar instalado en la pantalla de inicio. Este banner explica como,
 * en vez de mostrar un boton de "activar notificaciones" que no haria nada.
 */
export function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // Si localStorage no esta disponible, igual mostramos el banner.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* no-op */ }
  }

  return (
    <div
      role="note"
      style={{
        margin: '0 var(--gap-l) var(--gap-l)', padding: '12px 14px', borderRadius: 'var(--radius-m)',
        background: 'var(--q10-soft)', border: '1px solid var(--q10)', display: 'flex', gap: 10, alignItems: 'flex-start',
      }}
    >
      <span aria-hidden style={{ fontSize: 18 }}>📲</span>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', flex: 1 }}>
        Instala My Finance en tu iPhone para recibir recordatorios: toca{' '}
        <strong>Compartir</strong> y luego <strong>&quot;Agregar a inicio&quot;</strong>.
      </p>
      <button
        type="button" onClick={dismiss} aria-label="Cerrar"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
