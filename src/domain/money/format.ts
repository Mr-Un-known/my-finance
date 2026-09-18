/**
 * Formato de plata. Por defecto colombiano ($ 2.500.000, punto de miles,
 * sin decimales), pero la moneda y el locale los elige el usuario en la
 * configuracion inicial.
 *
 * El default es una variable de modulo, no un parametro obligatorio, a
 * proposito: hay ~40 call sites de formatMoney() en la UI y ninguno tiene
 * por que cargar con el Settings. La app la fija una vez al arrancar
 * (ver useMoneyFormat) y todos los formatos siguen.
 *
 * NO usa Intl.NumberFormat con style:'currency'. Motivo: la app nativa
 * (mobile/) formatea la misma plata del mismo usuario, y los datos CLDR
 * que trae Dart no son los mismos que los del navegador — es-PE agrupa
 * con coma aqui y con punto alla, y es-ES no agrupa numeros de 4 digitos
 * ("2500 €") mientras Dart si. La tabla de abajo esta duplicada, identica,
 * en mobile/lib/domain/money/format.dart, y los dos tests la verifican:
 * es la unica forma de que las dos apps escriban la misma cifra igual.
 */

interface MonedaFormato {
  simbolo: string;
  /** true = el simbolo va despues ("2.500 €"). */
  sufijo?: boolean;
  /** ¿espacio entre simbolo y numero? */
  espacio?: boolean;
  /** Separador de miles. */
  miles: string;
}

const FORMATOS: Record<string, MonedaFormato> = {
  COP: { simbolo: '$', miles: '.' },
  MXN: { simbolo: '$', miles: ',', espacio: false },
  ARS: { simbolo: '$', miles: '.' },
  CLP: { simbolo: '$', miles: '.', espacio: false },
  PEN: { simbolo: 'S/', miles: ',' },
  USD: { simbolo: '$', miles: ',', espacio: false },
  EUR: { simbolo: '€', miles: '.', sufijo: true },
};

let current = { locale: 'es-CO', currency: 'COP' };

/** La fija la app cuando cargan los Settings. Sin llamarla, queda en COP. */
export function setMoneyLocale(locale: string, currency: string): void {
  current = { locale, currency };
}

function formatoDe(currency: string): MonedaFormato {
  return FORMATOS[currency] ?? { simbolo: currency, miles: '.' };
}

/** Agrupa de a tres desde la derecha. Deterministico, sin depender de CLDR. */
function agrupar(n: number, separador: string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separador);
}

/**
 * El locale no es parametro: con la tabla de arriba, el formato lo decide
 * la moneda sola. Se sigue guardando en Settings porque lo usan las fechas.
 */
export function formatMoney(amount: number, currency = current.currency): string {
  const f = formatoDe(currency);
  const signo = amount < 0 ? '-' : '';
  const cuerpo = agrupar(Math.abs(Math.round(amount)), f.miles);
  const sep = f.espacio === false ? '' : ' ';
  return f.sufijo ? `${signo}${cuerpo}${sep}${f.simbolo}` : `${signo}${f.simbolo}${sep}${cuerpo}`;
}

/** Solo el simbolo de la moneda activa ('$', '€'...), para ejes y etiquetas cortas. */
export function currencySymbol(): string {
  return formatoDe(current.currency).simbolo;
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
