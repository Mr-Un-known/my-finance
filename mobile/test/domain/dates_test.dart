import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/dates.dart';

void main() {
  group('parseIso / toIso', () {
    test('ida y vuelta', () {
      expect(parseIso('2026-09-18'), const Ymd(2026, 9, 18));
      expect(toIso(const Ymd(2026, 9, 18)), '2026-09-18');
    });

    test('rellena con ceros', () {
      expect(toIso(const Ymd(2026, 1, 5)), '2026-01-05');
    });

    test('rechaza basura', () {
      expect(() => parseIso('18/09/2026'), throwsFormatException);
      expect(() => parseIso('2026-09'), throwsFormatException);
    });
  });

  group('daysInMonth', () {
    test('meses normales', () {
      expect(daysInMonth(2026, 1), 31);
      expect(daysInMonth(2026, 4), 30);
    });

    test('febrero bisiesto y no bisiesto', () {
      expect(daysInMonth(2024, 2), 29);
      expect(daysInMonth(2026, 2), 28);
      expect(daysInMonth(2000, 2), 29);
      expect(daysInMonth(1900, 2), 28);
    });
  });

  group('clampDay', () {
    test('nunca produce un día inexistente', () {
      expect(clampDay(2026, 2, 31), 28);
      expect(clampDay(2024, 2, 31), 29);
      expect(clampDay(2026, 1, 31), 31);
      expect(clampDay(2026, 1, 0), 1);
    });
  });

  group('shiftMonth', () {
    test('cruza el año hacia adelante y hacia atrás', () {
      expect(shiftMonth(2026, 12, 1), (y: 2027, m: 1));
      expect(shiftMonth(2026, 1, -1), (y: 2025, m: 12));
      expect(shiftMonth(2026, 6, 0), (y: 2026, m: 6));
      expect(shiftMonth(2026, 1, -13), (y: 2024, m: 12));
    });
  });

  group('addDays', () {
    test('cruza mes y año', () {
      expect(addDays(const Ymd(2026, 1, 31), 1), const Ymd(2026, 2, 1));
      expect(addDays(const Ymd(2026, 12, 31), 1), const Ymd(2027, 1, 1));
      expect(addDays(const Ymd(2026, 3, 1), -1), const Ymd(2026, 2, 28));
    });
  });

  test('compareIso ordena como string ISO', () {
    expect(compareIso('2026-01-01', '2026-01-02'), -1);
    expect(compareIso('2026-01-02', '2026-01-01'), 1);
    expect(compareIso('2026-01-01', '2026-01-01'), 0);
  });

  test('weekdayOf usa 0=domingo, como getUTCDay', () {
    expect(weekdayOf(const Ymd(2026, 9, 20)), 0); // domingo
    expect(weekdayOf(const Ymd(2026, 9, 18)), 5); // viernes
  });

  test('todayIso usa la fecha local del dispositivo', () {
    expect(todayIso(DateTime(2026, 9, 18, 23, 30)), '2026-09-18');
  });
}
