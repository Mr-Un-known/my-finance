import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonthNav, monthName } from '@/components/ui/MonthNav';
import { db } from '@/data/db';
import { localRepository, DEFAULT_SETTINGS } from '@/data/local/localRepository';
import { seedDemoTransactions } from '@/data/local/demoData';
import { ensureMonthMaterialized } from '@/data/local/materialize';
import { maybeScheduleReminder } from '@/features/notifications/scheduleReminder';
import { formatMoney } from '@/domain/money/format';
import { quincenaKey } from '@/domain/quincena/quincena';
import { withResolvedQuincena } from '@/domain/quincena/resolve';
import { shiftMonth } from '@/domain/dates';
import { todayISO } from '@/lib/todayISO';
import type { Transaction, TransactionType } from '@/domain/types';
import { groupByQuincena } from './groupByQuincena';
import { TransactionRow } from './TransactionRow';
import { TransactionForm, type Prefill } from './TransactionForm';


export function TransactionsScreen() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | undefined>();
  const [query, setQuery] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);

  const today = todayISO();
  const [todayYear, todayMonth] = today.split('-').map(Number) as [number, number];
  const [cursor, setCursor] = useState({ y: todayYear, m: todayMonth });
  const isCurrentMonth = cursor.y === todayYear && cursor.m === todayMonth;

  // Ver DashboardScreen: el mes que se mira tiene que tener sus
  // instancias recurrentes creadas, aunque sea de dentro de dos años.
  useEffect(() => { void ensureMonthMaterialized(cursor.y, cursor.m); }, [cursor]);

  const settings = useLiveQuery(() => localRepository.getSettings(), []) ?? DEFAULT_SETTINGS;
  const categories = useLiveQuery(() => localRepository.listCategories(), []) ?? [];
  const paymentMethods = useLiveQuery(() => localRepository.listPaymentMethods(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  // Abrir el form desde una URL. Esto es lo que usa el Atajo de iOS:
  //   /movimientos?nuevo=1&tipo=ingreso&monto=3000000&concepto=Sueldo&pagado=1
  useEffect(() => {
    if (params.get('nuevo') !== '1') return;
    const tipo: TransactionType = params.get('tipo') === 'ingreso' ? 'income' : 'expense';
    setEditing(null);
    setPrefill({
      type: tipo,
      concept: params.get('concepto') ?? undefined,
      amountText: (params.get('monto') ?? '').replace(/[^0-9]/g, '') || undefined,
      date: params.get('fecha') ?? undefined,
      markPaidNow: params.get('pagado') === '1' ? true : undefined,
    });
    setFormOpen(true);
    const next = new URLSearchParams(params);
    for (const k of ['nuevo', 'tipo', 'monto', 'concepto', 'fecha', 'pagado']) next.delete(k);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const methodById = useMemo(() => new Map(paymentMethods.map((m) => [m.id, m])), [paymentMethods]);

  // Buscar mira TODO el historial; sin búsqueda, la lista se acota al mes
  // visible. Sin ese tope, los recurrentes materializados a +95 días
  // aparecían arriba de todo y enterraban lo de esta semana.
  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    if (searching) {
      const q = query.trim().toLowerCase();
      return transactions.filter((t) => t.concept.toLowerCase().includes(q));
    }
    const keys = [quincenaKey(cursor.y, cursor.m, 1), quincenaKey(cursor.y, cursor.m, 2)];
    return withResolvedQuincena(transactions, settings.quincenaStartDays)
      .filter((t) => keys.includes(t.resolvedQuincenaKey));
  }, [transactions, query, searching, cursor, settings.quincenaStartDays]);

  const groups = useMemo(
    () => groupByQuincena(visible, settings.quincenaStartDays),
    [visible, settings.quincenaStartDays],
  );

  const monthTotal = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of visible) {
      if (t.status === 'cancelled') continue;
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, count: visible.length };
  }, [visible]);

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
    closeForm();
  }

  async function handleDelete() {
    if (!editing) return;
    await localRepository.deleteTransaction(editing.id);
    closeForm();
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
    closeForm();
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setPrefill(undefined);
  }

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      await seedDemoTransactions();
    } finally {
      setLoadingDemo(false);
    }
  }

  const nav = (
    <MonthNav
      label={`${monthName(cursor.m).slice(0, 3)} ${cursor.y}`}
      onPrev={() => setCursor((c) => shiftMonth(c.y, c.m, -1))}
      onNext={() => setCursor((c) => shiftMonth(c.y, c.m, 1))}
      onToday={isCurrentMonth ? undefined : () => setCursor({ y: todayYear, m: todayMonth })}
    />
  );

  return (
    <Screen title="Movimientos" right={searching ? undefined : nav}>
      {transactions.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en todo el historial…"
          type="search"
          style={{
            width: '100%', minHeight: 'var(--tap)', padding: '0 14px', marginBottom: 'var(--gap-m)',
            borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: 16,
          }}
        />
      )}

      {/* Resumen del mes visible — contexto antes de la lista. */}
      {!searching && transactions.length > 0 && (
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', marginBottom: 'var(--gap-m)',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-m)',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {monthTotal.count} movimiento{monthTotal.count !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'flex', gap: 12, fontSize: 'var(--text-sm)', fontWeight: 700 }}>
            <span className="figures" style={{ color: 'var(--positive)' }}>+ {formatMoney(monthTotal.income)}</span>
            <span className="figures" style={{ color: 'var(--danger)' }}>− {formatMoney(monthTotal.expense)}</span>
          </span>
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          body="Registra tu primer gasto con el botón +, o carga datos de ejemplo para ver cómo se ve la app funcionando."
          action={{ label: loadingDemo ? 'Cargando...' : 'Cargar datos de ejemplo', onClick: handleLoadDemo }}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title={searching ? 'Sin resultados' : 'Mes vacío'}
          body={searching
            ? `Nada coincide con "${query}".`
            : `No hay movimientos en ${monthName(cursor.m).toLowerCase()} ${cursor.y}.`}
        />
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
          prefill={editing ? undefined : prefill}
          categories={categories}
          paymentMethods={paymentMethods}
          defaultPaymentMethodId={settings.defaultPaymentMethodId ?? paymentMethods.find((m) => m.isDefault)?.id ?? null}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onDuplicate={editing ? handleDuplicate : undefined}
          onCancel={closeForm}
        />
      )}
    </Screen>
  );
}
