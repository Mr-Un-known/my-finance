import type { ReactNode } from 'react';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { useSession } from './useSession';
import { SignInScreen } from './SignInScreen';
import { NewPasswordScreen } from './NewPasswordScreen';
import { useRecoveryMode } from './recovery';

/**
 * Si Supabase no esta configurado, deja pasar sin mas (la app sigue 100%
 * local). Si SI esta configurado, exige sesion antes de mostrar la app.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <>{children}</>;
  return <AuthGateInner>{children}</AuthGateInner>;
}

function AuthGateInner({ children }: { children: ReactNode }) {
  const { loading, session } = useSession();
  const recuperando = useRecoveryMode();

  // ANTES que la sesion, a proposito: el enlace de "olvide mi contraseña"
  // abre sesion por su cuenta, asi que preguntar por la sesion primero
  // mandaba directo a la app y nunca dejaba cambiar la contraseña — que es
  // justo a lo que uno entro. Ver recovery.ts.
  if (recuperando) return <NewPasswordScreen />;

  if (loading) return null;
  if (!session) return <SignInScreen />;
  return <>{children}</>;
}
