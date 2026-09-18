/// Kernel de fechas. Todo el resto del dominio pasa por aquí para
/// aritmética de meses/días. Usa exclusivamente DateTime.utc (nunca hora
/// local) para que el resultado no dependa de la zona horaria de quien
/// ejecuta el código.
///
/// Portado uno a uno de src/domain/dates.ts de la app web: las dos
/// implementaciones tienen que dar exactamente lo mismo mientras convivan.
library;

/// Fecha de negocio: 'YYYY-MM-DD'. Nunca un DateTime con hora — una compra
/// del 15 a las 11pm no puede caer en el ciclo equivocado por zona horaria.
typedef IsoDate = String;

class Ymd {
  const Ymd(this.y, this.m, this.d);

  final int y;
  final int m; // 1-12
  final int d;

  Ymd copyWith({int? y, int? m, int? d}) => Ymd(y ?? this.y, m ?? this.m, d ?? this.d);

  @override
  bool operator ==(Object other) => other is Ymd && other.y == y && other.m == m && other.d == d;

  @override
  int get hashCode => Object.hash(y, m, d);

  @override
  String toString() => toIso(this);
}

Ymd parseIso(IsoDate date) {
  final partes = date.split('-');
  if (partes.length != 3) {
    throw FormatException('Fecha ISO invalida: "$date" (se esperaba \'YYYY-MM-DD\')');
  }
  final y = int.tryParse(partes[0]);
  final m = int.tryParse(partes[1]);
  final d = int.tryParse(partes[2]);
  if (y == null || m == null || d == null) {
    throw FormatException('Fecha ISO invalida: "$date" (se esperaba \'YYYY-MM-DD\')');
  }
  return Ymd(y, m, d);
}

IsoDate toIso(Ymd ymd) =>
    '${ymd.y.toString().padLeft(4, '0')}-${ymd.m.toString().padLeft(2, '0')}-${ymd.d.toString().padLeft(2, '0')}';

/// Último día del mes m (1-12) del año y. Maneja bisiestos automáticamente.
int daysInMonth(int y, int m) => DateTime.utc(y, m + 1, 0).day;

/// Clampea day al rango válido del mes, nunca produce un día inexistente.
int clampDay(int y, int m, int day) {
  final max = daysInMonth(y, m);
  if (day < 1) return 1;
  return day > max ? max : day;
}

/// Suma (o resta) meses de forma exacta, sin el "desborde" del DateTime nativo.
({int y, int m}) shiftMonth(int y, int m, int delta) {
  final total = y * 12 + (m - 1) + delta;
  final y2 = (total / 12).floor();
  return (y: y2, m: total - y2 * 12 + 1);
}

Ymd addDays(Ymd ymd, int days) {
  final base = DateTime.utc(ymd.y, ymd.m, ymd.d);
  final shifted = base.add(Duration(days: days));
  return Ymd(shifted.year, shifted.month, shifted.day);
}

int compareIso(IsoDate a, IsoDate b) => a.compareTo(b) < 0 ? -1 : (a.compareTo(b) > 0 ? 1 : 0);

/// 0 domingo .. 6 sábado (igual que getUTCDay de JS, no como DateTime.weekday).
int weekdayOf(Ymd ymd) => DateTime.utc(ymd.y, ymd.m, ymd.d).weekday % 7;

/// "Qué día es hoy" para prellenar formularios. A propósito usa la hora
/// LOCAL del dispositivo (es literalmente el hoy del usuario) — distinto
/// del resto de este archivo, que nunca debe depender de zona horaria.
IsoDate todayIso([DateTime? ahora]) {
  final d = ahora ?? DateTime.now();
  return toIso(Ymd(d.year, d.month, d.day));
}

String nowIso([DateTime? ahora]) => (ahora ?? DateTime.now()).toUtc().toIso8601String();
