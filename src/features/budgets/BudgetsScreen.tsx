import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { db } from '@/data/db';
import { localRepository } from '@/data/local/localRepository';
import { formatMoney } from '@/domain/money/format';
import { calculateBudgetStatus } from '@/domain/budget/status';
import { calculateSpendByCategory } from '@/domain/totals/byCategory';
import type { Category } from '@/domain/types';
import { todayISO } from '@/lib/todayISO';
import { BudgetAmountSheet } from './BudgetAmountSheet';

const STATE_COLOR: Record<'ok' | 'warning' | 'exceeded', string> = {
  ok: 'var(--positive)', warning: 'var(--q25)', exceeded: 'var(--danger)',
};

export function BudgetsScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const [year, month] = today.split('-').map(Number) as [number, number];

  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const budgets = useLiveQuery(() => localRepository.listBudgets(year, month), [year, month]) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const [editing, setEditing] = useState<Category | null>(null);

  const monthPrefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthPrefix)),
    [transactions, monthPrefix],
  );

  const spendByCategory = useMemo(() => {
    const totals = calculateSpendByCategory(monthTransactions);
    return new Map(totals.map((t) => [t.categoryId, t.amount]));
  }, [monthTransactions]);

  const budgetByCategory = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b])), [budgets]);
  const expenseCategories = categories.filter((c) => !c.isArchived && (c.kind === 'expense' || c.kind === 'both'));

  async function handleSaveBudget(amount: number) {
    if (!editing) return;
    const existing = budgetByCategory.get(editing.id);
    await localRepository.saveBudget({
      id: existing?.id ?? crypto.randomUUID(),
      categoryId: editing.id,
      year,
      month,
      amount,
    });
    setEditing(null);
  }

  return (
    <Screen title="Presupuestos" subtitle="Solo informan, nunca bloquean">
      <button type="button" onClick={() => navigate(-1)} style={{ marginBottom: 16, background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
        ← Volver a ajustes
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {expenseCategories.map((c) => {
          const spent = spendByCategory.get(c.id) ?? 0;
          const budget = budgetByCategory.get(c.id);

          if (!budget) {
            return (
              <button
                key={c.id} type="button" onClick={() => setEditing(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 'var(--tap)', padding: '0 14px', borderRadius: 'var(--radius-m)', border: '1px dashed var(--line-strong)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span aria-hidden>{c.icon}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                  {spent > 0 ? `${formatMoney(spent)} gastado · ` : ''}Definir presupuesto
                </span>
              </button>
            );
          }

          const status = calculateBudgetStatus(spent, budget.amount);
          const pct = Math.min(100, Math.round(status.percentage * 100));
          return (
            <button
              key={c.id} type="button" onClick={() => setEditing(c)}
              style={{ padding: '12px 14px', borderRadius: 'var(--radius-m)', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span aria-hidden>{c.icon}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{c.name}</span>
                <span className="figures" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {formatMoney(spent)} / {formatMoney(budget.amount)}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: STATE_COLOR[status.state], borderRadius: 3 }} />
              </div>
              {status.state === 'exceeded' && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--danger)' }}>
                  Superado por {formatMoney(Math.abs(status.remaining))}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {editing && (
        <BudgetAmountSheet
          category={editing}
          currentAmount={budgetByCategory.get(editing.id)?.amount ?? 0}
          onSave={handleSaveBudget}
          onCancel={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
