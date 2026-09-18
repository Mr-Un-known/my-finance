import { useMemo, useState } from 'react';
import { calculateCreditCardCycle } from '@/domain/credit-card/cycle';
import { parseMoney } from '@/domain/money/format';
import type { Category, PaymentMethod, Transaction, TransactionType } from '@/domain/types';
import { nowISO, todayISO } from '@/lib/todayISO';

import { formatShortDate } from '@/lib/formatShortDate';
function shortDate(iso: string): string {
  const { day, month } = formatShortDate(iso);
  return `${day} ${month}`;
}

export interface TransactionFormValue {
  type: TransactionType;
  concept: string;
  amountText: string;
  date: string;
  categoryId: string | null;
  paymentMethodId: string | null;
  markPaidNow: boolean;
}

function initialValue(existing: Transaction | null, defaultPaymentMethodId: string | null): TransactionFormValue {
  if (existing) {
    return {
      type: existing.type,
      concept: existing.concept,
      amountText: String(existing.amount),
      date: existing.date,
      categoryId: existing.categoryId,
      paymentMethodId: existing.paymentMethodId,
      markPaidNow: existing.status === 'paid',
    };
  }
  return {
    type: 'expense',
    concept: '',
    amountText: '',
    date: todayISO(),
    categoryId: null,
    paymentMethodId: defaultPaymentMethodId,
    markPaidNow: false,
  };
}

/**
 * El formulario "rapido" pedido en la Fase 0: concepto, valor, categoria,
 * metodo de pago, fecha=hoy por defecto. El estado (pagado/pendiente) es
 * un solo toggle, no un selector — por defecto pendiente, igual que las
 * casillas vacias de tu Excel.
 */
