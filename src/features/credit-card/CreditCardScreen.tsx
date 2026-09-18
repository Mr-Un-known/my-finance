import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/data/db';
import { localRepository } from '@/data/local/localRepository';
import { formatMoney } from '@/domain/money/format';
import { groupByCycle } from '@/domain/credit-card/groupByCycle';
import { formatShortDate } from '@/lib/formatShortDate';
import { todayISO } from '@/lib/todayISO';

export function CreditCardScreen() {
  const navigate = useNavigate();
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const paymentMethods = useLiveQuery(() => localRepository.listPaymentMethods(), []) ?? [];
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const creditMethodIds = useMemo(
    () => new Set(paymentMethods.filter((m) => m.type === 'credit').map((m) => m.id)),
    [paymentMethods],
  );
  const creditTransactions = useMemo(
    () => transactions.filter((t) => t.paymentMethodId && creditMethodIds.has(t.paymentMethodId)),
    [transactions, creditMethodIds],
  );

  const cycles = useMemo(() => groupByCycle(creditTransactions), [creditTransactions]);
  const today = todayISO();

  return (
    <Screen title="Tarjeta de crédito" subtitle="Cada compra, y el total por ciclo">
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        ← Volver
      </button>

      {cycles.length === 0 ? (
        <EmptyState title="Sin compras con tarjeta" body="Cuando registres un gasto con tarjeta de crédito, aquí verás cada compra y el total que se paga en cada ciclo." />
      ) : (
        cycles.map((cycle) => {
          const isNext = cycle.paymentDate >= today;
          const { day, month } = formatShortDate(cycle.paymentDate);
          return (
            <section key={cycle.paymentDate} style={{ marginBottom: 'var(--gap-l)' }}>
              <div style={{ background: isNext ? 'var(--q25-soft)' : 'var(--surface-sunken)', borderRadius: 'var(--radius-m)', padding: '12px 14px 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: isNext ? 'var(--q25)' : 'var(--text-muted)' }}>
                    Se paga el {day} {month}
                  </span>
                  <span className="figures" style={{ fontWeight: 700, fontSize: 17 }}>{formatMoney(cycle.total)}</span>
                </div>

                {cycle.transactions.map((tx) => {
                  const cat = tx.categoryId ? categoryById.get(tx.categoryId) : undefined;
                  const { day: pDay, month: pMonth } = formatShortDate(tx.date);
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                      <span aria-hidden style={{ fontSize: 16 }}>{cat?.icon ?? '✳️'}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{tx.concept}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pDay} {pMonth}</span>
                      <span className="figures" style={{ fontWeight: 600, fontSize: 14 }}>{formatMoney(tx.amount)}</span>
                    </div>
                  );
                })}
                <div style={{ padding: '8px 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>
                  {cycle.count} {cycle.count === 1 ? 'compra' : 'compras'} en este ciclo
                </div>
              </div>
            </section>
          );
        })
      )}
    </Screen>
  );
}
