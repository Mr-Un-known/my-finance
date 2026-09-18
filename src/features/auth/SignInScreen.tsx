import { useState } from 'react';
import { getSupabase } from '@/data/supabase/client';

/**
 * Magic link por correo — sin contraseñas que manejar. Obligatorio porque
 * el repo es publico (la anon key queda visible), asi que sin login
 * cualquiera con la key podria leer datos ajenos si RLS fallara.
 */
export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const supabase = await getSupabase();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (authError) { setStatus('error'); setError(authError.message); return; }
    setStatus('sent');
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--gap-l)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ fontSize: 40, textAlign: 'center', margin: '0 0 8px' }}>💰</p>
        <h1 className="figures" style={{ textAlign: 'center', fontSize: 'var(--step-3)', margin: '0 0 4px' }}>My Finance</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '0 0 24px' }}>
          Inicia sesión para sincronizar tus datos
        </p>

        {status === 'sent' ? (
          <p style={{ textAlign: 'center', color: 'var(--positive)' }}>
            Te enviamos un enlace a <strong>{email}</strong>. Ábrelo desde este mismo dispositivo.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              style={{ width: '100%', minHeight: 'var(--tap)', padding: '0 14px', marginBottom: 12, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontSize: 16 }}
            />
            <button
              type="submit" disabled={status === 'sending'}
              style={{ width: '100%', minHeight: 48, borderRadius: 'var(--radius-s)', border: 'none', background: 'var(--text)', color: 'var(--surface)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar enlace mágico'}
            </button>
            {status === 'error' && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