export function TransactionForm({
  existing, categories, paymentMethods, defaultPaymentMethodId,
  onSave, onDelete, onDuplicate, onCancel,
}: {
  existing: Transaction | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
  onSave: (tx: Transaction) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<TransactionFormValue>(() => initialValue(existing, defaultPaymentMethodId));
  const [touched, setTouched] = useState(false);

  const amount = parseMoney(value.amountText);
  const selectedMethod = paymentMethods.find((m) => m.id === value.paymentMethodId);
  const isCredit = selectedMethod?.type === 'credit';

  const paymentPreview = useMemo(() => {
    if (!isCredit || !value.date) return null;
    const cycle = calculateCreditCardCycle(value.date, selectedMethod?.cutoffDay, selectedMethod?.paymentDay);
    return cycle.paymentDate;
  }, [isCredit, value.date, selectedMethod]);

  const canSave = value.concept.trim().length > 0 && amount !== null && amount > 0 && !!value.date;

  function handleSubmit() {
    setTouched(true);
    if (!canSave || amount === null) return;

    const now = nowISO();
    const cycle = isCredit ? calculateCreditCardCycle(value.date, selectedMethod?.cutoffDay, selectedMethod?.paymentDay) : null;

    const tx: Transaction = {
      id: existing?.id ?? crypto.randomUUID(),
      type: value.type,
      concept: value.concept.trim(),
      amount,
      date: value.date,
      categoryId: value.categoryId,
      paymentMethodId: value.paymentMethodId,
      status: value.markPaidNow ? 'paid' : (existing?.status === 'scheduled' ? 'scheduled' : 'pending'),
      notes: existing?.notes,
      quincenaKey: existing?.quincenaKey ?? null,
      cycleCutoffDate: cycle?.cycleCutoff,
      cyclePaymentDate: cycle?.paymentDate,
      recurringRuleId: existing?.recurringRuleId,
      periodKey: existing?.periodKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(tx);
  }

  return (
    <div
      role="dialog"
      aria-label={existing ? 'Editar movimiento' : 'Agregar movimiento'}
      style={{
        position: 'fixed', inset: 0, background: 'color-mix(in srgb, black 40%, transparent)',
        display: 'flex', alignItems: 'flex-end', zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, margin: '0 auto', background: 'var(--surface)',
          borderRadius: '20px 20px 0 0', padding: '10px 20px calc(var(--safe-bottom) + 20px)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-strong)', margin: '4px auto 16px' }} />

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue((v) => ({ ...v, type: t }))}
              aria-pressed={value.type === t}
              style={segmentStyle(value.type === t)}
            >
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>

        <label style={fieldLabel}>Concepto</label>
        <input
          autoFocus
          value={value.concept}
          onChange={(e) => setValue((v) => ({ ...v, concept: e.target.value }))}
          placeholder="Ej. Restaurante"
          style={inputStyle}
        />
        {touched && !value.concept.trim() && <p style={errorText}>Escribe qué es.</p>}

        <label style={fieldLabel}>Valor</label>
        <input
          value={value.amountText}
          onChange={(e) => setValue((v) => ({ ...v, amountText: e.target.value }))}
          placeholder="$ 0"
          inputMode="numeric"
          className="figures"
          style={inputStyle}
        />
        {touched && (amount === null || amount <= 0) && <p style={errorText}>Ingresa un valor válido.</p>}

        <label style={fieldLabel}>Categoría</label>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {categories.filter((c) => c.kind === 'both' || c.kind === value.type).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setValue((v) => ({ ...v, categoryId: c.id }))}
              aria-pressed={value.categoryId === c.id}
              style={{
                flex: 'none', display: 'flex', alignItems: 'center', gap: 6,
                minHeight: 'var(--tap)', padding: '0 12px', borderRadius: 999,
                border: `1.5px solid ${value.categoryId === c.id ? c.color : 'var(--line)'}`,
                background: value.categoryId === c.id ? `color-mix(in srgb, ${c.color} 16%, var(--surface))` : 'var(--surface)',
                color: value.categoryId === c.id ? c.color : 'var(--text)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>

        <label style={fieldLabel}>Método de pago</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setValue((v) => ({ ...v, paymentMethodId: m.id }))}
              aria-pressed={value.paymentMethodId === m.id}
              style={segmentStyle(value.paymentMethodId === m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
        {isCredit && paymentPreview && (
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--q25)', fontWeight: 600 }}>
            Se paga el {shortDate(paymentPreview)}
          </p>
        )}

        <label style={fieldLabel}>Fecha</label>
        <input
          type="date"
          value={value.date}
          onChange={(e) => setValue((v) => ({ ...v, date: e.target.value }))}
          style={inputStyle}
        />

        <button
          type="button"
          onClick={() => setValue((v) => ({ ...v, markPaidNow: !v.markPaidNow }))}
          aria-pressed={value.markPaidNow}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minHeight: 'var(--tap)', padding: '0 4px', margin: '10px 0 20px', background: 'none',
            border: 'none', cursor: 'pointer', color: 'var(--text)',
          }}
        >
          <span>Ya está pagado</span>
          <span
            aria-hidden
            style={{
              width: 44, height: 26, borderRadius: 13, background: value.markPaidNow ? 'var(--positive)' : 'var(--surface-sunken)',
              border: '1px solid var(--line)', position: 'relative', transition: 'background 120ms',
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: value.markPaidNow ? 21 : 2, width: 20, height: 20,
              borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgb(0 0 0/.3)', transition: 'left 120ms',
            }} />
          </span>
        </button>

        <button type="button" onClick={handleSubmit} disabled={!canSave} style={saveButtonStyle(canSave)}>
          Guardar
        </button>

        {existing && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {onDuplicate && (
              <button type="button" onClick={onDuplicate} style={secondaryButtonStyle}>Duplicar</button>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} style={{ ...secondaryButtonStyle, color: 'var(--danger)' }}>
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 6px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', minHeight: 'var(--tap)', padding: '0 12px', marginBottom: 14,
  borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--text)', fontSize: 16,
};
const errorText: React.CSSProperties = { margin: '-10px 0 10px', fontSize: 12, color: 'var(--danger)' };

function segmentStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, minHeight: 'var(--tap)', borderRadius: 'var(--radius-s)',
    border: '1px solid var(--line-strong)', background: active ? 'var(--text)' : 'var(--surface)',
    color: active ? 'var(--surface)' : 'var(--text)', fontWeight: 600, cursor: 'pointer',
  };
}
function saveButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width: '100%', minHeight: 48, borderRadius: 'var(--radius-s)', border: 'none',
    background: enabled ? 'var(--text)' : 'var(--surface-sunken)',
    color: enabled ? 'var(--surface)' : 'var(--text-faint)',
    fontWeight: 700, fontSize: 16, cursor: enabled ? 'pointer' : 'not-allowed',
  };
}
const secondaryButtonStyle: React.CSSProperties = {
  flex: 1, minHeight: 44, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
};
