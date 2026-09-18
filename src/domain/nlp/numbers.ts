/**
 * Numeros de plata escritos como los dice o los escribe una persona.
 *
 * Cubre lo que sale en dictado y en SMS de banco colombiano:
 *   "45000"  "45.000"  "$ 45.000"  "45 mil"  "45k"  "45 lucas"
 *   "cuarenta y cinco mil"  "un millon"  "1.2 millones"  "dos millones y medio"
 *
 * Devuelve pesos ENTEROS, como todo el dominio.
 */

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90,
};

const CIENTOS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700,
  ochocientos: 800, novecientos: 900,
};

/** 'mil'/'millon' multiplican lo acumulado a su izquierda. */
const ESCALAS: Record<string, number> = {
  mil: 1_000,
  miles: 1_000,
  millon: 1_000_000,
  millones: 1_000_000,
  // Coloquiales colombianos: "45 lucas", "dos palos".
  luca: 1_000,
  lucas: 1_000,
  palo: 1_000_000,
  palos: 1_000_000,
};

/** Quita tildes y baja a minúsculas, sin tocar dígitos ni separadores. */
export function normalizarTexto(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Un número escrito en dígitos: '45.000', '45,000', '1.2', '45'.
 *
 * Los separadores son ambiguos y hay que decidir: en Colombia el punto es
 * de miles, pero "1.2 millones" usa el punto como decimal. La regla es el
 * tamaño del último grupo — tres dígitos es miles, otra cosa es decimal.
 */
function digitosANumero(raw: string): number | null {
  const limpio = raw.replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(limpio)) return null;

  const separadores = limpio.match(/[.,]/g) ?? [];
  if (separadores.length === 0) return Number(limpio);

  const ultimo = limpio.lastIndexOf(separadores[separadores.length - 1]!);
  const cola = limpio.slice(ultimo + 1);

  // Grupo final de 3 dígitos y más de un separador => todos son de miles.
  if (cola.length === 3) return Number(limpio.replace(/[.,]/g, ''));
  // Si no, el último separador es decimal.
  const entero = limpio.slice(0, ultimo).replace(/[.,]/g, '');
  return Number(`${entero || '0'}.${cola}`);
}

/** Palabras sueltas a número: ['cuarenta','y','cinco','mil'] -> 45000 */
function palabrasANumero(palabras: string[]): number | null {
  let total = 0;
  let parcial = 0;
  let vioAlgo = false;

  for (const p of palabras) {
    if (p === 'y') continue;
    if (p === 'medio' || p === 'media') {
      // "dos millones y medio": medio aplica a la última escala usada.
      continue;
    }
    if (p in UNIDADES) {
      parcial += UNIDADES[p]!;
      vioAlgo = true;
    } else if (p in CIENTOS) {
      parcial += CIENTOS[p]!;
      vioAlgo = true;
    } else if (p in ESCALAS) {
      const escala = ESCALAS[p]!;
      // "mil" solo, sin nada antes, vale 1000.
      total += (parcial === 0 ? 1 : parcial) * escala;
      parcial = 0;
      vioAlgo = true;
    } else {
      return null;
    }
  }
  if (!vioAlgo) return null;
  return total + parcial;
}

export interface MontoEncontrado {
  valor: number;
  /** El trozo de texto que lo produjo, para poder sacarlo del concepto. */
  texto: string;
}

/**
 * Busca el primer monto del texto. Devuelve null si no hay ninguno.
 */
export function buscarMonto(textoOriginal: string): MontoEncontrado | null {
  const texto = normalizarTexto(textoOriginal);

  // 1. Dígitos, con escala opcional: "45.000", "$45.000", "45 mil", "1.2 millones", "45k"
  // Las alternativas van de la MAS LARGA a la mas corta a proposito: la
  // alternancia de regex es ordenada, asi que 'mil' antes que 'millones'
  // hacia que '2 millones' matcheara 'mil' y diera 2.000.
  const conDigitos = /\$?\s*(\d[\d.,]*)\s*(millon(?:es)?|milesimo|mil(?:es)?|luca(?:s)?|palo(?:s)?|k)?(\s+y\s+medio)?/i;
  const m = conDigitos.exec(texto);
  if (m) {
    const base = digitosANumero(m[1]!);
    if (base !== null) {
      let valor = base;
      const escala = m[2];
      if (escala === 'k') valor = base * 1_000;
      else if (escala) valor = base * (ESCALAS[escala] ?? 1);
      if (m[3]) valor += (escala ? (ESCALAS[escala] ?? (escala === 'k' ? 1000 : 1)) : 1) / 2;
      return { valor: Math.round(valor), texto: m[0]!.trim() };
    }
  }

  // 2. Todo en palabras: "cuarenta y cinco mil", "dos millones y medio"
  const tokens = texto.split(/\s+/);
  for (let inicio = 0; inicio < tokens.length; inicio++) {
    // Ventana acotada: una cifra hablada en español nunca pasa de unas
    // ocho palabras ("doscientos cuarenta y cinco mil quinientos"). Sin
    // cota esto era O(n^3) sobre el texto completo, y 2000 caracteres de
    // palabras numericas tardaban ~380 ms por llamada — que se multiplica
    // por cada entrada de la bandeja, en cada render.
    for (let fin = Math.min(tokens.length, inicio + 8); fin > inicio; fin--) {
      const trozo = tokens.slice(inicio, fin);
      // Al menos una escala o un número; evita capturar "y" sueltas.
      if (!trozo.some((p) => p in UNIDADES || p in CIENTOS || p in ESCALAS)) continue;
      const valor = palabrasANumero(trozo);
      if (valor !== null && valor > 0) {
        const mitad = trozo.includes('medio') || trozo.includes('media');
        const escalaUsada = trozo.find((p) => p in ESCALAS);
        const extra = mitad && escalaUsada ? (ESCALAS[escalaUsada]! / 2) : 0;
        return { valor: Math.round(valor + extra), texto: trozo.join(' ') };
      }
    }
  }

  return null;
}
