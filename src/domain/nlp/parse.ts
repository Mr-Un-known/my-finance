/**
 * Entiende una frase en español y la convierte en un movimiento.
 *
 * La misma funcion sirve para las tres puertas de entrada:
 *   - dictado por voz  ("gasté 45 mil en el almuerzo con la tarjeta")
 *   - SMS del banco    ("Bancolombia: Compra por $145.000 en EXITO")
 *   - texto escrito    (la barra de "contale a la app")
 *
 * Es deterministica y corre sin conexion: no hay modelo de lenguaje ni
 * llamada a ninguna API. Para plata eso importa — una interpretacion que
 * cambia sola entre dos ejecuciones no es lo que uno quiere en su cuenta
 * de gastos. Lo que aprende, lo aprende del historial del usuario
 * (domain/inference/conceptInference.ts), no de un modelo.
 */
import { addDays, clampDay, parseISO, toISO } from '../dates';
import type { ISODate, PaymentMethodType, TransactionType } from '../types';
import { adivinarCategoria } from './categories';
import { buscarMonto, normalizarTexto } from './numbers';

export interface Parsed {
  type: TransactionType;
  /** null = no se encontro monto; la UI tiene que preguntarlo. */
  amount: number | null;
  concept: string;
  date: ISODate;
  /** Que tipo de metodo de pago mencionó, si mencionó alguno. */
  metodo: PaymentMethodType | null;
  /** Sugerencia por palabras clave. El indice aprendido manda sobre esto. */
  categoryIdSugerida: string | null;
  /** Ya ocurrio (dijo "gasté", o es un SMS de una compra hecha). */
  yaOcurrio: boolean;
}

const VERBOS_INGRESO = [
  'me llego', 'me llegaron', 'recibi', 'me pagaron', 'cobre', 'me consignaron',
  'me transfirieron', 'me entro', 'entro', 'ingreso', 'me depositaron',
  'recibiste', 'abono', 'abonaron', 'te consignaron', 'nomina', 'salario',
];

const VERBOS_GASTO = [
  'gaste', 'pague', 'compre', 'me costo', 'salio', 'gasto', 'pagaste',
  'compra', 'retiraste', 'retire', 'saque',
];

const METODOS: Array<{ tipo: PaymentMethodType; claves: string[] }> = [
  { tipo: 'credit', claves: ['tarjeta de credito', 'con la tarjeta', 'con tarjeta', 'tc', 'credito', 'visa', 'mastercard'] },
  { tipo: 'cash', claves: ['efectivo', 'en efectivo', 'cash', 'billete'] },
  { tipo: 'transfer', claves: ['transferencia', 'nequi', 'daviplata', 'pse', 'transfiri'] },
  { tipo: 'debit', claves: ['debito', 'con la debito', 'tarjeta debito', 'ahorros'] },
];

/** Palabras que sobran en el concepto una vez sacado todo lo demas. */
const RELLENO = new Set([
  'en', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'por', 'para', 'con', 'y', 'a', 'al', 'me', 'mi', 'pesos', 'peso', 'plata',
  'que', 'se', 'lo', 'le', 'su', 'fue', 'es', 'esta', 'hoy',
]);

