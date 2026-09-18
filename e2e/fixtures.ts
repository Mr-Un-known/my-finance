import { test as base, expect } from '@playwright/test';

/**
 * Cada test de Playwright ya corre en su propio contexto de navegador
 * aislado (storage/IndexedDB separados), asi que no hace falta limpiar
 * la base de datos a mano entre tests — cada uno arranca de cero.
 */
export const test = base;
export { expect };
