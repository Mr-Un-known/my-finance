import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterByRange, hastaHoy, rangeBounds, rellenarHuecos, toMonthlyPoints, toQuarterlyPoints, toYearlyPoints, type Range } from './periodAggregate';
import type { Transaction } from '@/domain/types';
import type { MonthPoint } from '@/domain/analytics/series';
import { todayISO } from '@/lib/todayISO';

describe('toQuarterlyPoints', () => {
  it('agrupa meses en su trimestre correcto', () => {
    const points: MonthPoint[] = [
      { year: 2026, month: 1, income: 100, expense: 50 },
      { year: 2026, month: 2, income: 100, expense: 50 },
      { year: 2026, month: 4, income: 200, expense: 0 },
    ];
    const result = toQuarterlyPoints(points);
    expect(result).toEqual([
      { label: 'T1 26', income: 200, expense: 100 },
      { label: 'T2 26', income: 200, expense: 0 },
    ]);
  });
});

describe('toYearlyPoints', () => {
  it('agrupa meses por año', () => {
    const points: MonthPoint[] = [
      { year: 2025, month: 12, income: 100, expense: 0 },
      { year: 2026, month: 1, income: 50, expense: 20 },
    ];
    expect(toYearlyPoints(points)).toEqual([
      { label: '2025', income: 100, expense: 0 },
      { label: '2026', income: 50, expense: 20 },
    ]);
  });
});

