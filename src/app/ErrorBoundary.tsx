import { Component, type ReactNode } from 'react';

/**
 * Convierte una pantalla en blanco en un mensaje que se puede resolver.
 *
 * Nace de un caso concreto: Analisis es la unica ruta que se carga con
 * lazy(), su archivo lleva un hash que cambia en cada despliegue, y la app
 * es una PWA que cachea. Un navegador con el indice viejo pedia un archivo
 * que ya no existia, el import fallaba, y como no habia ningun limite de
 * error React desmontaba TODO el arbol: pantalla en blanco, sin mensaje,
 * sin forma de salir salvo cerrar y volver a abrir.
 *
 * Ante ese caso puntual —un chunk que ya no esta— recarga sola una vez,
 * porque el arreglo real es traer el indice nuevo y no hay nada que el
 * usuario pueda decidir ahi. Para cualquier otro error muestra el mensaje
 * y deja el boton, sin recargar en bucle.
 */

const MARCA_RECARGA = 'myfinance:recarga-por-chunk';

/** ¿Es el fallo de "el archivo que pedi ya no existe"? */
function esChunkViejo(error: unknown): boolean {
  const m = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(m);
}

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (!esChunkViejo(error)) return;
    // Una sola vez: si recargar no lo arregla, mejor mostrar el mensaje
    // que dejar al usuario en un bucle de recargas.
    try {
      if (sessionStorage.getItem(MARCA_RECARGA)) return;
      sessionStorage.setItem(MARCA_RECARGA, '1');
    } catch {
      return; // sin sessionStorage no arriesgamos el bucle
    }
    window.location.reload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const porActualizacion = esChunkViejo(error);
    return (
      <div style={{ padding: 'var(--gap-l)', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 34, margin: '24px 0 8px' }} aria-hidden>🌀</p>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 6px' }}>
          {porActualizacion ? 'La app se actualizó' : 'Algo se rompió acá'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)', margin: '0 0 18px', lineHeight: 'var(--lh-normal)' }}>
          {porActualizacion
            ? 'Tu navegador tenía guardada una versión anterior. Recarga y listo.'
            : 'Tus datos están a salvo: esto es solo esta pantalla. Recarga para volver.'}
        </p>
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.removeItem(MARCA_RECARGA); } catch { /* no pasa nada */ }
            window.location.reload();
          }}
          style={{
            width: '100%', minHeight: 48, borderRadius: 'var(--radius-s)', border: 'none',
            background: 'var(--q10)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}
        >
          Recargar
        </button>
        {!porActualizacion && (
          <details style={{ marginTop: 16, textAlign: 'left' }}>
            <summary style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', cursor: 'pointer' }}>
              Detalle técnico
            </summary>
            <pre style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
              {error.message}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
