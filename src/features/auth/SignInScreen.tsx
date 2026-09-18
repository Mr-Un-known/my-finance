import { useEffect, useState } from 'react';
import { getSupabase } from '@/data/supabase/client';

type Modo = 'entrar' | 'crear' | 'olvide' | 'nueva-clave';

const MIN_CLAVE = 8;

/**
 * Cuenta con correo y contraseña. Antes era magic link, que en el iPhone
 * es incómodo (hay que salir al correo y volver) y encima abre el enlace
 * en Safari, no en la app instalada — que tiene su propio almacenamiento,
 * así que la sesión caía del lado equivocado.
 *
 * Con correo+contraseña entras en cualquier dispositivo, y eso es lo que
 * hace que los datos te sigan: al iniciar sesión se baja todo de la nube
 * (ver useCloudSync).
 */
export function SignInScreen() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Si llega desde el enlace de "olvidé mi contraseña", Supabase abre una
  // sesión de recuperación y hay que pedir la clave nueva, no el login.
  useEffect(() => {
    let cancelado = false;
    void getSupabase().then((supabase) => {
      const { data } = supabase.auth.onAuthStateChange((evento) => {
        if (!cancelado && evento === 'PASSWORD_RECOVERY') {
          setModo('nueva-clave');
          setAviso('Escribe tu contraseña nueva.');
        }
      });
      if (cancelado) data.subscription.unsubscribe();
    });
    return () => { cancelado = true; };
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      const supabase = await getSupabase();

      if (modo === 'crear') {
        if (clave.length < MIN_CLAVE) throw new Error(`La contraseña necesita al menos ${MIN_CLAVE} caracteres.`);
        const { data, error: err } = await supabase.auth.signUp({ email, password: clave });
        if (err) throw err;
        // Si el proyecto exige confirmar el correo, no hay sesión todavía.
        if (!data.session) {
          setAviso('Cuenta creada. Confirma el correo que te enviamos y vuelve a entrar.');
          setModo('entrar');
        }
        return;
      }

      if (modo === 'entrar') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password: clave });
        if (err) throw err;
        return;
      }

      if (modo === 'olvide') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (err) throw err;
        setAviso(`Te enviamos un enlace a ${email} para cambiar la contraseña.`);
        return;
      }

      // nueva-clave
      if (clave.length < MIN_CLAVE) throw new Error(`La contraseña necesita al menos ${MIN_CLAVE} caracteres.`);
      const { error: err } = await supabase.auth.updateUser({ password: clave });
      if (err) throw err;
      setAviso('Contraseña actualizada.');
    } catch (e) {
      setError(traducirError(e));
    } finally {
      setOcupado(false);
    }
  }

  const pideClave = modo !== 'olvide';
  const pideCorreo = modo !== 'nueva-clave';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--gap-l)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ fontSize: 40, textAlign: 'center', margin: '0 0 8px' }}>💰</p>
        <h1 className="figures" style={{ textAlign: 'center', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '0 0 4px' }}>
          My Finance
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '0 0 24px', fontSize: 'var(--text-base)' }}>
          {modo === 'crear' ? 'Crea tu cuenta y tus datos te siguen a cualquier dispositivo.'
            : modo === 'olvide' ? 'Te enviamos un enlace para cambiarla.'
            : modo === 'nueva-clave' ? 'Elige tu contraseña nueva.'
            : 'Entra y tus datos aparecen donde estés.'}
        </p>

        {modo === 'entrar' || modo === 'crear' ? (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <Pestana activa={modo === 'entrar'} onClick={() => { setModo('entrar'); setError(''); }}>Ya tengo cuenta</Pestana>
            <Pestana activa={modo === 'crear'} onClick={() => { setModo('crear'); setError(''); }}>Crear cuenta</Pestana>
          </div>
        ) : null}

        <form onSubmit={enviar}>
          {pideCorreo && (
            <input
              type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com"
              aria-label="Correo"
              style={inputStyle}
            />
          )}
          {pideClave && (
            <input
              type="password" required
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              minLength={modo === 'entrar' ? undefined : MIN_CLAVE}
              value={clave} onChange={(e) => setClave(e.target.value)}
              placeholder={modo === 'entrar' ? 'Tu contraseña' : `Contraseña (mínimo ${MIN_CLAVE})`}
              aria-label="Contraseña"
              style={inputStyle}
            />
          )}

          <button type="submit" disabled={ocupado} style={botonStyle}>
            {ocupado ? 'Un momento…'
              : modo === 'crear' ? 'Crear cuenta'
              : modo === 'olvide' ? 'Enviar enlace'
              : modo === 'nueva-clave' ? 'Guardar contraseña'
              : 'Entrar'}
          </button>
        </form>

        {modo === 'entrar' && (
          <button type="button" onClick={() => { setModo('olvide'); setError(''); }} style={enlaceStyle}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {(modo === 'olvide' || modo === 'nueva-clave') && (
          <button type="button" onClick={() => { setModo('entrar'); setError(''); setAviso(''); }} style={enlaceStyle}>
            Volver a entrar
          </button>
        )}

        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', marginTop: 12, textAlign: 'center' }}>{error}</p>}
        {aviso && <p style={{ color: 'var(--positive)', fontSize: 'var(--text-sm)', marginTop: 12, textAlign: 'center' }}>{aviso}</p>}
      </div>
    </div>
  );
}

/* Las pestañas no pueden llamarse igual que el botón de enviar ("Entrar"):
   dos controles con el mismo nombre accesible dejan al lector de pantalla
   sin forma de distinguirlos. */
function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={activa}
      style={{
        flex: 1, minHeight: 'var(--tap)', borderRadius: 'var(--radius-s)',
        border: `1px solid ${activa ? 'var(--q10)' : 'var(--line-strong)'}`,
        background: activa ? 'var(--q10)' : 'var(--surface)',
        color: activa ? '#fff' : 'var(--text)',
        fontWeight: 600, fontSize: 'var(--text-base)', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/** Los mensajes de Supabase vienen en inglés y son crípticos para quien usa la app. */
function traducirError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('user already registered')) return 'Ese correo ya tiene cuenta. Entra en vez de crearla.';
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo. Revisa tu bandeja.';
  if (m.includes('password should be at least')) return `La contraseña necesita al menos ${MIN_CLAVE} caracteres.`;
  if (m.includes('unable to validate email')) return 'Ese correo no parece válido.';
  if (m.includes('for security purposes')) return 'Demasiados intentos seguidos. Espera un momento.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión. Revisa tu internet.';
  return raw;
}

const inputStyle: React.CSSProperties = {
  width: '100%', minHeight: 'var(--tap)', padding: '0 14px', marginBottom: 10,
  borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--text)', fontSize: 16,
};
const botonStyle: React.CSSProperties = {
  width: '100%', minHeight: 48, borderRadius: 'var(--radius-s)', border: 'none',
  background: 'var(--q10)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
};
const enlaceStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 12, minHeight: 'var(--tap)',
  background: 'none', border: 'none', color: 'var(--q10)',
  fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
};
