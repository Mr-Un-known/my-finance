/**
 * Inferencia autónoma de categoría + método de pago desde el concepto de
 * una transacción. Aprende del historial: cada `saveTransaction`
 * actualiza el índice, y cada apertura del form lo consulta.
 *
 * Match exacto normalizado (case + acentos + puntuación insensitive) →
 *   confidence 'exact'. Match por prefijo con mínimo 3 chars →
 *   'prefix'. Sin match → 'fallback' (usa el default provisto).
 */

export interface ConceptIndexEntry {
  id: string;            // conceptKey (normalizado)
  displayName: string;   // último casing usado por el usuario
  categoryId: string | null;
  paymentMethodId: string | null;
  count: number;
  lastUsedAt: string;    // ISO
}

export interface InferenceResult {
  categoryId: string | null;
  paymentMethodId: string | null;
  confidence: 'exact' | 'prefix' | 'fallback';
  source: ConceptIndexEntry | null;
}

/** Normaliza un concepto para matching: minúsculas, sin tildes, sin
 *  puntuación, espacios colapsados. "Café Con Leche!" → "cafe con leche". */
export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

export function inferFromConcept(
  text: string,
  index: ConceptIndexEntry[],
  fallback: { categoryId: string | null; paymentMethodId: string | null },
): InferenceResult {
  const key = normalize(text);
  if (!key) return { ...fallback, confidence: 'fallback', source: null };

  const exact = index.find((e) => e.id === key);
  if (exact) {
    return {
      categoryId: exact.categoryId,
      paymentMethodId: exact.paymentMethodId,
      confidence: 'exact',
      source: exact,
    };
  }

  if (key.length >= 3) {
    const prefix = index
      .filter((e) => e.id.startsWith(key))
      .sort((a, b) => b.count - a.count || b.lastUsedAt.localeCompare(a.lastUsedAt))[0];
    if (prefix) {
      return {
        categoryId: prefix.categoryId,
        paymentMethodId: prefix.paymentMethodId,
        confidence: 'prefix',
        source: prefix,
      };
    }
  }

  return { ...fallback, confidence: 'fallback', source: null };
}

/** Top-N conceptos más recientes (para chips de "sugerencias"). */
export function topRecents(index: ConceptIndexEntry[], n = 5): ConceptIndexEntry[] {
  return [...index]
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, n);
}
