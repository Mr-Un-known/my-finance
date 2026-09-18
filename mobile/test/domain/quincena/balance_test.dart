import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/quincena/balance.dart';
import 'package:my_finance/domain/types.dart';

Transaction tx({
  TransactionType type = TransactionType.expense,
  int amount = 0,
  TransactionStatus status = TransactionStatus.paid,
  String date = '2026-09-12',
  String? quincenaKey,
  String id = 'x',
}) =>
    Transaction(
      id: id,
      type: type,
      concept: 'x',
      amount: amount,
      date: date,
      status: status,
      quincenaKey: quincenaKey,
      createdAt: '',
      updatedAt: '',
    );

void main() {
  group('calculateQuincenaBalance', () {
    test('restante = ingresos - gastos de esa quincena', () {
      final r = withResolvedQuincena([
        tx(type: TransactionType.income, amount: 2800000, date: '2026-09-10'),
        tx(amount: 800000, date: '2026-09-12'),
        tx(amount: 500000, date: '2026-09-26'), // otra quincena
      ]);
      final b = calculateQuincenaBalance(r, '2026-09-Q1');
      expect(b.income, 2800000);
      expect(b.expense, 800000);
      expect(b.restante, 2000000);
    });

    test('no filtra por pagado: el check es seguimiento, no matemática', () {
      final r = withResolvedQuincena([
        tx(amount: 100000, status: TransactionStatus.paid, date: '2026-09-12'),
        tx(amount: 200000, status: TransactionStatus.pending, date: '2026-09-12'),
        tx(amount: 300000, status: TransactionStatus.scheduled, date: '2026-09-12'),
      ]);
      expect(calculateQuincenaBalance(r, '2026-09-Q1').expense, 600000);
    });

    test('excluye cancelados: nunca debieron contar', () {
      final r = withResolvedQuincena([
        tx(amount: 999999, status: TransactionStatus.cancelled, date: '2026-09-12'),
      ]);
      expect(calculateQuincenaBalance(r, '2026-09-Q1').expense, 0);
    });

    test('una quincena fijada a mano manda sobre la fecha', () {
      final r = withResolvedQuincena([
        tx(amount: 50000, date: '2026-09-12', quincenaKey: '2026-09-Q2'),
      ]);
      expect(calculateQuincenaBalance(r, '2026-09-Q1').expense, 0);
      expect(calculateQuincenaBalance(r, '2026-09-Q2').expense, 50000);
    });
  });

  group('calculateMonthBalance', () {
    test('sobrante del mes = suma de los dos restantes', () {
      final r = withResolvedQuincena([
        tx(type: TransactionType.income, amount: 1500000, date: '2026-09-10'),
        tx(amount: 285000, date: '2026-09-12'),
        tx(type: TransactionType.income, amount: 1300000, date: '2026-09-25'),
        tx(amount: 132994, date: '2026-09-27'),
      ]);
      final m = calculateMonthBalance(r, 2026, 9);
      expect(m.quincenas[0].restante, 1215000);
      expect(m.quincenas[1].restante, 1167006);
      expect(m.sobrante, 2382006);
      expect(m.income, 2800000);
      expect(m.expense, 417994);
    });

    test('el arriendo del 1 de octubre cae en la quincena del 25 de septiembre', () {
      final r = withResolvedQuincena([tx(amount: 1800000, date: '2026-10-01')]);
      expect(calculateMonthBalance(r, 2026, 9).quincenas[1].expense, 1800000);
      expect(calculateMonthBalance(r, 2026, 10).expense, 0);
    });

    test('un mes sin movimientos da cero, no explota', () {
      final m = calculateMonthBalance(const [], 2026, 9);
      expect(m.sobrante, 0);
      expect(m.quincenas.length, 2);
    });
  });
}
