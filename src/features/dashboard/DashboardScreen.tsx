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
import { calculateAvailableBalance } from '@/domain/totals/available';
import { quincenaKey } from '@/domain/quincena/quincena';
import { withResolvedQuincena } from '@/domain/quincena/resolve';
import { formatShortDate } from '@/lib/formatShortDate';
import { todayISO } from '@/lib/todayISO';
import { selectUpcoming, relevantDate } from './upcoming';
import { AnimatedNumber } from './AnimatedNumber';
import { PorPagarSheet } from './PorPagarSheet';
import { nowISO } from '@/lib/todayISO';
import { haptic } from '@/lib/haptic';
import type { Transaction } from '@/domain/types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function DashboardScreen() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [porPagarOpen, setPorPagarOpen] = useState(false);
  const [showDisponibleInfo, setShowDisponibleInfo] = useState(false);

  const settings = useLiveQuery(() => localRepository.getSettings(), []) ?? DEFAULT_SETTINGS;
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const today = todayISO();
  const [year, month, dayOfMonth] = today.split('-').map(Number) as [number, number, number];

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
  const available = useMemo(() => calculateAvailableBalance(monthTransactions), [monthTransactions]);

  const pendientes = monthTransactions.filter((t) => t.type === 'expense' && t.status === 'pending');
  const programados = monthTransactions.filter((t) => t.type === 'expense' && t.status === 'scheduled');
  const tcComprometido = monthTransactions.filter(
    (t) => t.type === 'expense' && t.status !== 'paid' && t.status !== 'cancelled' && t.cyclePaymentDate,
  );

  const porPagarCount = pendientes.length + programados.length + tcComprometido.length;
  const porPagarTotal = sum(pendientes) + sum(programados) + sum(tcComprometido);

  const upcoming = useMemo(() => selectUpcoming(transactions, 5), [transactions]);

  // Quincena activa según el día actual — tinta el hero.
  const activeQuincenaIdx = dayOfMonth < settings.quincenaStartDays[1] ? 0 : 1;
  const heroTintVar = activeQuincenaIdx === 0 ? '--q10-soft' : '--q25-soft';
  const heroAccentVar = activeQuincenaIdx === 0 ? '--q10' : '--q25';

  const showDisponible = available.libreReal !== monthBalance.sobrante;

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
      {/* Hero: Sobrante del mes con tinte de la quincena activa + Disponible ahora como sub-línea. */}
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
          Sobrante del mes
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
        {showDisponible && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid color-mix(in srgb, var(${heroAccentVar}) 15%, var(--line))`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }} aria-hidden>💵</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', flex: 1 }}>Disponible ahora</span>
            <span className="figures" style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: available.libreReal >= 0 ? 'var(--text)' : 'var(--danger)' }}>
              {formatMoney(available.libreReal)}
            </span>
            <button
              type="button"
              onClick={() => setShowDisponibleInfo(true)}
              aria-label="¿Qué es Disponible ahora?"
              style={{
                width: 24, height: 24, borderRadius: 12, border: '1px solid var(--line-strong)',
                background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ?
            </button>
          </div>
        )}
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

      {/* Chip único "Por pagar" — reemplaza los 3 chips */}
      {porPagarCount > 0 && (
        <button
          type="button"
          onClick={() => setPorPagarOpen(true)}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-m)',
            padding: '14px 16px',
            marginBottom: 20,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--text)',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
              Por pagar
            </div>
            <div className="figures" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {porPagarCount} · {formatMoney(porPagarTotal)}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 2 }}>
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {programados.length} programado{programados.length !== 1 ? 's' : ''} · {tcComprometido.length} en tarjeta
            </div>
          </div>
          <span style={{ color: 'var(--text-faint)', fontSize: 22 }}>›</span>
        </button>
      )}

      {/* Próximos movimientos (renombrado) — solo gastos, ya filtrado en upcoming.ts */}
      <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        Próximos movimientos
      </h2>
      {upcoming.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>No tienes pagos pendientes ni programados. 🎉</p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', overflow: 'hidden' }}>
          {upcoming.map((tx, idx) => {
            const cat = tx.categoryId ? categoryById.get(tx.categoryId) : undefined;
            const { day, month: monthLabel } = formatShortDate(relevantDate(tx));
            const isPaid = tx.status === 'paid';
            return (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: idx < upcoming.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleTxPaid(tx)}
                  aria-pressed={isPaid}
                  aria-label={isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
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
                  <span aria-hidden style={{ fontSize: 22, width: 28, textAlign: 'center', flex: 'none' }}>{cat?.icon ?? '✳️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.concept}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {day} {monthLabel}
                    </div>
                  </div>
                </button>
                <span className="figures" style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>
                  {formatMoney(tx.amount)}
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

      {showDisponibleInfo && (
        <div
          role="dialog"
          aria-label="Disponible ahora — explicación"
          onClick={() => setShowDisponibleInfo(false)}
          style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, black 40%, transparent)', display: 'flex', alignItems: 'flex-end', zIndex: 60, animation: 'fadeIn var(--dur-fast) var(--ease-spring-out)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, margin: '0 auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '10px 20px calc(var(--safe-bottom) + 20px)', animation: 'slideUp var(--dur-med) var(--ease-spring-out)' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-strong)', margin: '4px auto 16px' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: 'var(--text-lg)', fontWeight: 700 }}>Disponible ahora</h2>
            <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-normal)' }}>
              Es lo que ya tenés (ingresos pagados menos gastos pagados), menos lo comprometido (pendientes + programados).
            </p>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-normal)' }}>
              Puede ser negativo si aún no llegó el sueldo pero pagaste gastos con ahorro. En cambio, el <strong>Sobrante del mes</strong> (arriba) proyecta lo que quedará al final del mes contando TODO, pagado o no.
            </p>
            <button
              type="button"
              onClick={() => setShowDisponibleInfo(false)}
              style={{ width: '100%', minHeight: 44, borderRadius: 'var(--radius-s)', border: 'none', background: 'var(--text)', color: 'var(--surface)', fontWeight: 700, fontSize: 'var(--text-base)', cursor: 'pointer' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}

function sum(txs: { amount: number }[]): number {
  return txs.reduce((acc, t) => acc + t.amount, 0);
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
