/**
 * Monedas que ofrece la configuracion inicial. Cada una trae su locale
 * porque el formato depende del par: 'es-CO' + COP da "$ 2.500.000",
 * 'en-US' + COP daria "COP 2,500,000".
 *
 * La lista es corta a proposito: son las de la region donde se usa la app.
 * Agregar una es una linea; un selector de las 180 de ISO 4217 no lo es.
 */
import { formatMoney } from './format';

export interface CurrencyOption {
  code: string;
  locale: string;
  label: string;
  /** Monto de ejemplo, para mostrar como se vera antes de elegir. */
  sampleAmount: number;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'COP', locale: 'es-CO', label: 'Peso colombiano', sampleAmount: 2_500_000 },
  { code: 'MXN', locale: 'es-MX', label: 'Peso mexicano', sampleAmount: 2_500 },
  { code: 'ARS', locale: 'es-AR', label: 'Peso argentino', sampleAmount: 2_500 },
  { code: 'CLP', locale: 'es-CL', label: 'Peso chileno', sampleAmount: 2_500 },
  { code: 'PEN', locale: 'es-PE', label: 'Sol peruano', sampleAmount: 2_500 },
  { code: 'USD', locale: 'en-US', label: 'Dólar', sampleAmount: 2_500 },
  { code: 'EUR', locale: 'es-ES', label: 'Euro', sampleAmount: 2_500 },
];

/**
 * El ejemplo se calcula, no se escribe a mano. Cuando estaban hardcodeados
 * uno estaba mal (decia "2.500 €" cuando el formato real era otro) y nadie
 * se enteraba: la configuracion inicial le prometia al usuario un formato
 * que la app despues no usaba.
 */
export function currencySample(c: CurrencyOption): string {
  return formatMoney(c.sampleAmount, c.code);
}

export function currencyByCode(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
