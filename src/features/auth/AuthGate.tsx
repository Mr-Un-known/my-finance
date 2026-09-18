import type { ReactNode } from 'react';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { useSession } from './useSession';
import { SignInScreen } from './SignInScreen';

/**
 * Si Supabase no esta configurado, deja pasar sin mas (la app sigue 100%
 * local, comportamiento identico a las Fases 1-12). Si SI esta
 * configurado, exige sesion antes de mostrar la app.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <>{children}</>;
  return <AuthGateInner>{children}</AuthGateInner>;
}

function AuthGateInner({ children }: { children: ReactNode }) {
  const { loading, session } = useSession();
  if (loading) return null;
  if (!session) return <SignInScreen />;
  return <>{children}</>;
}
