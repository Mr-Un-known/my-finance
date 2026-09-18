/**
 * Formato de plata. Por defecto colombiano ($ 2.500.000, punto de miles,
 * sin decimales), pero la moneda y el locale los elige el usuario en la
 * configuracion inicial.
 *
 * El default es una variable de modulo, no un parametro obligatorio, a
 * proposito: hay ~40 call sites de formatMoney() en la UI y ninguno tiene
 * por que cargar con el Settings. La app la fija una vez al arrancar
 * (ver useMoneyFormat) y todos los formatos siguen.
 */

const formatters = new Map<string, Intl.NumberFormat>();

let current = { locale: 'es-CO', currency: 'COP' };

/** La fija la app cuando cargan los Settings. Sin llamarla, queda en COP. */
export function setMoneyLocale(locale: string, currency: string): void {
  current = { locale, currency };
}

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
  locale = current.locale,
  currency = current.currency,
): string {
  // El NBSP que mete Intl se reemplaza por espacio normal para que no
  // se vea raro en iOS.
  return formatter(locale, currency).format(amount).replace(/\u00a0/g, ' ');
}

/** Solo el simbolo de la moneda activa ('$', '€'...), para ejes y etiquetas cortas. */
export function currencySymbol(): string {
  // formatToParts es la unica forma fiable: el simbolo depende de la
  // combinacion locale+moneda, no de la moneda sola (US$ vs $).
  const parts = formatter(current.locale, current.currency).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? '$';
}

/** Version compacta para graficos: $ 2,5 M */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sym = currencySymbol();
  if (abs >= 1_000_000) {
    return `${sign}${sym} ${(abs / 1_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (abs >= 1_000) return `${sign}${sym} ${Math.round(abs / 1_000)} k`;
  return `${sign}${sym} ${abs}`;
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
