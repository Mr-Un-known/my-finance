/**
 * Previsualiza la app en un iPhone simulado (Playwright + WebKit) sin
 * necesitar Xcode: mismo motor que Safari iOS, viewport y user-agent de
 * iPhone, safe-area incluida.
 *
 *   npm run preview:iphone            -> abre la ventana y te la deja para tocar
 *   npm run preview:iphone -- --shots -> solo capturas en preview-shots/
 *
 * Necesita el dev server corriendo (npm run dev -- --port 5199).
 */
import { webkit, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:5199/my-finance/';
const SHOTS_ONLY = process.argv.includes('--shots');
const OUT = 'preview-shots';

const PAGES = [
  ['inicio', ''],
  ['movimientos', 'movimientos'],
  ['analisis', 'analisis'],
  ['calendario', 'calendario'],
  ['ajustes', 'ajustes'],
];

const browser = await webkit.launch({ headless: SHOTS_ONLY });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });

// Si la base está vacía, cargar los datos de ejemplo para que se vea algo.
const demo = page.getByRole('button', { name: /datos de ejemplo/i });
if (await demo.count()) {
  await demo.first().click();
  await page.waitForTimeout(1500);
}

if (SHOTS_ONLY) {
  mkdirSync(OUT, { recursive: true });
  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  }

  // Chequeo del tab bar: tiene que tocar el borde inferior del viewport.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const nav = await page.locator('nav[aria-label="Navegación principal"]').boundingBox();
  const vp = page.viewportSize();
  const gap = Math.round(vp.height - (nav.y + nav.height));
  console.log(`tab bar: alto ${Math.round(nav.height)}px, hueco debajo ${gap}px (debe ser 0)`);
  console.log('errores de consola:', errors.length ? errors : 'ninguno');
  console.log(`capturas en ${OUT}/`);
  await browser.close();
} else {
  console.log('iPhone 14 Pro abierto. Cerrá la ventana para terminar.');
  await page.waitForEvent('close', { timeout: 0 });
  await browser.close();
}
