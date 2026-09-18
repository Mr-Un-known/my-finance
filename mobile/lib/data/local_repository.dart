/// Acceso a la base local. Única puerta de entrada a SQLite: si algo
/// escribe por fuera de acá, se salta las lápidas y rompe la sincronización.
library;

// sqflite tambien exporta un 'Transaction' (el de la base). El nuestro es
// el movimiento de plata; se esconde el otro para que no haya ambigüedad.
import 'package:sqflite/sqflite.dart' hide Transaction;

import '../domain/types.dart';
import 'tombstones.dart';

const Settings settingsPorDefecto = Settings();

class LocalRepository {
  LocalRepository(this.db);

  final Database db;

  // ── settings ──────────────────────────────────────────────────────
  Future<Settings> getSettings() async {
    final filas = await db.query('settings', where: 'id = ?', whereArgs: ['singleton']);
    if (filas.isEmpty) return settingsPorDefecto;
    final f = filas.first;
    return Settings(
      displayName: f['displayName'] as String? ?? '',
      currency: f['currency'] as String? ?? 'COP',
      locale: f['locale'] as String? ?? 'es-CO',
      quincenaStartDays: _parseDias(f['quincenaStartDays'] as String?),
      defaultPaymentMethodId: f['defaultPaymentMethodId'] as String?,
      reminderDefaultDaysBefore: f['reminderDefaultDaysBefore'] as int? ?? 1,
      theme: f['theme'] as String? ?? 'system',
      onboardedAt: f['onboardedAt'] as String?,
    );
  }

  Future<void> saveSettings(Settings s) => db.insert(
        'settings',
        {
          'id': 'singleton',
          'displayName': s.displayName,
          'currency': s.currency,
          'locale': s.locale,
          'quincenaStartDays': s.quincenaStartDays.join(','),
          'defaultPaymentMethodId': s.defaultPaymentMethodId,
          'reminderDefaultDaysBefore': s.reminderDefaultDaysBefore,
          'theme': s.theme,
          'onboardedAt': s.onboardedAt,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

  static List<int> _parseDias(String? raw) {
    if (raw == null || raw.isEmpty) return const [10, 25];
    final partes = raw.split(',').map((x) => int.tryParse(x.trim())).whereType<int>().toList();
    return partes.length == 2 ? partes : const [10, 25];
  }

  // ── categorías ────────────────────────────────────────────────────
  Future<List<Category>> listCategories() async {
    final filas = await db.query('categories', orderBy: 'sortOrder');
    return filas.map(Category.fromJson).toList();
  }

  Future<void> saveCategory(Category c) =>
      db.insert('categories', c.toJson(), conflictAlgorithm: ConflictAlgorithm.replace);

  Future<void> deleteCategory(Id id) =>
      _borrarConLapida('categories', id, DeletableEntity.categories);

  // ── métodos de pago ───────────────────────────────────────────────
  Future<List<PaymentMethod>> listPaymentMethods() async {
    final filas = await db.query('payment_methods');
    return filas.map(PaymentMethod.fromJson).toList();
  }

  Future<void> savePaymentMethod(PaymentMethod m) =>
      db.insert('payment_methods', m.toJson(), conflictAlgorithm: ConflictAlgorithm.replace);

  Future<void> deletePaymentMethod(Id id) =>
      _borrarConLapida('payment_methods', id, DeletableEntity.paymentMethods);

  // ── transacciones ─────────────────────────────────────────────────
  Future<List<Transaction>> listTransactions({String? from, String? to}) async {
    final filas = (from != null && to != null)
        ? await db.query('transactions', where: 'date BETWEEN ? AND ?', whereArgs: [from, to])
        : await db.query('transactions');
    return filas.map(Transaction.fromJson).toList();
  }

  Future<void> saveTransaction(Transaction tx) =>
      db.insert('transactions', tx.toJson(), conflictAlgorithm: ConflictAlgorithm.replace);

  Future<void> saveTransactions(List<Transaction> txs) async {
    if (txs.isEmpty) return;
    final batch = db.batch();
    for (final tx in txs) {
      batch.insert('transactions', tx.toJson(), conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<void> deleteTransaction(Id id) =>
      _borrarConLapida('transactions', id, DeletableEntity.transactions);

  // ── reglas recurrentes ────────────────────────────────────────────
  Future<List<RecurringRule>> listRecurringRules() async {
    final filas = await db.query('recurring_rules');
    return filas.map(RecurringRule.fromJson).toList();
  }

  Future<void> saveRecurringRule(RecurringRule r) =>
      db.insert('recurring_rules', r.toJson(), conflictAlgorithm: ConflictAlgorithm.replace);

  Future<void> deleteRecurringRule(Id id) =>
      _borrarConLapida('recurring_rules', id, DeletableEntity.recurringRules);

  // ── lápidas ───────────────────────────────────────────────────────
  Future<List<Tombstone>> listTombstones() async {
    final filas = await db.query('deletions');
    return filas.map(Tombstone.fromJson).toList();
  }

  Future<void> saveTombstones(List<Tombstone> ts) async {
    if (ts.isEmpty) return;
    final batch = db.batch();
    for (final t in ts) {
      batch.insert('deletions', t.toJson(), conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  /// Todo borrado deja lápida, en la misma transacción que el borrado: si
  /// el proceso muere en el medio, o se borró y quedó registrado, o no pasó
  /// ninguna de las dos cosas.
  Future<void> _borrarConLapida(String tabla, Id id, DeletableEntity entidad) =>
      db.transaction((txn) async {
        await txn.delete(tabla, where: 'id = ?', whereArgs: [id]);
        await txn.insert(
          'deletions',
          Tombstone(
            entity: entidad,
            entityId: id,
            deletedAt: DateTime.now().toUtc().toIso8601String(),
          ).toJson(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      });
}
