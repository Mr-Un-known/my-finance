import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/credit_card/cycle.dart';

void main() {
  group('calculateCreditCardCycle con corte 15 / pago 2', () {
    test('compra antes del corte: corte este mes, pago el mes siguiente', () {
      final c = calculateCreditCardCycle('2026-01-14');
      expect(c.cycleCutoff, '2026-01-15');
      expect(c.paymentDate, '2026-02-02');
    });

    test('el día exacto del corte queda incluido', () {
      final c = calculateCreditCardCycle('2026-01-15');
      expect(c.cycleCutoff, '2026-01-15');
      expect(c.paymentDate, '2026-02-02');
    });

    test('compra después del corte: se va al corte siguiente', () {
      final c = calculateCreditCardCycle('2026-01-16');
      expect(c.cycleCutoff, '2026-02-15');
      expect(c.paymentDate, '2026-03-02');
    });

    test('el ciclo arranca el día después del corte anterior', () {
      expect(calculateCreditCardCycle('2026-01-14').cycleStart, '2025-12-16');
      expect(calculateCreditCardCycle('2026-01-16').cycleStart, '2026-01-16');
    });

    test('cruza el cambio de año', () {
      final c = calculateCreditCardCycle('2026-12-20');
      expect(c.cycleCutoff, '2027-01-15');
      expect(c.paymentDate, '2027-02-02');
    });
  });

  group('días que no existen en el mes', () {
    test('corte 31 en febrero se clampea al 28', () {
      final c = calculateCreditCardCycle('2026-02-27', cutoffDay: 31);
      expect(c.cycleCutoff, '2026-02-28');
      expect(c.paymentDate, '2026-03-02');
    });

    test('corte 31 en febrero bisiesto se clampea al 29', () {
      expect(calculateCreditCardCycle('2024-02-27', cutoffDay: 31).cycleCutoff, '2024-02-29');
    });

    test('pago 31 en un mes de 30 se clampea al 30', () {
      final c = calculateCreditCardCycle('2026-03-10', cutoffDay: 15, paymentDay: 31);
      expect(c.cycleCutoff, '2026-03-15');
      expect(c.paymentDate, '2026-04-30');
    });
  });

  group('corte y pago configurables', () {
    test('corte 5 / pago 20', () {
      final c = calculateCreditCardCycle('2026-09-03', cutoffDay: 5, paymentDay: 20);
      expect(c.cycleCutoff, '2026-09-05');
      expect(c.paymentDate, '2026-10-20');
    });

    test('el pago siempre cae después del corte', () {
      for (final dia in ['2026-01-01', '2026-05-15', '2026-05-16', '2026-12-31']) {
        final c = calculateCreditCardCycle(dia);
        expect(c.paymentDate.compareTo(c.cycleCutoff) > 0, isTrue, reason: dia);
        expect(c.cycleStart.compareTo(c.cycleCutoff) <= 0, isTrue, reason: dia);
      }
    });
  });
}
