import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { TransactionsScreen } from '@/features/transactions/TransactionsScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { CategoriesScreen } from '@/features/categories/CategoriesScreen';
import { RecurringRulesScreen } from '@/features/recurring/RecurringRulesScreen';
import { CreditCardScreen } from '@/features/credit-card/CreditCardScreen';
import { BudgetsScreen } from '@/features/budgets/BudgetsScreen';

// Recharts es pesado (~500kb) y solo lo necesita esta pantalla: se separa
// en su propio chunk para no inflar la carga inicial de la app.
const AnalyticsScreen = lazy(() =>
  import('@/features/analytics/AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen })),
);

function LazyFallback() {
  return <div style={{ padding: 'var(--gap-l)', color: 'var(--text-faint)' }}>Cargando…</div>;
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardScreen /> },
        { path: 'movimientos', element: <TransactionsScreen /> },
        { path: 'calendario', element: <CalendarScreen /> },
        { path: 'analisis', element: <Suspense fallback={<LazyFallback />}><AnalyticsScreen /></Suspense> },
        { path: 'ajustes', element: <SettingsScreen /> },
        { path: 'ajustes/categorias', element: <CategoriesScreen /> },
        { path: 'ajustes/recurrentes', element: <RecurringRulesScreen /> },
        { path: 'tarjeta', element: <CreditCardScreen /> },
        { path: 'ajustes/presupuestos', element: <BudgetsScreen /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
