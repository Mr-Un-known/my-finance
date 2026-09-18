import { test as base, expect, type Page } from '@playwright/test';

/**
 * Cada test de Playwright ya corre en su propio contexto de navegador
 * aislado (storage/IndexedDB separados), asi que no hace falta limpiar
 * la base de datos a mano entre tests — cada uno arranca de cero.
 *
 * Pero "de cero" ahora incluye la configuracion inicial, que aparece la
 * primera vez. El fixture la completa con valores por defecto para que
 * cada test siga empezando en la pantalla que le importa. El flujo en si
 * se prueba aparte, en 10-configuracion-inicial.spec.ts.
 */
export async function completarOnboarding(page: Page): Promise<void> {
  // waitFor, no isVisible(): isVisible() pregunta en ese instante, y en
  // WebKit la app tarda mas en montar que lo que tarda goto() en resolver,
  // asi que daba false y el fixture se saltaba la configuracion entera.
  const nombre = page.getByLabel('Tu nombre');
  await nombre.waitFor({ state: 'visible', timeout: 15_000 });

  await nombre.fill('Tester');
  await page.getByRole('button', { name: 'Siguiente' }).click(); // moneda
  await page.getByRole('button', { name: 'Siguiente' }).click(); // quincenas
  await page.getByRole('button', { name: 'Siguiente' }).click(); // categorias
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(nombre).toBeHidden();
}

export const test = base.extend<object>({
  page: async ({ page }, use) => {
    const gotoOriginal = page.goto.bind(page);
    let primeraNavegacion = true;
    page.goto = async (url, opciones) => {
      const respuesta = await gotoOriginal(url, opciones);
      if (primeraNavegacion) {
        primeraNavegacion = false;
        await completarOnboarding(page);
      }
      return respuesta;
    };
    await use(page);
  },
});

export { expect };
