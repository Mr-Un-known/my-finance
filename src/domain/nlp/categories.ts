/**
 * Adivinanza de categoria por palabras clave.
 *
 * Es el PISO, no el techo: solo se usa cuando el indice de conceptos
 * (domain/inference) todavia no aprendio nada de ese concepto. Apenas el
 * usuario guarda una vez "almuerzo" con otra categoria, el indice manda y
 * esta tabla deja de opinar. Por eso puede ser tosca sin hacer daño.
 *
 * Los ids son los de defaultCategories.ts. Si el usuario borro esa
 * categoria en la configuracion inicial, el caller lo detecta y no la usa.
 */
import { normalizarTexto } from './numbers';

const PALABRAS: Array<{ categoryId: string; claves: string[] }> = [
  { categoryId: 'cat-alimentacion', claves: [
    'almuerzo', 'comida', 'mercado', 'restaurante', 'cafe', 'desayuno', 'cena',
    'domicilio', 'rappi', 'exito', 'd1', 'ara', 'olimpica', 'carulla', 'jumbo',
    'panaderia', 'supermercado', 'pizza', 'hamburguesa', 'almorzar', 'tienda',
  ] },
  { categoryId: 'cat-transporte', claves: [
    'uber', 'taxi', 'gasolina', 'bus', 'transmilenio', 'parqueadero', 'peaje',
    'didi', 'cabify', 'pasaje', 'metro', 'combustible', 'lavada', 'monteria',
  ] },
  { categoryId: 'cat-suscripciones', claves: [
    'netflix', 'spotify', 'disney', 'hbo', 'max', 'youtube', 'icloud', 'prime',
    'suscripcion', 'plan celular', 'chatgpt',
  ] },
  { categoryId: 'cat-entretenimiento', claves: [
    'cine', 'bar', 'concierto', 'teatro', 'fiesta', 'salida', 'cerveza',
    'discoteca', 'juego', 'videojuego',
  ] },
  { categoryId: 'cat-hogar', claves: [
    'arriendo', 'administracion', 'internet', 'wifi', 'aseo', 'muebles',
    'ferreteria', 'homecenter', 'hogar',
  ] },
  { categoryId: 'cat-servicios', claves: [
    'luz', 'agua', 'gas', 'energia', 'celular', 'factura', 'recibo', 'epm',
    'acueducto', 'telefono', 'claro', 'movistar', 'tigo',
  ] },
  { categoryId: 'cat-salud', claves: [
    'drogueria', 'farmacia', 'medico', 'eps', 'medicina', 'odontologo',
    'cruz verde', 'locatel', 'gimnasio', 'gym', 'consulta',
  ] },
  { categoryId: 'cat-compras', claves: [
    'ropa', 'zapatos', 'amazon', 'mercadolibre', 'falabella', 'zara', 'regalo',
    'tecnologia', 'celular nuevo', 'compra',
  ] },
  { categoryId: 'cat-educacion', claves: [
    'curso', 'universidad', 'matricula', 'libro', 'semestre', 'colegio', 'clase',
  ] },
  { categoryId: 'cat-deudas', claves: ['cuota', 'prestamo', 'credito', 'deuda'] },
  { categoryId: 'cat-ahorro', claves: ['ahorro', 'ahorre', 'cdt', 'inversion'] },
];

/**
 * Categoria sugerida para un texto, o null si ninguna palabra pega.
 * Gana la coincidencia mas larga: "plan celular" antes que "celular".
 */
export function adivinarCategoria(texto: string): string | null {
  const t = normalizarTexto(texto);
  let mejor: { categoryId: string; largo: number } | null = null;

  for (const { categoryId, claves } of PALABRAS) {
    for (const clave of claves) {
      // Límite de palabra para que "max" no pegue dentro de "maxima".
      const re = new RegExp(`(^|\\s)${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
      if (re.test(t) && (!mejor || clave.length > mejor.largo)) {
        mejor = { categoryId, largo: clave.length };
      }
    }
  }
  return mejor?.categoryId ?? null;
}