function contiene(texto: string, frases: string[]): string | null {
  for (const f of frases) {
    const re = new RegExp(`(^|\\s)${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
    if (re.test(texto)) return f;
  }
  return null;
}

/** Fechas relativas habladas. Devuelve la fecha y el texto que la produjo. */
function buscarFecha(texto: string, hoy: ISODate): { date: ISODate; texto: string | null } {
  const h = parseISO(hoy);

  if (/(^|\s)anteayer(\s|$)/.test(texto)) return { date: toISO(addDays(h, -2)), texto: 'anteayer' };
  if (/(^|\s)ayer(\s|$)/.test(texto)) return { date: toISO(addDays(h, -1)), texto: 'ayer' };
  if (/(^|\s)manana(\s|$)/.test(texto)) return { date: toISO(addDays(h, 1)), texto: 'manana' };

  const hace = /hace\s+(\d+)\s+dias?/.exec(texto);
  if (hace) return { date: toISO(addDays(h, -Number(hace[1]))), texto: hace[0] };

  // "el 15" / "el 3" -> ese día del mes actual. Dos dígitos como máximo,
  // para no confundirse con un monto.
  const dia = /(^|\s)el\s+(\d{1,2})(\s|$)/.exec(texto);
  if (dia) {
    const d = Number(dia[2]);
    if (d >= 1 && d <= 31) return { date: toISO({ y: h.y, m: h.m, d: clampDay(h.y, h.m, d) }), texto: dia[0].trim() };
  }

  // Fecha explícita de SMS: 18/09/2026 o 18/09/26
  const explicita = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(texto);
  if (explicita) {
    const [, dd, mm, yy] = explicita;
    const y = Number(yy!.length === 2 ? `20${yy}` : yy);
    const m = Number(mm);
    if (m >= 1 && m <= 12) {
      return { date: toISO({ y, m, d: clampDay(y, m, Number(dd)) }), texto: explicita[0] };
    }
  }

  return { date: hoy, texto: null };
}

/**
 * El concepto: lo que queda después de sacar monto, fecha, verbo y método.
 * Para SMS de banco, el comercio viene después de "en" o "a".
 */
function extraerConcepto(texto: string, aQuitar: Array<string | null>): string {
  let t = texto;
  for (const trozo of aQuitar) {
    if (!trozo) continue;
    t = t.replace(trozo, ' ');
  }
  // La hora del SMS ("18/09/2026 14:32"): la fecha ya se sacó arriba, pero
  // la hora quedaba suelta y terminaba dentro del concepto — el primer SMS
  // real que probé quedó como "Rappi 19 40".
  t = t.replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/g, ' ');
  // Restos de referencia que tampoco son el comercio.
  // Varias palabras seguidas antes del numero: 'saldo disponible 1200000'
  // dejaba 'saldo' suelto cuando el patron solo aceptaba una.
  // La repeticion va ACOTADA a {1,5}. Con `+` sin cota, las alternativas
  // que comparten prefijo (ref/referencia, aut/autorizacion) provocaban
  // backtracking exponencial: 96 caracteres de 'ref ' repetido tardaban
  // 859 ms, y ~150 colgaban el hilo por minutos. No era teorico — este
  // texto llega de una funcion publica a la bandeja, asi que un mensaje
  // corto congelaba el navegador de quien la abriera. En un SMS real
  // nunca hay mas de dos o tres de estas palabras seguidas.
  t = t.replace(/\b(?:(?:ref|referencia|autorizacion|aut|cupo|saldo|disponible|trans|tarjeta|terminada)\s*[:#]?\s*){1,5}\d+/g, ' ');
  const palabras = t
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 0 && !RELLENO.has(p));

  return palabras.join(' ').trim();
}

/** Capitaliza la primera letra; el resto se deja como vino. */
function bonito(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseUtterance(textoOriginal: string, hoy: ISODate): Parsed {
  const texto = normalizarTexto(textoOriginal);

  const ingreso = contiene(texto, VERBOS_INGRESO);
  const gasto = contiene(texto, VERBOS_GASTO);
  // Si dice las dos cosas, gana la que aparece primero.
  let type: TransactionType = 'expense';
  if (ingreso && (!gasto || texto.indexOf(ingreso) < texto.indexOf(gasto))) type = 'income';

  const monto = buscarMonto(textoOriginal);
  const fecha = buscarFecha(texto, hoy);

  let metodo: PaymentMethodType | null = null;
  let metodoTexto: string | null = null;
  for (const { tipo, claves } of METODOS) {
    const hit = contiene(texto, claves);
    if (hit) {
      metodo = tipo;
      metodoTexto = hit;
      break;
    }
  }

  const concepto = extraerConcepto(texto, [
    monto ? normalizarTexto(monto.texto) : null,
    fecha.texto,
    metodoTexto,
    ingreso,
    gasto,
    // Ruido típico de SMS de banco.
    'bancolombia', 'davivienda', 'nequi', 'daviplata', 'bbva', 'scotiabank',
    'le informa', 'te informa', 'informa', 'aprobada', 'aprobado', 'hora',
  ]);

  return {
    type,
    amount: monto?.valor ?? null,
    concept: bonito(concepto),
    date: fecha.date,
    metodo,
    categoryIdSugerida: adivinarCategoria(concepto || texto),
    // Un SMS de banco siempre reporta algo que ya pasó. En habla, "gasté"
    // y "me llegó" también son pasado; "voy a pagar" no lo tratamos.
    yaOcurrio: fecha.date <= hoy,
  };
}
