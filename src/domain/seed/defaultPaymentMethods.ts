/**
 * Metodos de pago iniciales (Fase 0, seccion 8). Por defecto solo dos,
 * como pediste: Debito (default) y Tarjeta de credito, con corte/pago
 * configurables desde el dia 1 aunque el valor inicial sea 15/2.
 */
import type { PaymentMethod } from '../types';

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-debito', type: 'debit', name: 'Débito', isDefault: true, updatedAt: '' },
  {
    id: 'pm-tc', type: 'credit', name: 'Tarjeta de crédito', isDefault: false,
    cutoffDay: 15, paymentDay: 2, updatedAt: '',
  },
];
