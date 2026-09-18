import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/data/db';
import { localRepository, DEFAULT_SETTINGS } from '@/data/local/localRepository';
import { seedDemoTransactions } from '@/data/local/demoData';
import { formatMoney } from '@/domain/money/format';
import { calculateMonthBalance } from '@/domain/quincena/balance';
import { quincenaKey } from '@/domain/quincena/quincena';
import { withResolvedQuincena } from '@/domain/quincena/resolve';
import { formatShortDate } from '@/lib/formatShortDate';
import { todayISO } from '@/lib/todayISO';
import { selectUpcoming, relevantDate } from './upcoming';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function DashboardScreen() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const settings = useLiveQuery(() => localRepository.getSettings(), []) ?? DEFAULT_SETTINGS;
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const today = todayISO();
  const [year, month] = today.split('-').map(Number) as [number, number];

  const resolved = useMemo(
    () => withResolvedQuincena(transactions, settings.quincenaStartDays),
    [transactions, settings.quincenaStartDays],
  );

  const monthKeys = useMemo(() => [quincenaKey(year, month, 1), quincenaKey(year, month, 2)], [year, month]);

  const monthTransactions = useMemo(
    () => resolved.filter((t) => monthKeys.includes(t.resolvedQuincenaKey)),
    [resolved, monthKeys],
  );

  const monthBalance = useMemo(() => calculateMonthBalance(resolved, year, month), [resolved, year, month]);

  const pendientes = monthTransactions.filter((t) => t.type === 'expense' && t.status === 'pending');
  const programados = monthTransactions.filter((t) => t.type === 'expense' && t.status === 'scheduled');
  const tcComprometido = monthTransactions.filter(
    (t) => t.type === 'expense' && t.status !== 'paid' && t.status !== 'cancelled' && t.cyclePaymentDate,
  );

  const upcoming = useMemo(() => selectUpcoming(transactions, 5), [transactions]);

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      await seedDemoTransactions();
    } finally {
      setLoadingDemo(false);
    }
  }

  if (transactions.length === 0) {
    return (
      <Screen title="Inicio" subtitle={`${MONTH_NAMES[month - 1]} ${year}`}>
        <EmptyState
          title="Todavía no hay movimientos"
          body="Registra tu primer gasto o ingreso, o carga datos de ejemplo para ver el dashboard funcionando."
          action={{ label: loadingDemo ? 'Cargando...' : 'Cargar datos de ejemplo', onClick: handleLoadDemo }}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Inicio" subtitle={`${MONTH_NAMES[month - 1]} ${year}`}>
      {/* Sobrante del mes: el numero grande. Ingresos totales - gastos totales, sin filtrar por status. */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-l)', padding: '18px 18px 16px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Sobrante del mes</p>
        <p className="figures" style={{ margin: 0, fontSize: 34, fontWeight: 700, color: monthBalance.sobrante >= 0 ? 'var(--text)' : 'var(--danger)' }}>
          {formatMoney(monthBalance.sobrante)}
        </p>
      </div>

      {/* Dos quincenas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <QuincenaCard label="Quincena del" day={settings.quincenaStartDays[0]} restante={monthBalance.quincenas[0].restante} colorVar="--q10" softVar="--q10-soft" />
        <QuincenaCard label="Quincena del" day={settings.quincenaStartDays[1]} restante={monthBalance.quincenas[1].restante} colorVar="--q25" softVar="--q25-soft" />
      </div>

      {/* Chips de estado */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        <MiniChip label="Pendientes" count={pendientes.length} amount={sum(pendientes)} />
        <MiniChip label="Programados" count={programados.length} amount={sum(programados)} />
        <MiniChip label="En TC" count={tcComprometido.length} amount={sum(tcComprometido)} onClick={() => navigate('/tarjeta')} />
      </div>

      {/* Proximos pagos */}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>Próximos pagos</h2>
      {upcoming.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>No tienes pagos pendientes ni programados. 🎉</p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', padding: '4px 14px' }}>
          {upcoming.map((tx) => {
            const cat = tx.categoryId ? categoryById.get(tx.categoryId) : undefined;
            const { day, month: monthLabel } = formatShortDate(relevantDate(tx));
            return (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span aria-hidden style={{ fontSize: 18 }}>{cat?.icon ?? '✳️'}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.concept}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{day} {monthLabel}</span>
                <span className="figures" style={{ fontWeight: 600 }}>{formatMoney(tx.amount)}</span>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/movimientos')}
        style={{ marginTop: 16, width: '100%', minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
      >
        Ver todos los movimientos
      </button>
    </Screen>
  );
}

function sum(txs: { amount: number }[]): number {
  return txs.reduce((acc, t) => acc + t.amount, 0);
}

function QuincenaCard({ label, day, restante, colorVar, softVar }: {
  label: string; day: number; restante: number; colorVar: string; softVar: string;
}) {
  return (
    <div style={{ background: `var(${softVar})`, borderRadius: 'var(--radius-m)', padding: '12px 14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: `var(${colorVar})` }}>{label} {day}</p>
      <p className="figures" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{formatMoney(restante)}</p>
    </div>
  );
}

function MiniChip({ label, count, amount, onClick }: { label: string; count: number; amount: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ flex: 'none', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-s)', padding: '8px 12px', minWidth: 108, cursor: onClick ? 'pointer' : 'default' }}
    >
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{label} · {count}</p>
      <p className="figures" style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{formatMoney(amount)}</p>
    </button>
  );
}
