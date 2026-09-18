import type { Category, PaymentMethod, Transaction } from '@/domain/types';
import { formatMoney } from '@/domain/money/format';

import { formatShortDate } from '@/lib/formatShortDate';
function shortDate(iso: string): string {
  const { day, month } = formatShortDate(iso);
  return `${day} ${month}`;
}

export function TransactionRow({
  tx, category, paymentMethod, onTogglePaid, onOpen,
}: {
  tx: Transaction;
  category: Category | undefined;
  paymentMethod: PaymentMethod | undefined;
  onTogglePaid: () => void;
  onOpen: () => void;
}) {
  const isIncome = tx.type === 'income';
  const isCredit = paymentMethod?.type === 'credit';
  const statusLabel =
    tx.status === 'paid' ? 'Pagado'
    : tx.status === 'scheduled' ? 'Programado'
    : tx.status === 'cancelled' ? 'Cancelado'
    : 'Pendiente';

  const subtitleParts = [
    category?.name ?? 'Sin categoría',
    shortDate(tx.date),
    paymentMethod?.name ?? '',
  ];
  if (isCredit && tx.cyclePaymentDate) subtitleParts.push(`se paga el ${shortDate(tx.cyclePaymentDate)}`);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
      <button
        type="button"
        onClick={onTogglePaid}
        aria-pressed={tx.status === 'paid'}
        aria-label={tx.status === 'paid' ? 'Marcar como pendiente' : 'Marcar como pagado'}
        style={{
          width: 26, height: 26, minWidth: 26, borderRadius: 8, flex: 'none',
          border: `1.5px solid ${tx.status === 'paid' ? 'var(--positive)' : 'var(--line-strong)'}`,
          background: tx.status === 'paid' ? 'var(--positive)' : 'transparent',
          color: tx.status === 'paid' ? '#fff' : 'transparent',
          display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 15,
        }}
      >
        ✓
      </button>

      <button
        type="button"
        onClick={onOpen}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span aria-hidden style={{ fontSize: 20, flex: 'none' }}>{category?.icon ?? '✳️'}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.concept}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitleParts.filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>

      <span style={{ textAlign: 'right', flex: 'none' }}>
        <span
          className="figures"
          style={{ display: 'block', fontWeight: 600, color: isIncome ? 'var(--positive)' : 'var(--text)' }}
        >
          {isIncome ? '+' : ''}{formatMoney(tx.amount)}
        </span>
        <span style={{ display: 'block', fontSize: 11, color: tx.status === 'paid' ? 'var(--positive)' : 'var(--text-faint)' }}>
          {statusLabel}
        </span>
      </span>
    </div>
  );
}
