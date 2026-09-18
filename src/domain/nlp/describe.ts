/**
 * Devuelve en español lo que la app entendió, para que el usuario pueda
 * confirmarlo de un vistazo antes de guardar.
 *
 * Es texto armado con plantillas, no generado: tiene que decir exactamente
 * lo que se va a guardar. Una respuesta "natural" que no coincida con el
 * dato guardado es peor que una seca que sí.
 */
import { formatMoney } from '../money/format';
import type { Category, ISODate, PaymentMethod } from '../types';
import type { Parsed } from './parse';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "hoy", "ayer", o "el 15 de septiembre". */
export function describirFecha(fecha: ISODate, hoy: ISODate): string {
  if (fecha === hoy) return 'hoy';
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number];
  const [hy, hm, hd] = hoy.split('-').map(Number) as [number, number, number];
  const dias = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(hy, hm - 1, hd)) / 86_400_000,
  );
  if (dias === -1) return 'ayer';
  if (dias === -2) return 'anteayer';
  if (dias === 1) return 'mañana';
  return `el ${d} de ${MESES[m - 1]}`;
}

export interface Descripcion {
  /** La línea principal: qué se va a guardar. */
  resumen: string;
  /** Lo que falta para poder guardar, si falta algo. */
  falta: string | null;
  /** Por qué eligió esa categoría, cuando la eligió. */
  nota: string | null;
}

export function describir(
  parsed: Parsed,
  contexto: {
    hoy: ISODate;
    categoryId: string | null;
    categorias: Category[];
    paymentMethodId: string | null;
    metodos: PaymentMethod[];
    /** true si la categoría salió del historial del usuario, no de la tabla. */
    aprendida: boolean;
  },
): Descripcion {
  const verbo = parsed.type === 'income' ? 'Ingreso' : 'Gasto';
  const cat = contexto.categorias.find((c) => c.id === contexto.categoryId);
  const met = contexto.metodos.find((m) => m.id === contexto.paymentMethodId);

  const partes: string[] = [];
  partes.push(parsed.amount != null ? `${verbo} de ${formatMoney(parsed.amount)}` : verbo);
  if (parsed.concept) partes.push(`en ${parsed.concept}`);
  partes.push(describirFecha(parsed.date, contexto.hoy));
  if (met) partes.push(`con ${met.name}`);

  const resumen = `${partes.join(', ')}.`;

  const falta = parsed.amount == null
    ? '¿Cuánto fue?'
    : !parsed.concept
    ? '¿En qué fue?'
    : null;

  const nota = cat
    ? contexto.aprendida
      ? `Lo puse en ${cat.name}, como la última vez.`
      : `Lo puse en ${cat.name}.`
    : parsed.concept
    ? 'No le encontré categoría; elígela y la recuerdo para la próxima.'
    : null;

  return { resumen, falta, nota };
}
