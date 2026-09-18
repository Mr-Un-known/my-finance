import { test as base, expect } from '@playwright/test';

/**
 * Usa el test crudo de Playwright, no el fixture: lo que se prueba aqui es
 * justamente la pantalla que el fixture se salta.
 */
base('la configuración inicial pregunta nombre, moneda, quincenas y categorías', async ({ page }) => {
  await page.goto('');

  // 1. Nombre — no deja seguir vacío.
  await expect(page.getByText('¿Cómo quieres que te llamemos?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  await page.getByLabel('Tu nombre').fill('Andrés');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // 2. Moneda.
  await expect(page.getByText('¿En qué moneda manejas tu plata?')).toBeVisible();
  await page.getByRole('button', { name: /Dólar/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // 3. Quincenas.
  await expect(page.getByText('¿Qué días te pagan?')).toBeVisible();
  await page.getByLabel('Primer pago').fill('5');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // 4. Categorías — quitar una y terminar.
  await expect(page.getByText('¿Cuáles categorías usas?')).toBeVisible();
  await page.getByRole('button', { name: /Viajes/ }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();

  // Entró a la app, saluda por el nombre y ya usa la moneda elegida.
  await expect(page.getByRole('heading', { name: 'Hola, Andrés' })).toBeVisible();
  await page.getByRole('button', { name: 'Cargar datos de ejemplo' }).click();
  await expect(page.getByText('Te queda este mes')).toBeVisible();
  await expect(page.getByText('$2,', { exact: false }).first()).toBeVisible();

  // La quincena elegida manda, y la categoría quitada no aparece.
  await expect(page.getByText('Quincena del 5')).toBeVisible();
  await page.goto('movimientos?nuevo=1');
  await expect(page.getByRole('button', { name: /Viajes/ })).toBeHidden();
});

base('no vuelve a preguntar después de configurada', async ({ page }) => {
  await page.goto('');
  await page.getByLabel('Tu nombre').fill('Andrés');
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Andrés' })).toBeVisible();

  await page.reload();
  await expect(page.getByText('¿Cómo quieres que te llamemos?')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Hola, Andrés' })).toBeVisible();
});
