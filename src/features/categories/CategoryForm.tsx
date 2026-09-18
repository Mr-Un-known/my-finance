import { useState } from 'react';
import type { Category } from '@/domain/types';

const ICONS = ['🏠', '🍽️', '🚗', '🎬', '✈️', '💊', '🔁', '🛍️', '🎓', '💡', '💳', '🐷', '✳️', '📱', '🎁', '⚽', '🐾', '👶'];
const COLORS = ['#5B6FE0', '#E0A23B', '#3BA3E0', '#C15BD1', '#3BC1A3', '#E05B5B', '#8A5CF6', '#D18A5B', '#5B8AD1', '#B0721A', '#B3261E', '#1E8E6A', '#6C727F'];

export function CategoryForm({ existing, nextSortOrder, onSave, onCancel, onDelete }: {
  existing: Category | null;
  nextSortOrder: number;
  onSave: (category: Category) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? ICONS[0]!);
  const [color, setColor] = useState(existing?.color ?? COLORS[0]!);
  const [kind, setKind] = useState<Category['kind']>(existing?.kind ?? 'expense');
  const [touched, setTouched] = useState(false);

  const canSave = name.trim().length > 0;

  function handleSubmit() {
    setTouched(true);
    if (!canSave) return;
    onSave({
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      icon,
      color,
      kind,
      isArchived: existing?.isArchived ?? false,
      sortOrder: existing?.sortOrder ?? nextSortOrder,
    });
  }

  return (
    <div
      role="dialog"
      aria-label={existing ? 'Editar categoría' : 'Nueva categoría'}
      style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, black 40%, transparent)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, margin: '0 auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '10px 20px calc(var(--safe-bottom) + 20px)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-strong)', margin: '4px auto 16px' }} />

        <label style={fieldLabel}>Nombre</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Mascotas" style={inputStyle} />
        {touched && !name.trim() && <p style={{ margin: '-10px 0 10px', fontSize: 12, color: 'var(--danger)' }}>Ponle un nombre.</p>}

        <label style={fieldLabel}>Ícono</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {ICONS.map((i) => (
            <button key={i} type="button" onClick={() => setIcon(i)} aria-pressed={icon === i}
              style={{ width: 40, height: 40, borderRadius: 10, fontSize: 18, border: `1.5px solid ${icon === i ? color : 'var(--line)'}`, background: icon === i ? `color-mix(in srgb, ${color} 16%, var(--surface))` : 'var(--surface)', cursor: 'pointer' }}>
              {i}
            </button>
          ))}
        </div>

        <label style={fieldLabel}>Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Color ${c}`}
              style={{ width: 30, height: 30, borderRadius: 15, background: c, border: color === c ? '3px solid var(--text)' : '1px solid var(--line)', cursor: 'pointer' }} />
          ))}
        </div>

        <label style={fieldLabel}>Aplica a</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['expense', 'income', 'both'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} style={segmentStyle(kind === k)}>
              {k === 'expense' ? 'Gastos' : k === 'income' ? 'Ingresos' : 'Ambos'}
            </button>
          ))}
        </div>

        <button type="button" onClick={handleSubmit} disabled={!canSave} style={saveButtonStyle(canSave)}>Guardar</button>

        {existing && onDelete && (
          <button type="button" onClick={onDelete} style={{ width: '100%', minHeight: 44, marginTop: 10, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}>
            Archivar categoría
          </button>
        )}
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 6px' };
const inputStyle: React.CSSProperties = { width: '100%', minHeight: 'var(--tap)', padding: '0 12px', marginBottom: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontSize: 16 };
function segmentStyle(active: boolean): React.CSSProperties {
  return { flex: 1, minHeight: 'var(--tap)', borderRadius: 'var(--radius-s)', border: '1px solid var(--line-strong)', background: active ? 'var(--text)' : 'var(--surface)', color: active ? 'var(--surface)' : 'var(--text)', fontWeight: 600, cursor: 'pointer' };
}
function saveButtonStyle(enabled: boolean): React.CSSProperties {
  return { width: '100%', minHeight: 48, borderRadius: 'var(--radius-s)', border: 'none', background: enabled ? 'var(--text)' : 'var(--surface-sunken)', color: enabled ? 'var(--surface)' : 'var(--text-faint)', fontWeight: 700, fontSize: 16, cursor: enabled ? 'pointer' : 'not-allowed' };
}
