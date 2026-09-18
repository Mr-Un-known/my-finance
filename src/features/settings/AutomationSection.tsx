import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { crearToken, hayToken, urlIngesta } from '@/data/supabase/inbox';
import { useSession } from '@/features/auth/useSession';

/**
 * El token que usan los Atajos de iOS para dejar texto en la bandeja.
 *
 * Existe porque iOS no abre una URL dentro de una web app instalada: un
 * Atajo que abre un enlace cae en Safari, que tiene otro almacenamiento.
 * Con este camino el Atajo no abre nada — manda el texto y sigue.
 */
export function AutomationSection() {
  const { session } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [existe, setExiste] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    void hayToken().then(setExiste);
  }, [session]);

  if (!isSupabaseConfigured() || !session) return null;

  async function generar() {
    setOcupado(true);
    setError('');
    try {
      setToken(await crearToken());
      setExiste(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar.');
    } finally {
      setOcupado(false);
    }
  }

  async function copiar(texto: string, que: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      setError('Tu navegador no dejó copiar. Selecciona el texto a mano.');
    }
  }

  return (
    <section style={{ marginBottom: 'var(--gap-xl)' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px' }}>
        Automatizaciones (Atajos)
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 'var(--lh-normal)' }}>
        Un Atajo puede mandarte movimientos sin abrir nada: llegan acá y los
        confirmás cuando abras la app. Necesita una clave propia, que solo
        sirve para eso — no puede leer ni borrar nada tuyo.
      </p>

      {token ? (
        <div style={{ background: 'var(--positive-soft)', border: '1px solid var(--positive)', borderRadius: 'var(--radius-s)', padding: '12px 14px', marginBottom: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
            Cópialo ahora: no se vuelve a mostrar.
          </p>

          {/* Lo que de verdad hace falta pegar: la dirección con la clave
              adentro. Un solo copiar, y en el Atajo solo queda arrastrar la
              variable del mensaje al final. */}
          <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
            Para el Atajo del SMS
          </p>
          <code style={{ display: 'block', fontSize: 11, wordBreak: 'break-all', marginBottom: 6, color: 'var(--text)' }}>
            {`${urlIngesta()}?origen=sms&token=${token}&texto=`}
          </code>
          <button
            type="button"
            onClick={() => copiar(`${urlIngesta()}?origen=sms&token=${token}&texto=`, 'sms')}
            style={{ ...btn, marginBottom: 10 }}
          >
            {copiado === 'sms' ? 'Copiada ✓' : 'Copiar dirección del SMS'}
          </button>

          <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
            Para el Atajo de dictado
          </p>
          <code style={{ display: 'block', fontSize: 11, wordBreak: 'break-all', marginBottom: 6, color: 'var(--text)' }}>
            {`${urlIngesta()}?origen=dictado&token=${token}&texto=`}
          </code>
          <button
            type="button"
            onClick={() => copiar(`${urlIngesta()}?origen=dictado&token=${token}&texto=`, 'dictado')}
            style={{ ...btn, marginBottom: 10 }}
          >
            {copiado === 'dictado' ? 'Copiada ✓' : 'Copiar dirección del dictado'}
          </button>

          <details>
            <summary style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Ver solo la clave
            </summary>
            <code style={{ display: 'block', fontSize: 11, wordBreak: 'break-all', margin: '6px 0', color: 'var(--text-muted)' }}>
              {token}
            </code>
            <button type="button" onClick={() => copiar(token, 'token')} style={btn}>
              {copiado === 'token' ? 'Copiada ✓' : 'Copiar clave sola'}
            </button>
          </details>
        </div>
      ) : (
        <button type="button" onClick={generar} disabled={ocupado} style={{ ...btn, width: '100%', marginBottom: 10 }}>
          {ocupado ? 'Generando…' : existe ? 'Generar una clave nueva' : 'Generar clave'}
        </button>
      )}

      {existe && !token && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', margin: '0 0 10px' }}>
          Ya tienes una clave. Generar otra reemplaza la anterior, y los Atajos
          que usen la vieja dejan de funcionar.
        </p>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', margin: '10px 0 0', lineHeight: 'var(--lh-normal)' }}>
        En el Atajo: una acción <strong>Obtener contenido de la URL</strong>,
        pegas la dirección de arriba y arrastras al final la variable del
        mensaje. Nada más: ni método, ni cuerpo, ni campos JSON.
        El paso a paso completo está en docs/ATAJOS_IOS.md.
      </p>

      {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', marginTop: 8 }}>{error}</p>}
    </section>
  );
}

const btn: React.CSSProperties = {
  minHeight: 44, padding: '0 16px', borderRadius: 'var(--radius-s)',
  border: '1px solid var(--line-strong)', background: 'var(--surface)',
  color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-base)',
};
