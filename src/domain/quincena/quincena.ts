/**
 * Quincenas configurables. Por defecto: quincena del 10 y quincena del 25.
 * NO son mitades del mes (1-14 / 15-fin): son ventanas que arrancan el dia
 * que el usuario configure, y la segunda ventana cruza el cambio de mes.
 *
 * Ejemplo con startDays=[10,25]:
 *   Quincena del 10:  10 -> 24
 *   Quincena del 25:  25 -> 9 del mes siguiente
 *
 * Por eso "Arriendo", pagado el 1 de octubre, cae dentro de la
 * "quincena del 25" de SEPTIEMBRE — asi es como el usuario ya la usa.
 */
import { addDays, clampDay, daysInMonth, parseISO, shiftMonth, toISO } from '../dates';
import type { ISODate, QuincenaKey } from '../types';

export interface QuincenaRange {
  key: QuincenaKey;
  start: ISODate;
  end: ISODate;
}

export function quincenaKey(y: number, m: number, n: 1 | 2): QuincenaKey {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-Q${n}`;
}

export function calculateQuincena(
  date: ISODate,
  startDays: [number, number] = [10, 25],
): QuincenaRange {
  const [a, b] = startDays[0] < startDays[1] ? startDays : [startDays[1], startDays[0]];
  const { y, m, d } = parseISO(date);

  const aThis = clampDay(y, m, a);
  const bThis = clampDay(y, m, b);

  // Antes de que arranque la primera quincena de este mes: todavia es la
  // segunda quincena del mes anterior (la que cruzo el cambio de mes).
  if (d < aThis) {
    const prev = shiftMonth(y, m, -1);
    const bPrev = clampDay(prev.y, prev.m, b);
    return {
      key: quincenaKey(prev.y, prev.m, 2),
      start: toISO({ ...prev, d: bPrev }),
      end: toISO(addDays({ y, m, d: aThis }, -1)),
    };
  }

  // Dentro de la primera quincena de este mes.
  if (d < bThis) {
    return {
      key: quincenaKey(y, m, 1),
      start: toISO({ y, m, d: aThis }),
      end: toISO(addDays({ y, m, d: bThis }, -1)),
    };
  }

  // Segunda quincena de este mes: arranca aqui y cruza hacia el mes siguiente.
  const next = shiftMonth(y, m, 1);
  const aNext = clampDay(next.y, next.m, a);
  return {
    key: quincenaKey(y, m, 2),
    start: toISO({ y, m, d: bThis }),
    end: toISO(addDays({ ...next, d: aNext }, -1)),
  };
}

/** Util para UI: dado un año/mes, las claves de sus dos quincenas. */
export function quincenasOfMonth(year: number, month: number): [QuincenaKey, QuincenaKey] {
  return [quincenaKey(year, month, 1), quincenaKey(year, month, 2)];
}

/** Solo para referencia/debug: cuantos dias tiene el mes de una quincena. Nunca usado para logica de negocio critica. */
export function daysInQuincenaMonth(year: number, month: number): number {
  return daysInMonth(year, month);
}

/**
 * Reconstruye el rango completo (start/end) a partir de una llave de
 * quincena, sin depender de tener una transaccion real en la mano.
 * Util para la UI: encabezados de grupo, calendario, etc.
 */
export function rangeOfQuincenaKey(
  key: QuincenaKey,
  startDays: [number, number] = [10, 25],
): QuincenaRange {
  const match = /^(\d{4})-(\d{2})-Q([12])$/.exec(key);
  if (!match) throw new Error(`Quincena key invalida: "${key}"`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const n = Number(match[3]) as 1 | 2;
  const [a, b] = startDays[0] < startDays[1] ? startDays : [startDays[1], startDays[0]];
  const day = n === 1 ? a : b;
  const anchor = toISO({ y, m, d: clampDay(y, m, day) });
  return calculateQuincena(anchor, startDays);
}
