/**
 * Puente entre lo que el parser entiende ("con la tarjeta") y lo que el
 * usuario tiene configurado de verdad.
 *
 * Vive aparte del parser porque el parser es puro y no sabe nada de la
 * base: devuelve un TIPO de método, y acá se busca cuál de los métodos
 * reales del usuario corresponde.
 */
import type { Id, PaymentMethod, PaymentMethodType } from '../types';

/** El primer método del usuario de ese tipo, o null si no tiene ninguno. */
export function metodoPorTipo(
  metodos: PaymentMethod[],
  tipo: PaymentMethodType | null,
): Id | null {
  if (!tipo) return null;
  const exacto = metodos.find((m) => m.type === tipo);
  return exacto?.id ?? null;
}

/**
 * La categoría que se va a proponer, dando prioridad a lo aprendido.
 *
 * La tabla de palabras clave es el piso: si el usuario ya guardó antes ese
 * concepto con otra categoría, esa gana. Es lo que hace que la app mejore
 * con el uso en vez de quedarse con lo que alguien adivinó una vez.
 */
export function categoriaFinal(
  aprendida: Id | null,
  sugerida: Id | null,
  categoriasExistentes: Id[],
): Id | null {
  const existe = (id: Id | null) => id !== null && categoriasExistentes.includes(id);
  if (existe(aprendida)) return aprendida;
  if (existe(sugerida)) return sugerida;
  return null;
}
