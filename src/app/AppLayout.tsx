import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/ui/TabBar';
import { InstallBanner } from '@/components/ui/InstallBanner';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { AuthGate } from '@/features/auth/AuthGate';
import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { useCloudSync } from '@/data/sync/useCloudSync';
import { useMoneyFormat } from './useMoneyFormat';
import { useTheme } from './useTheme';

/**
 * Orden de las capas, y por que ese orden:
 *   AuthGate       — sin sesion no hay nada que mostrar.
 *   useCloudSync   — baja los datos de la cuenta ANTES de decidir nada mas.
 *   OnboardingGate — solo pregunta la configuracion inicial si, despues de
 *                    bajar, sigue sin haberla. Si no, un telefono nuevo
 *                    volveria a preguntar nombre y moneda cada vez.
 */
export function AppLayout() {
  useTheme();
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}

function AppShell() {
  const { estado, error, primeraHecha, sincronizar } = useCloudSync();
  useMoneyFormat();

  return (
    <OnboardingGate esperando={!primeraHecha}>
      {/* 100dvh, no 100%: en iOS el alto en % se resuelve contra el viewport
          grande e ignora que la barra de Safari aparece y desaparece, asi que
          pantallas cortas quedaban sin scroll y con la barra de abajo flotando
          por encima del toolbar. dvh sigue el viewport real. */}
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <main
          style={{
            flex: 1,
            paddingTop: 'calc(var(--safe-top) + var(--gap-l))',
            // 61 barra + 14 + 56 FAB + aire: nada queda debajo del tab bar ni del +.
            paddingBottom: 'calc(var(--safe-bottom) + 148px)',
          }}
        >
          <InstallBanner />
          <Outlet />
        </main>
        <TabBar />
        <SyncIndicator estado={estado} error={error} onReintentar={() => void sincronizar(true)} />
      </div>
    </OnboardingGate>
  );
}
