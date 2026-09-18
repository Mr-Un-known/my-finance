import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/data/db.dart';
import 'package:my_finance/data/local_repository.dart';
import 'package:my_finance/data/seed.dart';
import 'package:my_finance/data/tombstones.dart';
import 'package:my_finance/domain/types.dart';
// Mismo choque de nombres que en local_repository.dart: el Transaction de
// sqflite es el de la base, el nuestro es el movimiento de plata.
import 'package:sqflite_common_ffi/sqflite_ffi.dart' hide Transaction;

Transaction tx(String id, {int amount = 1000, String date = '2026-09-12'}) => Transaction(
      id: id,
      type: TransactionType.expense,
      concept: 'Gasto $id',
      amount: amount,
      date: date,
      status: TransactionStatus.pending,
      createdAt: '2026-09-12T00:00:00Z',
      updatedAt: '2026-09-12T00:00:00Z',
    );

void main() {
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  late LocalRepository repo;

  setUp(() async {
    final db = await databaseFactory.openDatabase(
      inMemoryDatabasePath,
      options: OpenDatabaseOptions(version: dbVersion, onCreate: crearEsquema),
    );
    repo = LocalRepository(db);
  });

  tearDown(() => repo.db.close());

  group('settings', () {
    test('sin fila devuelve los valores por defecto', () async {
      final s = await repo.getSettings();
      expect(s.currency, 'COP');
      expect(s.quincenaStartDays, [10, 25]);
      expect(s.onboardedAt, isNull);
    });

    test('guarda y relee, incluidos los días de quincena', () async {
      await repo.saveSettings(const Settings(
        displayName: 'Andrés',
        currency: 'USD',
        locale: 'en-US',
        quincenaStartDays: [5, 20],
        onboardedAt: '2026-09-18T00:00:00Z',
      ));
      final s = await repo.getSettings();
      expect(s.displayName, 'Andrés');
      expect(s.currency, 'USD');
      expect(s.quincenaStartDays, [5, 20]);
      expect(s.onboardedAt, '2026-09-18T00:00:00Z');
    });
  });

  group('transacciones', () {
    test('guarda, lista y filtra por rango de fechas', () async {
      await repo.saveTransactions([
        tx('a', date: '2026-08-31'),
        tx('b', date: '2026-09-15'),
        tx('c', date: '2026-10-01'),
      ]);
      expect((await repo.listTransactions()).length, 3);
      final sept = await repo.listTransactions(from: '2026-09-01', to: '2026-09-30');
      expect(sept.map((t) => t.id), ['b']);
    });

    test('guardar dos veces el mismo id actualiza, no duplica', () async {
      await repo.saveTransaction(tx('a', amount: 1000));
      await repo.saveTransaction(tx('a', amount: 2000));
      final todas = await repo.listTransactions();
      expect(todas.length, 1);
      expect(todas.first.amount, 2000);
    });

    test('el round-trip conserva los campos de tarjeta y recurrencia', () async {
      await repo.saveTransaction(Transaction(
        id: 'tc', type: TransactionType.expense, concept: 'Zapatos', amount: 210000,
        date: '2026-09-16', status: TransactionStatus.pending, categoryId: 'cat-compras',
        paymentMethodId: 'pm-tc', cycleCutoffDate: '2026-10-15', cyclePaymentDate: '2026-11-02',
        recurringRuleId: 'r1', periodKey: '2026-09',
        createdAt: 'a', updatedAt: 'b',
      ));
      final leida = (await repo.listTransactions()).single;
      expect(leida.cyclePaymentDate, '2026-11-02');
      expect(leida.periodKey, '2026-09');
      expect(leida.relevantDate, '2026-11-02');
    });
  });

  group('lápidas', () {
    test('borrar deja lápida', () async {
      await repo.saveTransaction(tx('a'));
      await repo.deleteTransaction('a');

      expect(await repo.listTransactions(), isEmpty);
      final lapidas = await repo.listTombstones();
      expect(lapidas.length, 1);
      expect(lapidas.single.entity, DeletableEntity.transactions);
      expect(lapidas.single.entityId, 'a');
      expect(lapidas.single.id, 'transactions:a');
    });

    test('cada entidad deja su propia lápida', () async {
      await repo.saveCategory(const Category(
        id: 'c1', name: 'X', icon: '🏠', color: '#000', kind: CategoryKind.both));
      await repo.deleteCategory('c1');
      await repo.saveRecurringRule(const RecurringRule(
        id: 'r1', name: 'Arriendo', type: TransactionType.expense, amount: 1,
        frequency: Frequency.monthly, startDate: '2026-01-01'));
      await repo.deleteRecurringRule('r1');

      final ids = (await repo.listTombstones()).map((t) => t.id).toSet();
      expect(ids, {'categories:c1', 'recurringRules:r1'});
    });

    test('borrar dos veces no duplica la lápida', () async {
      await repo.saveTransaction(tx('a'));
      await repo.deleteTransaction('a');
      await repo.deleteTransaction('a');
      expect((await repo.listTombstones()).length, 1);
    });
  });

  group('ensureSeedData', () {
    test('siembra categorías y métodos la primera vez', () async {
      await ensureSeedData(repo);
      expect((await repo.listCategories()).length, categoriasPorDefecto.length);
      expect((await repo.listPaymentMethods()).length, 2);
    });

    test('no pisa lo que ya existe al volver a correr', () async {
      await ensureSeedData(repo);
      await repo.deleteCategory('cat-viajes');
      await ensureSeedData(repo);
      final ids = (await repo.listCategories()).map((c) => c.id);
      expect(ids, isNot(contains('cat-viajes')));
    });

    test('a quien ya tiene movimientos no le pide configuración inicial', () async {
      await repo.saveTransaction(tx('a'));
      await ensureSeedData(repo);
      expect((await repo.getSettings()).onboardedAt, isNotNull);
    });

    test('a quien arranca de cero sí se la pide', () async {
      await ensureSeedData(repo);
      expect((await repo.getSettings()).onboardedAt, isNull);
    });
  });
}
