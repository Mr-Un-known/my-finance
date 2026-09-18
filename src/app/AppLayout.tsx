import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/ui/TabBar';
import { InstallBanner } from '@/components/ui/InstallBanner';
import { AuthGate } from '@/features/auth/AuthGate';
import { useTheme } from './useTheme';

export function AppLayout() {
  useTheme();
  return (
    <AuthGate>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <main
          style={{
            flex: 1,
            paddingTop: 'calc(var(--safe-top) + var(--gap-l))',
            paddingBottom: 'calc(var(--safe-bottom) + 92px)',
          }}
        >
          <InstallBanner />
          <Outlet />
        </main>
        <TabBar />
      </div>
    </AuthGate>
  );
}
