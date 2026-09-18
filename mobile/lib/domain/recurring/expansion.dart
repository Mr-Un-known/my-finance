/// Expande una REGLA recurrente en INSTANCIAS concretas dentro de un rango
/// de fechas. Es una función pura: no escribe nada. El caller hace upsert
/// de cada instancia usando (recurringRuleId, periodKey) como llave — ese
/// índice ÚNICO en la base de datos es lo que hace imposible la
/// duplicación, no esta función.
library;

import '../dates.dart';
import '../types.dart';

class RecurringOccurrence {
  const RecurringOccurrence({required this.periodKey, required this.date});

  /// Clave idempotente: 'YYYY-MM' para mensual, 'YYYY' para anual, la
  /// fecha misma para semanal/quincenal.
  final String periodKey;
  final IsoDate date;

  @override
  bool operator ==(Object other) =>
      other is RecurringOccurrence && other.periodKey == periodKey && other.date == date;

  @override
  int get hashCode => Object.hash(periodKey, date);

  @override
  String toString() => 'RecurringOccurrence($periodKey, $date)';
}

int _compareYm(int ay, int am, int by, int bm) => (ay * 12 + am) - (by * 12 + bm);

List<RecurringOccurrence> expandRecurringRule(
  RecurringRule rule, {
  required IsoDate from,
  required IsoDate to,
}) {
  if (!rule.isActive) return const [];

  final effectiveFrom = compareIso(rule.startDate, from) > 0 ? rule.startDate : from;
  final endDate = rule.endDate;
  final effectiveTo = (endDate != null && compareIso(endDate, to) < 0) ? endDate : to;
  if (compareIso(effectiveFrom, effectiveTo) > 0) return const [];

  final occurrences = <RecurringOccurrence>[];

  switch (rule.frequency) {
    case Frequency.monthly:
      final desde = parseIso(effectiveFrom);
      final hasta = parseIso(effectiveTo);
      var cursorY = desde.y;
      var cursorM = desde.m;
      while (_compareYm(cursorY, cursorM, hasta.y, hasta.m) <= 0) {
        final day = clampDay(cursorY, cursorM, rule.dayOfMonth ?? 1);
        final date = toIso(Ymd(cursorY, cursorM, day));
        if (compareIso(date, effectiveFrom) >= 0 && compareIso(date, effectiveTo) <= 0) {
          occurrences.add(RecurringOccurrence(periodKey: date.substring(0, 7), date: date));
        }
        final sig = shiftMonth(cursorY, cursorM, 1);
        cursorY = sig.y;
        cursorM = sig.m;
      }

    case Frequency.weekly:
    case Frequency.biweekly:
      final step = rule.frequency == Frequency.weekly ? 7 : 14;
      var cursor = parseIso(rule.startDate);
      while (compareIso(toIso(cursor), effectiveFrom) < 0) {
        cursor = addDays(cursor, step);
      }
      while (compareIso(toIso(cursor), effectiveTo) <= 0) {
        final date = toIso(cursor);
        occurrences.add(RecurringOccurrence(periodKey: date, date: date));
        cursor = addDays(cursor, step);
      }

    case Frequency.yearly:
      final anchor = parseIso(rule.startDate);
      final desde = parseIso(effectiveFrom);
      final hasta = parseIso(effectiveTo);
      for (var y = desde.y; y <= hasta.y; y++) {
        // 29 feb -> 28 feb en año no bisiesto.
        final day = clampDay(y, anchor.m, anchor.d);
        final date = toIso(Ymd(y, anchor.m, day));
        if (compareIso(date, effectiveFrom) >= 0 && compareIso(date, effectiveTo) <= 0) {
          occurrences.add(RecurringOccurrence(periodKey: '$y', date: date));
        }
      }
  }

  return occurrences;
}
