import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/totals/month_flow.dart';
import 'package:my_finance/domain/types.dart';

Transaction tx({
  TransactionType type = TransactionType.expense,
  int amount = 0,
  TransactionStatus status = TransactionStatus.paid,
  String date = '2026-09-10',
  String? cyclePaymentDate,
  String id = 'x',
}) =>
    Transaction(
      id: id,
      type: type,
      concept: 'x',
      amount: amount,
      date: date,
      status: status,
      cyclePaymentDate: cyclePaymentDate,
      createdAt: '',
      updatedAt: '',
    );

void main() {
  group('calculateMonthFlow', () {
    test('separa recibido / por recibir / pagado / por pagar', () {
      final f = calculateMonthFlow([
        tx(type: TransactionType.income, amount: 3000000, status: TransactionStatus.paid),
        tx(type: TransactionType.income, amount: 1000000, status: TransactionStatus.pending),
        tx(amount: 800000, status: TransactionStatus.paid),
        tx(amount: 500000, status: TransactionStatus.scheduled),
      ]);
      expect(f.recibido, 3000000);
      expect(f.porRecibir, 1000000);
      expect(f.pagado, 800000);
      expect(f.porPagar, 500000);
    });

    test('ignora cancelados', () {
      final f = calculateMonthFlow([tx(amount: 999, status: TransactionStatus.cancelled)]);
      expect(f.pagado, 0);
      expect(f.porPagar, 0);
    });

    test('enCaja es lo ya ejecutado y proyectado es el mes completo', () {
      final f = calculateMonthFlow([
        tx(type: TransactionType.income, amount: 2000000, status: TransactionStatus.paid),
        tx(type: TransactionType.income, amount: 2000000, status: TransactionStatus.pending),
        tx(amount: 3000000, status: TransactionStatus.paid),
        tx(amount: 500000, status: TransactionStatus.pending),
      ]);
      expect(f.enCaja, -1000000);
      expect(f.proyectado, 500000);
    });

    test('los cuatro componentes nunca son negativos', () {
      final f = calculateMonthFlow([tx(amount: 100, status: TransactionStatus.pending)]);
      for (final n in [f.recibido, f.porRecibir, f.pagado, f.porPagar]) {
        expect(n, greaterThanOrEqualTo(0));
      }
    });
  });

  group('selectUpcoming', () {
    test('ordena ascendente: primero lo más cercano a la fecha', () {
      final r = selectUpcoming([
        tx(id: 'a', date: '2026-09-20', status: TransactionStatus.pending),
        tx(id: 'b', date: '2026-09-02', status: TransactionStatus.pending),
        tx(id: 'c', date: '2026-09-15', status: TransactionStatus.pending),
      ]);
      expect(r.map((t) => t.id), ['b', 'c', 'a']);
    });

    test('usa la fecha de pago de TC cuando existe', () {
      final r = selectUpcoming([
        tx(id: 'tarde', date: '2026-09-01', cyclePaymentDate: '2026-11-02', status: TransactionStatus.pending),
        tx(id: 'pronto', date: '2026-09-20', status: TransactionStatus.pending),
      ]);
      expect(r.map((t) => t.id), ['pronto', 'tarde']);
    });

    test('excluye pagados y cancelados, incluye ingresos', () {
      final r = selectUpcoming([
        tx(id: 'pagado', status: TransactionStatus.paid),
        tx(id: 'cancelado', status: TransactionStatus.cancelled),
        tx(id: 'sueldo', type: TransactionType.income, status: TransactionStatus.pending),
        tx(id: 'programado', status: TransactionStatus.scheduled),
      ]);
      expect(r.map((t) => t.id).toSet(), {'sueldo', 'programado'});
    });

    test('respeta el límite', () {
      final muchos = List.generate(
        10,
        (i) => tx(id: '$i', date: '2026-09-${10 + i}', status: TransactionStatus.pending),
      );
      expect(selectUpcoming(muchos, limit: 3).length, 3);
    });
  });
}
