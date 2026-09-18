/// Quincenas configurables. Por defecto: quincena del 10 y del 25.
///
/// NO son mitades del mes (1-14 / 15-fin): son ventanas que arrancan el día
/// que el usuario configure, y la segunda cruza el cambio de mes.
///
/// Ejemplo con startDays=[10,25]:
///   Quincena del 10:  10 -> 24
///   Quincena del 25:  25 -> 9 del mes siguiente
///
/// Por eso "Arriendo", pagado el 1 de octubre, cae dentro de la
/// "quincena del 25" de SEPTIEMBRE — así es como el usuario ya la usa.
library;

import '../dates.dart';
import '../types.dart';

const List<int> quincenaPorDefecto = [10, 25];

class QuincenaRange {
  const QuincenaRange({required this.key, required this.start, required this.end});

  final QuincenaKey key;
  final IsoDate start;
  final IsoDate end;

  @override
  bool operator ==(Object other) =>
      other is QuincenaRange && other.key == key && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(key, start, end);

  @override
  String toString() => 'QuincenaRange($key, $start..$end)';
}

QuincenaKey quincenaKey(int y, int m, int n) =>
    '${y.toString().padLeft(4, '0')}-${m.toString().padLeft(2, '0')}-Q$n';

/// Los dos días ordenados de menor a mayor, sin importar cómo los guardó
/// el usuario.
({int a, int b}) _ordenados(List<int> startDays) {
  final p = startDays.isEmpty ? quincenaPorDefecto : startDays;
  final x = p[0];
  final y = p.length > 1 ? p[1] : p[0];
  return x < y ? (a: x, b: y) : (a: y, b: x);
}

QuincenaRange calculateQuincena(IsoDate date, [List<int> startDays = quincenaPorDefecto]) {
  final (:a, :b) = _ordenados(startDays);
  final ymd = parseIso(date);
  final y = ymd.y, m = ymd.m, d = ymd.d;

  final aThis = clampDay(y, m, a);
  final bThis = clampDay(y, m, b);

  // Antes de que arranque la primera quincena de este mes: todavía es la
  // segunda quincena del mes anterior (la que cruzó el cambio de mes).
  if (d < aThis) {
    final prev = shiftMonth(y, m, -1);
    final bPrev = clampDay(prev.y, prev.m, b);
    return QuincenaRange(
      key: quincenaKey(prev.y, prev.m, 2),
      start: toIso(Ymd(prev.y, prev.m, bPrev)),
      end: toIso(addDays(Ymd(y, m, aThis), -1)),
    );
  }

  // Dentro de la primera quincena de este mes.
  if (d < bThis) {
    return QuincenaRange(
      key: quincenaKey(y, m, 1),
      start: toIso(Ymd(y, m, aThis)),
      end: toIso(addDays(Ymd(y, m, bThis), -1)),
    );
  }

  // Segunda quincena: arranca aquí y cruza hacia el mes siguiente.
  final next = shiftMonth(y, m, 1);
  final aNext = clampDay(next.y, next.m, a);
  return QuincenaRange(
    key: quincenaKey(y, m, 2),
    start: toIso(Ymd(y, m, bThis)),
    end: toIso(addDays(Ymd(next.y, next.m, aNext), -1)),
  );
}

/// Útil para UI: dado un año/mes, las claves de sus dos quincenas.
List<QuincenaKey> quincenasOfMonth(int year, int month) =>
    [quincenaKey(year, month, 1), quincenaKey(year, month, 2)];

/// Reconstruye el rango completo a partir de una llave, sin depender de
/// tener una transacción real en la mano. Para encabezados y calendario.
QuincenaRange rangeOfQuincenaKey(QuincenaKey key, [List<int> startDays = quincenaPorDefecto]) {
  final match = RegExp(r'^(\d{4})-(\d{2})-Q([12])$').firstMatch(key);
  if (match == null) throw FormatException('Quincena key invalida: "$key"');
  final y = int.parse(match.group(1)!);
  final m = int.parse(match.group(2)!);
  final n = int.parse(match.group(3)!);
  final (:a, :b) = _ordenados(startDays);
  final day = n == 1 ? a : b;
  return calculateQuincena(toIso(Ymd(y, m, clampDay(y, m, day))), startDays);
}

/// La quincena de una transacción: la que el usuario fijó a mano, o la que
/// le toca por fecha.
QuincenaKey resolveQuincenaKey(Transaction tx, [List<int> startDays = quincenaPorDefecto]) =>
    tx.quincenaKey ?? calculateQuincena(tx.date, startDays).key;
