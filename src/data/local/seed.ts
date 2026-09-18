import { db } from '../db';
import { DEFAULT_CATEGORIES } from '@/domain/seed/defaultCategories';
import { DEFAULT_PAYMENT_METHODS } from '@/domain/seed/defaultPaymentMethods';
import { DEFAULT_SETTINGS } from './localRepository';

/**
 * Colores viejos de las categorias sembradas, antes del sistema generado.
 * Se usan para reconocer una categoria que el usuario NO personalizo: si
 * su color sigue siendo el viejo por defecto, se actualiza al nuevo; si lo
 * cambio a mano, se respeta. Sin esto, el sistema de color nuevo solo lo
 * verian las instalaciones nuevas.
 */
const COLORES_VIEJOS: Record<string, string> = {
  'cat-hogar': '#5B6FE0', 'cat-alimentacion': '#E0A23B', 'cat-transporte': '#3BA3E0',
  'cat-entretenimiento': '#C15BD1', 'cat-viajes': '#3BC1A3', 'cat-salud': '#E05B5B',
  'cat-suscripciones': '#8A5CF6', 'cat-compras': '#D18A5B', 'cat-educacion': '#5B8AD1',
  'cat-servicios': '#B0721A', 'cat-deudas': '#B3261E', 'cat-ahorro': '#1E8E6A',
};

async function migrarColoresDeCategoria(): Promise<void> {
  const nuevos = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c.color]));
  const actuales = await db.categories.toArray();
  const aActualizar = actuales.filter(
    (c) => COLORES_VIEJOS[c.id] !== undefined
      && c.color.toUpperCase() === COLORES_VIEJOS[c.id]!.toUpperCase()
      && nuevos.get(c.id) !== undefined,
  );
  if (aActualizar.length === 0) return;
  await db.categories.bulkPut(aActualizar.map((c) => ({ ...c, color: nuevos.get(c.id)! })));
}

/**
 * Corre una vez al abrir la app. No pisa nada si ya existe: es seguro
 * llamarla en cada arranque.
 */
export async function ensureSeedData(): Promise<void> {
  const [categoryCount, paymentMethodCount, settings, txCount] = await Promise.all([
    db.categories.count(),
    db.paymentMethods.count(),
    db.settings.get('singleton'),
    db.transactions.count(),
  ]);

  if (categoryCount === 0) await db.categories.bulkPut(DEFAULT_CATEGORIES);
  else await migrarColoresDeCategoria();
  if (paymentMethodCount === 0) await db.paymentMethods.bulkPut(DEFAULT_PAYMENT_METHODS);

  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS);
    return;
  }

  // Quien ya venia usando la app no tiene `onboardedAt` (el campo no
  // existia). Si ya hay movimientos, claramente no es su primera vez: se
  // marca como configurado para no lanzarle el cuestionario inicial encima
  // de sus datos.
  if (settings.onboardedAt === undefined || settings.onboardedAt === null) {
    if (txCount > 0) {
      await db.settings.put({ ...settings, onboardedAt: new Date().toISOString() });
    }
  }
}
