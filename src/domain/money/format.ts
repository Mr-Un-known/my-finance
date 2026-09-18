/**
 * Formato colombiano: $ 2.500.000  (punto de miles, sin decimales)
 */

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(
  amount: number,
  locale = 'es-CO',
  currency = 'COP',
): string {
  // El NBSP que mete Intl se reemplaza por espacio normal para que no
  // se vea raro en iOS.
  return formatter(locale, currency).format(amount).replace(/\u00a0/g, ' ');
}

/** Version compacta para graficos: $ 2,5 M */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (abs >= 1_000) return `${sign}$ ${Math.round(abs / 1_000)} k`;
  return `${sign}$ ${abs}`;
}

/**
 * Acepta lo que el usuario escriba: '85000', '85.000', '$ 85.000', '85,000'.
 * Devuelve null si no hay un numero valido.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
