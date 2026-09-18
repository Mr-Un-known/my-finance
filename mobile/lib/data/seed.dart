/// Categorías y métodos de pago iniciales. Mismos ids que la app web
/// ('cat-hogar', 'pm-debito'): son la misma cuenta y tienen que coincidir
/// fila por fila cuando sincronicen.
library;

import '../domain/types.dart';
import 'local_repository.dart';

const List<Category> categoriasPorDefecto = [
  Category(id: 'cat-hogar', name: 'Hogar', icon: '🏠', color: '#5B6FE0', kind: CategoryKind.both),
  Category(id: 'cat-alimentacion', name: 'Alimentación', icon: '🍽️', color: '#E0A23B', kind: CategoryKind.expense, sortOrder: 1),
  Category(id: 'cat-transporte', name: 'Transporte', icon: '🚗', color: '#3BA3E0', kind: CategoryKind.expense, sortOrder: 2),
  Category(id: 'cat-entretenimiento', name: 'Entretenimiento', icon: '🎬', color: '#C15BD1', kind: CategoryKind.expense, sortOrder: 3),
  Category(id: 'cat-viajes', name: 'Viajes', icon: '✈️', color: '#3BC1A3', kind: CategoryKind.expense, sortOrder: 4),
  Category(id: 'cat-salud', name: 'Salud', icon: '💊', color: '#E05B5B', kind: CategoryKind.expense, sortOrder: 5),
  Category(id: 'cat-suscripciones', name: 'Suscripciones', icon: '🔁', color: '#8A5CF6', kind: CategoryKind.expense, sortOrder: 6),
  Category(id: 'cat-compras', name: 'Compras', icon: '🛍️', color: '#D18A5B', kind: CategoryKind.expense, sortOrder: 7),
  Category(id: 'cat-educacion', name: 'Educación', icon: '🎓', color: '#5B8AD1', kind: CategoryKind.expense, sortOrder: 8),
  Category(id: 'cat-servicios', name: 'Servicios', icon: '💡', color: '#B0721A', kind: CategoryKind.expense, sortOrder: 9),
  Category(id: 'cat-deudas', name: 'Deudas', icon: '💳', color: '#B3261E', kind: CategoryKind.expense, sortOrder: 10),
  Category(id: 'cat-ahorro', name: 'Ahorro', icon: '🐷', color: '#1E8E6A', kind: CategoryKind.both, sortOrder: 11),
  Category(id: 'cat-otros', name: 'Otros', icon: '✳️', color: '#6C727F', kind: CategoryKind.both, sortOrder: 12),
];

const List<PaymentMethod> metodosPorDefecto = [
  PaymentMethod(id: 'pm-debito', type: PaymentMethodType.debit, name: 'Débito', isDefault: true),
  PaymentMethod(
    id: 'pm-tc',
    type: PaymentMethodType.credit,
    name: 'Tarjeta de crédito',
    cutoffDay: 15,
    paymentDay: 2,
  ),
];

/// Corre al abrir la app. No pisa nada si ya existe: es seguro llamarla en
/// cada arranque.
Future<void> ensureSeedData(LocalRepository repo) async {
  if ((await repo.listCategories()).isEmpty) {
    for (final c in categoriasPorDefecto) {
      await repo.saveCategory(c);
    }
  }
  if ((await repo.listPaymentMethods()).isEmpty) {
    for (final m in metodosPorDefecto) {
      await repo.savePaymentMethod(m);
    }
  }

  final s = await repo.getSettings();
  if (s.onboardedAt == null) {
    // Quien ya tiene movimientos no está en su primera vez: puede venir de
    // sincronizar una cuenta existente. No se le pregunta la configuración
    // inicial encima de sus datos.
    final hayMovimientos = (await repo.listTransactions()).isNotEmpty;
    await repo.saveSettings(
      hayMovimientos ? s.copyWith(onboardedAt: DateTime.now().toUtc().toIso8601String()) : s,
    );
  }
}
