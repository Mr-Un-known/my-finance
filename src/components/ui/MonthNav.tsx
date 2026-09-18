import { haptic } from '@/lib/haptic';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Nombre del mes 1-12. Devuelve '' fuera de rango en vez de undefined. */
export function monthName(m: number): string {
  return MONTH_NAMES[m - 1] ?? '';
}

/**
 * Navegador de mes: ‹ Septiembre 2026 ›. Lo usan Inicio y Movimientos.
 *
 * Existe porque materialize.ts crea recurrentes hasta 95 dias adelante:
 * sin una ventana de mes, las listas mezclaban diciembre con hoy y
 * ordenadas descendente mostraban el futuro primero. Acotar al mes
 * arregla el orden y de paso deja mirar meses pasados.
 */
export function MonthNav({ label, onPrev, onNext, onToday }: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** undefined = ya estás en el mes actual; el botón "Hoy" se oculta. */
  onToday?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Arrow dir="prev" onClick={onPrev} />
      <button
        type="button"
        onClick={() => { if (onToday) { haptic('light'); onToday(); } }}
        disabled={!onToday}
        aria-label={onToday ? 'Volver al mes actual' : undefined}
        style={{
          minHeight: 'var(--tap)', padding: '0 6px', border: 'none', background: 'none',
          color: onToday ? 'var(--q10)' : 'var(--text-muted)',
          fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap',
          cursor: onToday ? 'pointer' : 'default',
        }}
      >
        {label}
      </button>
      <Arrow dir="next" onClick={onNext} />
    </div>
  );
}

function Arrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { haptic('light'); onClick(); }}
      aria-label={dir === 'prev' ? 'Mes anterior' : 'Mes siguiente'}
      style={{
        width: 'var(--tap)', height: 'var(--tap)', display: 'grid', placeItems: 'center',
        border: 'none', background: 'none', color: 'var(--q10)', fontSize: 20,
        cursor: 'pointer', borderRadius: 'var(--radius-s)',
      }}
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}