describe('rangeBounds', () => {
  it('mes: del 1 al ultimo dia del mes actual', () => {
    expect(rangeBounds('mes', '2026-09-18')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('mes: respeta febrero bisiesto', () => {
    expect(rangeBounds('mes', '2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('trimestre: septiembre cae en Jul-Sep', () => {
    expect(rangeBounds('trimestre', '2026-09-18')).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  });

  it('trimestre: enero cae en Ene-Mar', () => {
    expect(rangeBounds('trimestre', '2026-01-05')).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('año: el año calendario completo', () => {
    expect(rangeBounds('año', '2026-09-18')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('filterByRange', () => {
  const t = (date: string): Transaction => ({
    id: date, type: 'expense', concept: 'x', amount: 1, date,
    categoryId: null, paymentMethodId: null, status: 'paid',
    quincenaKey: null, createdAt: '', updatedAt: '',
  });

  it('excluye el futuro materializado — mes, trimestre y año dan resultados distintos', () => {
    const txs = [t('2026-08-15'), t('2026-09-10'), t('2026-11-20'), t('2027-01-05')];
    const ids = (r: Range) => filterByRange(txs, r, '2026-09-18').map((x) => x.id);
    expect(ids('mes')).toEqual(['2026-09-10']);
    expect(ids('trimestre')).toEqual(['2026-08-15', '2026-09-10']);
    expect(ids('año')).toEqual(['2026-08-15', '2026-09-10', '2026-11-20']);
  });
});

describe('hastaHoy + rellenarHuecos — el "histórico" no muestra el futuro', () => {
  const p = (year: number, month: number, expense = 100) => ({ year, month, income: 0, expense });

  it('descarta los meses posteriores al actual y conserva el actual', () => {
    const serie = [p(2026, 8), p(2026, 9), p(2026, 10), p(2027, 1)];
    expect(hastaHoy(serie, '2026-09-18').map((x) => `${x.year}-${x.month}`))
      .toEqual(['2026-8', '2026-9']);
  });

  it('con datos materializados hasta 2027, ni mes ni trimestre muestran 2027', () => {
    const serie = [p(2026, 4), p(2026, 9), p(2026, 12), p(2027, 3), p(2027, 8)];
    const visible = rellenarHuecos(hastaHoy(serie, '2026-09-18'));

    const etiquetasMes = toMonthlyPoints(visible).slice(-6).map((x) => x.label);
    const etiquetasTrim = toQuarterlyPoints(visible).slice(-4).map((x) => x.label);

    expect(etiquetasMes.some((l) => l.includes('27'))).toBe(false);
    expect(etiquetasTrim.some((l) => l.includes('27'))).toBe(false);
    // Y el último periodo visible es el que estamos viviendo.
    expect(etiquetasMes.at(-1)).toBe('Sep 26');
    expect(etiquetasTrim.at(-1)).toBe('T3 26');
  });

  it('rellena con ceros los meses vacíos intermedios, sin inventar nada antes del primero', () => {
    const relleno = rellenarHuecos([p(2026, 4, 50), p(2026, 7, 80)]);
    expect(relleno.map((x) => `${x.month}:${x.expense}`))
      .toEqual(['4:50', '5:0', '6:0', '7:80']);
  });

  it('cruza el fin de año al rellenar', () => {
    expect(rellenarHuecos([p(2025, 11), p(2026, 2)]).map((x) => `${x.year}-${x.month}`))
      .toEqual(['2025-11', '2025-12', '2026-1', '2026-2']);
  });

  it('un solo punto se deja tal cual', () => {
    expect(rellenarHuecos([p(2026, 9)])).toEqual([p(2026, 9)]);
  });
});

/**
 * La app tiene que envejecer sola. Este test mueve el reloj del sistema a
 * años futuros y comprueba que el corte sigue al reloj, no a una fecha
 * escrita en el código: en 2029 el eje termina en 2029, no en 2026.
 */
describe('el corte sigue al reloj del sistema, año tras año', () => {
  afterEach(() => vi.useRealTimers());

  // Una serie larga: un movimiento cada trimestre durante seis años.
  const serieLarga = Array.from({ length: 6 * 12 }, (_, i) => ({
    year: 2026 + Math.floor(i / 12),
    month: (i % 12) + 1,
    income: 1000,
    expense: 500,
  }));

  const casos = [
    { hoy: '2026-09-18', mes: 'Sep 26', trimestre: 'T3 26', ultimoAño: '2026' },
    { hoy: '2027-01-02', mes: 'Ene 27', trimestre: 'T1 27', ultimoAño: '2027' },
    { hoy: '2029-12-31', mes: 'Dic 29', trimestre: 'T4 29', ultimoAño: '2029' },
    { hoy: '2031-06-05', mes: 'Jun 31', trimestre: 'T2 31', ultimoAño: '2031' },
  ];

  for (const caso of casos) {
    it(`el ${caso.hoy} el eje termina en ${caso.mes}`, () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${caso.hoy}T12:00:00`));

      // Exactamente lo que hace AnalyticsScreen, pero leyendo el reloj.
      const visible = rellenarHuecos(hastaHoy(serieLarga, todayISO()));

      expect(toMonthlyPoints(visible).slice(-6).at(-1)?.label).toBe(caso.mes);
      expect(toQuarterlyPoints(visible).slice(-4).at(-1)?.label).toBe(caso.trimestre);
      expect(toYearlyPoints(visible).at(-1)?.label).toBe(caso.ultimoAño);

      // Y nada posterior a hoy se cuela por ningún lado.
      const añoActual = Number(caso.hoy.slice(0, 4));
      expect(visible.every((p) => p.year <= añoActual)).toBe(true);
    });
  }

  it('la ventana de 6 meses se mueve con el tiempo, no se queda pegada', () => {
    const etiquetas = (hoy: string) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${hoy}T12:00:00`));
      const r = toMonthlyPoints(rellenarHuecos(hastaHoy(serieLarga, todayISO()))).slice(-6).map((x) => x.label);
      vi.useRealTimers();
      return r;
    };
    expect(etiquetas('2026-09-18')).toEqual(['Abr 26', 'May 26', 'Jun 26', 'Jul 26', 'Ago 26', 'Sep 26']);
    expect(etiquetas('2027-02-10')).toEqual(['Sep 26', 'Oct 26', 'Nov 26', 'Dic 26', 'Ene 27', 'Feb 27']);
  });
});
