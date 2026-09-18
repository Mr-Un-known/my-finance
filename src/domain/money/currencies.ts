/**
 * Monedas que ofrece la configuracion inicial. Cada una trae su locale
 * porque el formato depende del par: 'es-CO' + COP da "$ 2.500.000",
 * 'en-US' + COP daria "COP 2,500,000".
 *
 * La lista es corta a proposito: son las de la region donde se usa la app.
 * Agregar una es una linea; un selector de las 180 de ISO 4217 no lo es.
 */
export interface CurrencyOption {
  code: string;
  locale: string;
  label: string;
  /** Ejemplo ya formateado, para que se vea antes de elegir. */
  sample: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'COP', locale: 'es-CO', label: 'Peso colombiano', sample: '$ 2.500.000' },
  { code: 'MXN', locale: 'es-MX', label: 'Peso mexicano', sample: '$2,500' },
  { code: 'ARS', locale: 'es-AR', label: 'Peso argentino', sample: '$ 2.500' },
  { code: 'CLP', locale: 'es-CL', label: 'Peso chileno', sample: '$2.500' },
  { code: 'PEN', locale: 'es-PE', label: 'Sol peruano', sample: 'S/ 2,500' },
  { code: 'USD', locale: 'en-US', label: 'Dólar', sample: '$2,500' },
  { code: 'EUR', locale: 'es-ES', label: 'Euro', sample: '2.500 €' },
];

export function currencyByCode(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
