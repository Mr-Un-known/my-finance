import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/recurring/expansion.dart';
import 'package:my_finance/domain/types.dart';

RecurringRule regla({
  Frequency frequency = Frequency.monthly,
  int? dayOfMonth = 5,
  String startDate = '2026-01-01',
  String? endDate,
  bool isActive = true,
}) =>
    RecurringRule(
      id: 'r1',
      name: 'Arriendo',
      type: TransactionType.expense,
      amount: 1800000,
      frequency: frequency,
      dayOfMonth: dayOfMonth,
      startDate: startDate,
      endDate: endDate,
      isActive: isActive,
    );

void main() {
  group('mensual', () {
    test('una por mes dentro del rango', () {
      final occ = expandRecurringRule(regla(), from: '2026-01-01', to: '2026-03-31');
      expect(occ.map((o) => o.date), ['2026-01-05', '2026-02-05', '2026-03-05']);
      expect(occ.map((o) => o.periodKey), ['2026-01', '2026-02', '2026-03']);
    });

    test('el día 31 se clampea al último día de cada mes', () {
      final occ = expandRecurringRule(regla(dayOfMonth: 31), from: '2026-01-01', to: '2026-04-30');
      expect(occ.map((o) => o.date), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    });

    test('no arranca antes de startDate', () {
      final occ = expandRecurringRule(regla(startDate: '2026-03-01'), from: '2026-01-01', to: '2026-04-30');
      expect(occ.map((o) => o.date), ['2026-03-05', '2026-04-05']);
    });

    test('no sigue después de endDate', () {
      final occ = expandRecurringRule(regla(endDate: '2026-02-28'), from: '2026-01-01', to: '2026-06-30');
      expect(occ.map((o) => o.date), ['2026-01-05', '2026-02-05']);
    });

    test('sin endDate sigue tan lejos como se le pida', () {
      // El bug de "los recurrentes se cortan en diciembre" era de la ventana
      // de materialización, no de esta función: acá no hay tope.
      final occ = expandRecurringRule(regla(), from: '2028-01-01', to: '2028-12-31');
      expect(occ.length, 12);
      expect(occ.last.date, '2028-12-05');
    });

    test('cruza el cambio de año', () {
      final occ = expandRecurringRule(regla(), from: '2026-11-01', to: '2027-02-28');
      expect(occ.map((o) => o.date), ['2026-11-05', '2026-12-05', '2027-01-05', '2027-02-05']);
    });
  });

  group('semanal y quincenal', () {
    test('semanal cada 7 días desde startDate', () {
      final occ = expandRecurringRule(
        regla(frequency: Frequency.weekly, startDate: '2026-01-01'),
        from: '2026-01-01',
        to: '2026-01-29',
      );
      expect(occ.map((o) => o.date), ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29']);
    });

    test('quincenal cada 14 días, alineado a startDate aunque el rango empiece después', () {
      final occ = expandRecurringRule(
        regla(frequency: Frequency.biweekly, startDate: '2026-01-01'),
        from: '2026-02-01',
        to: '2026-03-01',
      );
      expect(occ.map((o) => o.date), ['2026-02-12', '2026-02-26']);
    });

    test('la periodKey semanal es la fecha misma', () {
      final occ = expandRecurringRule(
        regla(frequency: Frequency.weekly),
        from: '2026-01-01',
        to: '2026-01-08',
      );
      expect(occ.first.periodKey, occ.first.date);
    });
  });

  group('anual', () {
    test('una por año, con la periodKey del año', () {
      final occ = expandRecurringRule(
        regla(frequency: Frequency.yearly, startDate: '2026-06-15'),
        from: '2026-01-01',
        to: '2028-12-31',
      );
      expect(occ.map((o) => o.date), ['2026-06-15', '2027-06-15', '2028-06-15']);
      expect(occ.map((o) => o.periodKey), ['2026', '2027', '2028']);
    });

    test('29 de febrero cae en 28 los años no bisiestos', () {
      final occ = expandRecurringRule(
        regla(frequency: Frequency.yearly, startDate: '2024-02-29'),
        from: '2024-01-01',
        to: '2026-12-31',
      );
      expect(occ.map((o) => o.date), ['2024-02-29', '2025-02-28', '2026-02-28']);
    });
  });

  group('casos borde', () {
    test('una regla inactiva no genera nada', () {
      expect(expandRecurringRule(regla(isActive: false), from: '2026-01-01', to: '2026-12-31'), isEmpty);
    });

    test('un rango invertido no genera nada', () {
      expect(expandRecurringRule(regla(), from: '2026-06-01', to: '2026-01-01'), isEmpty);
    });

    test('un rango que termina antes de startDate no genera nada', () {
      expect(
        expandRecurringRule(regla(startDate: '2027-01-01'), from: '2026-01-01', to: '2026-12-31'),
        isEmpty,
      );
    });
  });
}
