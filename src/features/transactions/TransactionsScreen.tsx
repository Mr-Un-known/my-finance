import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/data/db';
import { localRepository, DEFAULT_SETTINGS } from '@/data/local/localRepository';
import { seedDemoTransactions } from '@/data/local/demoData';
import { maybeScheduleReminder } from '@/features/notifications/scheduleReminder';
import { formatMoney } from '@/domain/money/format';
import type { Transaction } from '@/domain/types';
import { groupByQuincena } from './groupByQuincena';
import { TransactionRow } from './TransactionRow';
import { TransactionForm } from './TransactionForm';

export function TransactionsScreen() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);

  const settings = useLiveQuery(() => localRepository.getSettings(), []) ?? DEFAULT_SETTINGS;
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const paymentMethods = useLiveQuery(() => localRepository.listPaymentMethods(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  useEffect(() => {
    if (params.get('nuevo') === '1') {
      setEditing(null);
      setFormOpen(true);
      const next = new URLSearchParams(params);
      next.delete('nuevo');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const methodById = useMemo(() => new Map(paymentMethods.map((m) => [m.id, m])), [paymentMethods]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => t.concept.toLowerCase().includes(q));
  }, [transactions, query]);

  const groups = useMemo(
    () => groupByQuincena(filtered, settings.quincenaStartDays),
    [filtered, settings.quincenaStartDays],
  );

  async function togglePaid(tx: Transaction) {
    await localRepository.saveTransaction({
      ...tx,
      status: tx.status === 'paid' ? 'pending' : 'paid',
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleSave(tx: Transaction) {
    await localRepository.saveTransaction(tx);
    void maybeScheduleReminder(tx, settings).catch((e: unknown) => {
      console.error('No se pudo programar el recordatorio en la nube:', e);
    });
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!editing) return;
    await localRepository.deleteTransaction(editing.id);
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDuplicate() {
    if (!editing) return;
    const now = new Date().toISOString();
    await localRepository.saveTransaction({
      ...editing,
      id: crypto.randomUUID(),
      status: 'pending',
      quincenaKey: null,
      createdAt: now,
      updatedAt: now,
    });
    setFormOpen(false);
    setEditing(null);
  }

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      await seedDemoTransactions();
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <Screen title="Movimientos" subtitle="Agrupados por quincena">
      {transactions.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          style={{
            width: '100%', minHeight: 'var(--tap)', padding: '0 14px', marginBottom: 'var(--gap-l)',
            borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: 15,
          }}
        />
      )}

      {transactions.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          body="Registra tu primer gasto con el botón +, o carga datos de ejemplo para ver cómo se ve la app funcionando."
          action={{ label: loadingDemo ? 'Cargando...' : 'Cargar datos de ejemplo', onClick: handleLoadDemo }}
        />
      ) : groups.length === 0 ? (
        <EmptyState title="Sin resultados" body={`Nada coincide con "${query}".`} />
      ) : (
        groups.map((group) => (
          <section key={group.key} style={{ marginBottom: 'var(--gap-l)' }}>
            <div
              style={{
                background: `var(${group.softVar})`, borderRadius: 'var(--radius-m)',
                padding: '12px 14px 4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: `var(${group.colorVar})` }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: `var(${group.colorVar})` }}>{group.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{group.rangeLabel}</span>
              </div>

              {group.transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  category={tx.categoryId ? categoryById.get(tx.categoryId) : undefined}
                  paymentMethod={tx.paymentMethodId ? methodById.get(tx.paymentMethodId) : undefined}
                  onTogglePaid={() => togglePaid(tx)}
                  onOpen={() => { setEditing(tx); setFormOpen(true); }}
                />
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 8px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Restante</span>
                <span className="figures" style={{ fontWeight: 700, color: group.balance.restante >= 0 ? 'var(--positive)' : 'var(--danger)' }}>
                  {formatMoney(group.balance.restante)}
                </span>
              </div>
            </div>
          </section>
        ))
      )}

      {formOpen && (
        <TransactionForm
          existing={editing}
          categories={categories}
          paymentMethods={paymentMethods}
          defaultPaymentMethodId={settings.defaultPaymentMethodId ?? paymentMethods.find((m) => m.isDefault)?.id ?? null}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onDuplicate={editing ? handleDuplicate : undefined}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}
    </Screen>
  );
}
