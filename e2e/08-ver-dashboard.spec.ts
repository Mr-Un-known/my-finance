import { test, expect } from './fixtures';

test('ver el dashboard con datos de ejemplo', async ({ page }) => {
  await page.goto('');
  await expect(page.getByText('Todavía no hay movimientos')).toBeVisible();

  await page.getByRole('button', { name: 'Cargar datos de ejemplo' }).click();

  await expect(page.getByText('Sobrante del mes')).toBeVisible();
  await expect(page.getByText('Próximos movimientos')).toBeVisible();
});
