/**
 * Categorias iniciales (Fase 0, seccion 6). Configurables despues: esto
 * es solo el punto de partida la primera vez que se abre la app.
 */
import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-hogar', name: 'Hogar', icon: '🏠', color: '#5B6FE0', kind: 'both', isArchived: false, sortOrder: 0 },
  { id: 'cat-alimentacion', name: 'Alimentación', icon: '🍽️', color: '#E0A23B', kind: 'expense', isArchived: false, sortOrder: 1 },
  { id: 'cat-transporte', name: 'Transporte', icon: '🚗', color: '#3BA3E0', kind: 'expense', isArchived: false, sortOrder: 2 },
  { id: 'cat-entretenimiento', name: 'Entretenimiento', icon: '🎬', color: '#C15BD1', kind: 'expense', isArchived: false, sortOrder: 3 },
  { id: 'cat-viajes', name: 'Viajes', icon: '✈️', color: '#3BC1A3', kind: 'expense', isArchived: false, sortOrder: 4 },
  { id: 'cat-salud', name: 'Salud', icon: '💊', color: '#E05B5B', kind: 'expense', isArchived: false, sortOrder: 5 },
  { id: 'cat-suscripciones', name: 'Suscripciones', icon: '🔁', color: '#8A5CF6', kind: 'expense', isArchived: false, sortOrder: 6 },
  { id: 'cat-compras', name: 'Compras', icon: '🛍️', color: '#D18A5B', kind: 'expense', isArchived: false, sortOrder: 7 },
  { id: 'cat-educacion', name: 'Educación', icon: '🎓', color: '#5B8AD1', kind: 'expense', isArchived: false, sortOrder: 8 },
  { id: 'cat-servicios', name: 'Servicios', icon: '💡', color: '#B0721A', kind: 'expense', isArchived: false, sortOrder: 9 },
  { id: 'cat-deudas', name: 'Deudas', icon: '💳', color: '#B3261E', kind: 'expense', isArchived: false, sortOrder: 10 },
  { id: 'cat-ahorro', name: 'Ahorro', icon: '🐷', color: '#1E8E6A', kind: 'both', isArchived: false, sortOrder: 11 },
  { id: 'cat-otros', name: 'Otros', icon: '✳️', color: '#6C727F', kind: 'both', isArchived: false, sortOrder: 12 },
];
