import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonthNav, monthName } from '@/components/ui/MonthNav';
import { db } from '@/data/db';
import { localRepository, DEFAULT_SETTINGS } from '@/data/local/localRepository';
import { seedDemoTransactions } from '@/data/local/demoData';
import { ensureMonthMaterialized } from '@/data/local/materialize';
import { formatMoney } from '@/domain/money/format';
import { calculateMonthBalance } from '@/domain/quincena/balance';
import { calculateMonthFlow } from '@/domain/totals/available';
import { quincenaKey } from '@/domain/quincena/quincena';
import { withResolvedQuincena } from '@/domain/quincena/resolve';
import { shiftMonth } from '@/domain/dates';
import { formatShortDate } from '@/lib/formatShortDate';
import { todayISO, nowISO } from '@/lib/todayISO';
import { selectUpcoming, upcomingTotals, relevantDate } from './upcoming';
import { AnimatedNumber } from './AnimatedNumber';
import { PorPagarSheet } from './PorPagarSheet';
import { haptic } from '@/lib/haptic';
import type { Transaction } from '@/domain/types';


export function DashboardScreen() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [porPagarOpen, setPorPagarOpen] = useState(false);

  const today = todayISO();
  const [todayYear, todayMonth, dayOfMonth] = today.split('-').map(Number) as [number, number, number];

  // Mes visible. Arranca en el actual; las flechas lo mueven. Todo lo de
  // abajo (flujo, quincenas, proximos) se recalcula sobre ESTE mes.
  const [cursor, setCursor] = useState({ y: todayYear, m: todayMonth });
  const { y: year, m: month } = cursor;
  const isCurrentMonth = year === todayYear && month === todayMonth;

  // Los recurrentes solo estan materializados ~3 meses adelante. Al mirar
  // un mes fuera de esa ventana hay que crearlos, si no el mes sale vacio
  // aunque la regla no tenga fecha limite.
  useEffect(() => { void ensureMonthMaterialized(year, month); }, [year, month]);

  const settings = useLiveQuery(() => localRepository.getSettings(), []) ?? DEFAULT_SETTINGS;
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

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
  const flow = useMemo(() => calculateMonthFlow(monthTransactions), [monthTransactions]);

  const pendientes = monthTransactions.filter((t) => t.type === 'expense' && t.status === 'pending');
  const programados = monthTransactions.filter((t) => t.type === 'expense' && t.status === 'scheduled');
  const tcComprometido = monthTransactions.filter(
    (t) => t.type === 'expense' && t.status !== 'paid' && t.status !== 'cancelled' && t.cyclePaymentDate,
  );
  const porPagarCount = pendientes.length + programados.length + tcComprometido.length;

  // Proximos: la MISMA lista del mes que alimenta el hero, para que
  // "falta pagar" de arriba y "esperas gastar" de abajo coincidan.
  const upcoming = useMemo(() => selectUpcoming(monthTransactions, 8), [monthTransactions]);
  const totals = useMemo(() => upcomingTotals(monthTransactions), [monthTransactions]);

  // Quincena activa: solo tiñe el hero cuando estas mirando el mes actual.
  const activeQuincenaIdx = !isCurrentMonth ? -1 : dayOfMonth < settings.quincenaStartDays[1] ? 0 : 1;
  const heroTintVar = activeQuincenaIdx === 1 ? '--q25-soft' : '--q10-soft';
  const heroAccentVar = activeQuincenaIdx === 1 ? '--q25' : '--q10';

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      await seedDemoTransactions();
    } finally {
      setLoadingDemo(false);
    }
  }

  async function toggleTxPaid(tx: Transaction) {
    haptic('medium');
    await localRepository.saveTransaction({
      ...tx,
      status: tx.status === 'paid' ? 'pending' : 'paid',
      updatedAt: nowISO(),
    });
  }

  const nav = (
    <MonthNav
      label={`${monthName(month)} ${year}`}
      onPrev={() => setCursor((c) => shiftMonth(c.y, c.m, -1))}
      onNext={() => setCursor((c) => shiftMonth(c.y, c.m, 1))}
      onToday={isCurrentMonth ? undefined : () => setCursor({ y: todayYear, m: todayMonth })}
    />
  );

  if (transactions.length === 0) {
    return (
      <Screen title={settings.displayName ? `Hola, ${settings.displayName}` : 'Inicio'} subtitle={`${monthName(month)} ${year}`}>
        <EmptyState
          title="Todavía no hay movimientos"
          body="Registra tu primer gasto o ingreso, o carga datos de ejemplo para ver el dashboard funcionando."
          action={{ label: loadingDemo ? 'Cargando...' : 'Cargar datos de ejemplo', onClick: handleLoadDemo }}
        />
      </Screen>
    );
  }

  return (
    <Screen title={settings.displayName ? `Hola, ${settings.displayName}` : 'Inicio'} right={nav}>
      {/* Hero: como termina el mes si todo se cumple. */}
      <div
        style={{
          background: `color-mix(in srgb, var(${heroTintVar}) 65%, var(--surface))`,
          border: `1px solid color-mix(in srgb, var(${heroAccentVar}) 20%, var(--line))`,
          borderRadius: 'var(--radius-l)',
          padding: '20px 20px 16px',
          marginBottom: 12,
          boxShadow: 'var(--shadow-1)',
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: 'var(--text-sm)', color: `var(${heroAccentVar})`, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Te queda este mes
        </p>
        <AnimatedNumber
          value={monthBalance.sobrante}
          format={(n) => formatMoney(n)}
          className="figures"
          style={{
            display: 'block',
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            lineHeight: 'var(--lh-tight)',
            letterSpacing: '-0.022em',
            color: monthBalance.sobrante >= 0 ? 'var(--text)' : 'var(--danger)',
          }}
        />
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Ingresos menos gastos del mes, contando lo pagado y lo que falta.
        </p>

        {/* Los cuatro numeros que lo componen. Ninguno puede ser negativo. */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
            marginTop: 14, borderRadius: 'var(--radius-s)', overflow: 'hidden',
            background: `color-mix(in srgb, var(${heroAccentVar}) 12%, var(--line))`,
          }}
        >
          <FlowCell label="Ya recibiste" value={flow.recibido} tone="positive" />
          <FlowCell label="Falta recibir" value={flow.porRecibir} tone="positive-soft" />
          <FlowCell label="Ya pagaste" value={flow.pagado} tone="plain" />
          <FlowCell label="Falta pagar" value={flow.porPagar} tone="danger-soft" />
        </div>
      </div>

      {/* Dos quincenas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <QuincenaCard
          day={settings.quincenaStartDays[0]}
          restante={monthBalance.quincenas[0].restante}
          colorVar="--q10"
          softVar="--q10-soft"
          isActive={activeQuincenaIdx === 0}
        />
        <QuincenaCard
          day={settings.quincenaStartDays[1]}
          restante={monthBalance.quincenas[1].restante}
          colorVar="--q25"
          softVar="--q25-soft"
          isActive={activeQuincenaIdx === 1}
        />
      </div>

      {porPagarCount > 0 && (
        <button
          type="button"
          onClick={() => setPorPagarOpen(true)}
          style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-m)', padding: '14px 16px', marginBottom: 20,
            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
            gap: 12, color: 'var(--text)', boxShadow: 'var(--shadow-1)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
              Desglose de lo que falta pagar
            </div>
            <div className="figures" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {porPagarCount} · {formatMoney(flow.porPagar)}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 2 }}>
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {programados.length} programado{programados.length !== 1 ? 's' : ''} · {tcComprometido.length} en tarjeta
            </div>
          </div>
          <span style={{ color: 'var(--text-faint)', fontSize: 22 }}>›</span>
        </button>
      )}

      {/* Proximos movimientos DEL MES visible: ingresos y gastos. */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 10px' }}>
        <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Falta este mes
        </h2>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          {monthName(month).toLowerCase()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <ExpectCard label="Esperas recibir" value={totals.income} color="var(--positive)" sign="+" />
        <ExpectCard label="Esperas gastar" value={totals.expense} color="var(--danger)" sign="−" />
      </div>

      {upcoming.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
          Nada pendiente en {monthName(month).toLowerCase()}. 🎉
        </p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', overflow: 'hidden' }}>
          {upcoming.map((tx, idx) => {
            const cat = tx.categoryId ? categoryById.get(tx.categoryId) : undefined;
            const { day, month: monthLabel } = formatShortDate(relevantDate(tx));
            const isIncome = tx.type === 'income';
            const isPaid = tx.status === 'paid';
            const isLate = isCurrentMonth && relevantDate(tx) < today;
            return (
              <div
                key={tx.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderBottom: idx < upcoming.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleTxPaid(tx)}
                  aria-pressed={isPaid}
                  aria-label={isIncome ? 'Marcar como recibido' : 'Marcar como pagado'}
                  style={{
                    width: 28, height: 28, minWidth: 28, borderRadius: 14, flex: 'none',
                    border: `1.5px solid ${isPaid ? 'var(--positive)' : 'var(--line-strong)'}`,
                    background: isPaid ? 'var(--positive)' : 'transparent',
                    color: isPaid ? '#fff' : 'transparent',
                    display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 14,
                    transition: 'all var(--dur-fast) var(--ease-spring-out)',
                  }}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/movimientos')}
                  style={{
                    flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)',
                  }}
                >
                  <span aria-hidden style={{ fontSize: 22, width: 28, textAlign: 'center', flex: 'none' }}>
                    {cat?.icon ?? (isIncome ? '💰' : '✳️')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.concept}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: isLate ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {isLate ? 'venció ' : ''}{day} {monthLabel}
                    </div>
                  </div>
                </button>
                <span
                  className="figures"
                  style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: isIncome ? 'var(--positive)' : 'var(--text)' }}
                >
                  {isIncome ? '+ ' : ''}{formatMoney(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/movimientos')}
        style={{ marginTop: 16, width: '100%', minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-base)' }}
      >
        Ver todos los movimientos
      </button>

      {porPagarOpen && (
        <PorPagarSheet
          pendientes={pendientes}
          programados={programados}
          enTC={tcComprometido}
          onClose={() => setPorPagarOpen(false)}
        />
      )}
    </Screen>
  );
}

function FlowCell({ label, value, tone }: { label: string; value: number; tone: 'positive' | 'positive-soft' | 'plain' | 'danger-soft' }) {
  const color =
    tone === 'positive' ? 'var(--positive)'
    : tone === 'positive-soft' ? 'color-mix(in srgb, var(--positive) 70%, var(--text-muted))'
    : tone === 'danger-soft' ? 'color-mix(in srgb, var(--danger) 70%, var(--text-muted))'
    : 'var(--text)';
  return (
    <div style={{ background: 'var(--surface)', padding: '10px 12px' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div className="figures" style={{ fontSize: 'var(--text-md)', fontWeight: 700, color }}>{formatMoney(value)}</div>
    </div>
  );
}

function ExpectCard({ label, value, color, sign }: { label: string; value: number; color: string; sign: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', padding: '12px 14px' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div className="figures" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: value > 0 ? color : 'var(--text-faint)' }}>
        {value > 0 ? `${sign} ` : ''}{formatMoney(value)}
      </div>
    </div>
  );
}

function QuincenaCard({ day, restante, colorVar, softVar, isActive }: {
  day: number; restante: number; colorVar: string; softVar: string; isActive: boolean;
}) {
  return (
    <div
      style={{
        background: `var(${softVar})`,
        borderRadius: 'var(--radius-m)',
        padding: '14px 16px',
        border: isActive ? `2px solid var(${colorVar})` : '2px solid transparent',
        position: 'relative',
      }}
    >
      {isActive && (
        <span
          aria-label="Quincena activa"
          style={{
            position: 'absolute', top: 8, right: 10, width: 6, height: 6,
            borderRadius: 3, background: `var(${colorVar})`,
          }}
        />
      )}
      <p style={{ margin: '0 0 6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: `var(${colorVar})`, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        Quincena del {day}
      </p>
      <p className="figures" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700, color: restante >= 0 ? 'var(--text)' : 'var(--danger)' }}>
        {formatMoney(restante)}
      </p>
    </div>
  );
}
