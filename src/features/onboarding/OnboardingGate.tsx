import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localRepository } from '@/data/local/localRepository';
import { OnboardingScreen } from './OnboardingScreen';

/**
 * Muestra la configuracion inicial la primera vez y nunca mas.
 *
 * `esperando` lo pone AppShell mientras baja los datos de la cuenta: sin
 * eso, un dispositivo nuevo preguntaria nombre y moneda otra vez durante
 * el segundo que tarda el primer sync.
 */
export function OnboardingGate({ esperando, children }: { esperando: boolean; children: ReactNode }) {
  const settings = useLiveQuery(() => localRepository.getSettings(), []);

  if (esperando || !settings) return <Cargando />;
  if (settings.onboardedAt === null) return <OnboardingScreen settings={settings} />;
  return <>{children}</>;
}

function Cargando() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 34, margin: '0 0 8px' }}>💰</p>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Trayendo tus datos…</p>
      </div>
    </div>
  );
}
