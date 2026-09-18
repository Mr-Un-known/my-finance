import { db } from '../db';
import { DEFAULT_CATEGORIES } from '@/domain/seed/defaultCategories';
import { DEFAULT_PAYMENT_METHODS } from '@/domain/seed/defaultPaymentMethods';
import { DEFAULT_SETTINGS } from './localRepository';

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
