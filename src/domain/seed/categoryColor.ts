/**
 * El color con el que se PINTA una categoria, que no es el mismo que el
 * que se GUARDA.
 *
 * En la base se guarda un hex portable, porque esa fila viaja a Postgres y
 * la lee tambien la app nativa, que no entiende CSS. Pero un hex fijo no
 * se adapta al modo oscuro: los colores de categoria necesitan subir de
 * luminosidad sobre fondo negro para mantener contraste.
 *
 * La salida: para las categorias que vienen por defecto se pinta con su
 * token (`var(--cat-hogar)`), que ya trae su variante clara y oscura; para
 * las que el usuario creo o personalizo se usa el hex guardado tal cual.
 * Asi el dato sigue siendo portable y la pantalla sigue siendo legible.
 */
import type { Category } from '../types';

/** Ids de las categorias sembradas que tienen token propio. */
const CON_TOKEN = new Set([
  'cat-hogar', 'cat-alimentacion', 'cat-transporte', 'cat-entretenimiento',
  'cat-viajes', 'cat-salud', 'cat-suscripciones', 'cat-compras',
  'cat-educacion', 'cat-servicios', 'cat-deudas', 'cat-ahorro',
]);

/** 'cat-hogar' -> 'var(--cat-hogar)' */
export function categoryColor(category: Pick<Category, 'id' | 'color'> | null | undefined): string {
  if (!category) return 'var(--text-faint)';
  if (CON_TOKEN.has(category.id)) return `var(--${category.id.replace(/^cat-/, 'cat-')})`;
  return category.color;
}

/** Para 'Otros' y 'Sin categoria', que no son una categoria real. */
export const COLOR_SIN_CATEGORIA = 'var(--text-faint)';
