import { describe, expect, it } from 'vitest';
import { categoryColor, COLOR_SIN_CATEGORIA } from './categoryColor';
import { DEFAULT_CATEGORIES } from './defaultCategories';

describe('categoryColor', () => {
  it('las categorías sembradas se pintan con su token, para que el modo oscuro funcione', () => {
    expect(categoryColor({ id: 'cat-hogar', color: '#C24976' })).toBe('var(--cat-hogar)');
    expect(categoryColor({ id: 'cat-ahorro', color: '#B54D98' })).toBe('var(--cat-ahorro)');
  });

  it('todas las sembradas tienen token, salvo "Otros"', () => {
    for (const c of DEFAULT_CATEGORIES) {
      // 'Otros' es gris neutro a propósito: no es un tema, es el cajón de
      // lo que no encaja, y no debe competir por atención en un gráfico.
      if (c.id === 'cat-otros') {
        expect(categoryColor(c)).toBe(c.color);
        continue;
      }
      expect(categoryColor(c), c.id).toBe(`var(--${c.id})`);
    }
  });

  it('una categoría creada por el usuario usa su propio color', () => {
    expect(categoryColor({ id: 'abc-123', color: '#FF00FF' })).toBe('#FF00FF');
  });

  it('sin categoría no inventa un color', () => {
    expect(categoryColor(null)).toBe(COLOR_SIN_CATEGORIA);
    expect(categoryColor(undefined)).toBe(COLOR_SIN_CATEGORIA);
  });
});

describe('paleta de categorías', () => {
  it('ninguna repite color con otra', () => {
    const colores = DEFAULT_CATEGORIES.map((c) => c.color.toUpperCase());
    expect(new Set(colores).size).toBe(colores.length);
  });

  it('ninguna usa los colores reservados de quincena o de estado', () => {
    // Antes Salud era rojo (#E05B5B) y Ahorro verde (#1E8E6A): una
    // categoría se leía como un estado.
    const reservados = ['#007AFF', '#FF9500', '#34C759', '#FF3B30'];
    for (const c of DEFAULT_CATEGORIES) {
      expect(reservados).not.toContain(c.color.toUpperCase());
    }
  });

  it('todas tienen contraste >= 3:1 contra blanco (WCAG 1.4.11)', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
    };
    for (const c of DEFAULT_CATEGORIES) {
      if (c.id === 'cat-otros') continue; // gris neutro a propósito
      const ratio = (1.05) / (lum(c.color) + 0.05);
      expect(ratio, `${c.id} ${c.color}`).toBeGreaterThanOrEqual(3);
    }
  });
});
