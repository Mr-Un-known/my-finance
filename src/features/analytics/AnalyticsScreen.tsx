import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/data/db';
import { localRepository } from '@/data/local/localRepository';
import { formatCompact, formatMoney } from '@/domain/money/format';
import { calculateDebitVsCredit, calculateFixedVsVariable, monthlySeries } from '@/domain/analytics/series';
import { calculateSpendByCategory } from '@/domain/totals/byCategory';
import { toMonthlyPoints, toQuarterlyPoints, toYearlyPoints, type PeriodPoint } from './periodAggregate';

type Range = 'mes' | 'trimestre' | 'año';

const CHART_COLORS = ['#5B6FE0', '#E0A23B', '#3BA3E0', '#C15BD1', '#3BC1A3', '#E05B5B', '#8A5CF6', '#D18A5B'];

export function AnalyticsScreen() {
  const [range, setRange] = useState<Range>('mes');
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const paymentMethods = useLiveQuery(() => localRepository.listPaymentMethods(), []) ?? [];
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const creditMethodIds = useMemo(
    () => new Set(paymentMethods.filter((m) => m.type === 'credit').map((m) => m.id)),
    [paymentMethods],
  );

  const monthly = useMemo(() => monthlySeries(transactions), [transactions]);
  const points: PeriodPoint[] = useMemo(() => {
    if (range === 'mes') return toMonthlyPoints(monthly).slice(-6);
    if (range === 'trimestre') return toQuarterlyPoints(monthly).slice(-4);
    return toYearlyPoints(monthly);
  }, [monthly, range]);

  const byCategory = useMemo(() => calculateSpendByCategory(transactions).slice(0, 6), [transactions]);
  const fixedVsVariable = useMemo(() => calculateFixedVsVariable(transactions), [transactions]);
  const debitVsCredit = useMemo(() => calculateDebitVsCredit(transactions, creditMethodIds), [transactions, creditMethodIds]);

  if (transactions.length === 0) {
    return (
      <Screen title="Análisis" subtitle="Mes, trimestre y año">
        <EmptyState title="Aún no hay datos para analizar" body="Los gráficos necesitan al menos algunos movimientos registrados." />
      </Screen>
    );
  }

  const totalSpend = byCategory.reduce((acc, c) => acc + c.amount, 0);
  const totalFV = fixedVsVariable.fixed + fixedVsVariable.variable;
  const totalDC = debitVsCredit.debit + debitVsCredit.credit;

  return (
    <Screen title="Análisis" subtitle="Mes, trimestre y año">
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['mes', 'trimestre', 'año'] as const).map((r) => (
          <button
            key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r}
            style={{
              flex: 1, minHeight: 'var(--tap)', borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
              background: range === r ? 'var(--text)' : 'var(--surface)', color: range === r ? 'var(--surface)' : 'var(--text)',
              fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <ChartCard title="Ingresos vs. gastos">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} width={44} />
            <Tooltip formatter={(v) => formatMoney(typeof v === 'number' ? v : Number(v ?? 0))} contentStyle={tooltipStyle} />
            <Bar dataKey="income" name="Ingresos" fill="var(--positive)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Gastos por categoría">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={byCategory} dataKey="amount" nameKey="categoryId" innerRadius={40} outerRadius={65} paddingAngle={2}>
                {byCategory.map((entry, i) => (
                  <Cell key={entry.categoryId ?? 'none'} fill={categoryById.get(entry.categoryId ?? '')?.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, minWidth: 0 }}>
            {byCategory.map((c) => {
              const cat = c.categoryId ? categoryById.get(c.categoryId) : undefined;
              const pct = totalSpend > 0 ? Math.round((c.amount / totalSpend) * 100) : 0;
              return (
                <div key={c.categoryId ?? 'none'} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: cat?.color ?? 'var(--text-faint)', flex: 'none' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat?.name ?? 'Sin categoría'}</span>
                  <span className="figures" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Fijos vs. variables">
        <SplitBar
          a={{ label: 'Fijos', value: fixedVsVariable.fixed, color: 'var(--committed)' }}
          b={{ label: 'Variables', value: fixedVsVariable.variable, color: 'var(--q25)' }}
          total={totalFV}
        />
      </ChartCard>

      <ChartCard title="Débito vs. tarjeta de crédito">
        <SplitBar
          a={{ label: 'Débito', value: debitVsCredit.debit, color: 'var(--q10)' }}
          b={{ label: 'Tarjeta', value: debitVsCredit.credit, color: 'var(--q25)' }}
          total={totalDC}
        />
      </ChartCard>
    </Screen>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', padding: '14px 14px 10px', marginBottom: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>{title}</h2>
      {children}
    </div>
  );
}

function SplitBar({ a, b, total }: { a: { label: string; value: number; color: string }; b: { label: string; value: number; color: string }; total: number }) {
  const pctA = total > 0 ? (a.value / total) * 100 : 50;
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${pctA}%`, background: a.color }} />
        <div style={{ width: `${100 - pctA}%`, background: b.color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span><Dot color={a.color} /> {a.label} · <span className="figures">{formatMoney(a.value)}</span></span>
        <span><Dot color={b.color} /> {b.label} · <span className="figures">{formatMoney(b.value)}</span></span>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 4, background: color, marginRight: 4 }} />;
}

const tooltipStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12,
};
