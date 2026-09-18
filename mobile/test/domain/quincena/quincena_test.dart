import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/quincena/quincena.dart';

void main() {
  group('calculateQuincena con [10, 25]', () {
    test('el día exacto de arranque abre la quincena del 10', () {
      final q = calculateQuincena('2026-09-10');
      expect(q.key, '2026-09-Q1');
      expect(q.start, '2026-09-10');
      expect(q.end, '2026-09-24');
    });

    test('el día antes del corte sigue en la quincena del 10', () {
      expect(calculateQuincena('2026-09-24').key, '2026-09-Q1');
    });

    test('el día exacto del 25 abre la quincena del 25', () {
      final q = calculateQuincena('2026-09-25');
      expect(q.key, '2026-09-Q2');
      expect(q.start, '2026-09-25');
      expect(q.end, '2026-10-09');
    });

    test('la quincena del 25 cruza el cambio de mes', () {
      // El caso del arriendo: 1 de octubre pertenece a septiembre.
      final q = calculateQuincena('2026-10-01');
      expect(q.key, '2026-09-Q2');
      expect(q.start, '2026-09-25');
      expect(q.end, '2026-10-09');
    });

    test('el 9 todavía es del mes anterior; el 10 ya no', () {
      expect(calculateQuincena('2026-10-09').key, '2026-09-Q2');
      expect(calculateQuincena('2026-10-10').key, '2026-10-Q1');
    });

    test('cruza el cambio de año', () {
      final q = calculateQuincena('2027-01-05');
      expect(q.key, '2026-12-Q2');
      expect(q.start, '2026-12-25');
      expect(q.end, '2027-01-09');
    });
  });

  group('días de quincena configurables', () {
    test('acepta otros días', () {
      final q = calculateQuincena('2026-09-07', [5, 20]);
      expect(q.key, '2026-09-Q1');
      expect(q.start, '2026-09-05');
      expect(q.end, '2026-09-19');
    });

    test('da igual el orden en que se pasen', () {
      expect(calculateQuincena('2026-09-07', [20, 5]).key, calculateQuincena('2026-09-07', [5, 20]).key);
    });

    test('un día que no existe en el mes se clampea', () {
      // Día 31 en febrero -> 28.
      final q = calculateQuincena('2026-02-28', [15, 31]);
      expect(q.key, '2026-02-Q2');
      expect(q.start, '2026-02-28');
    });

    test('los dos días iguales: quien cobra una vez al mes', () {
      final q = calculateQuincena('2026-09-15', [15, 15]);
      expect(q.key, '2026-09-Q2');
      expect(q.start, '2026-09-15');
      expect(q.end, '2026-10-14');
    });
  });

  group('rangeOfQuincenaKey', () {
    test('reconstruye el rango sin tener la transacción', () {
      expect(rangeOfQuincenaKey('2026-09-Q1').start, '2026-09-10');
      expect(rangeOfQuincenaKey('2026-09-Q2').start, '2026-09-25');
      expect(rangeOfQuincenaKey('2026-09-Q2').end, '2026-10-09');
    });

    test('es la inversa de calculateQuincena', () {
      for (final fecha in ['2026-01-15', '2026-06-30', '2026-12-26', '2027-01-02']) {
        final q = calculateQuincena(fecha);
        expect(rangeOfQuincenaKey(q.key), q, reason: fecha);
      }
    });

    test('rechaza una llave inválida', () {
      expect(() => rangeOfQuincenaKey('2026-09'), throwsFormatException);
      expect(() => rangeOfQuincenaKey('2026-09-Q3'), throwsFormatException);
    });
  });

  test('quincenasOfMonth da las dos llaves del mes', () {
    expect(quincenasOfMonth(2026, 9), ['2026-09-Q1', '2026-09-Q2']);
  });
}
