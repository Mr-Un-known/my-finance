/// Ciclo de tarjeta de crédito.
///
/// Regla (genérica, NUNCA hardcodeada para un año):
///  - Una compra hecha el día D pertenece al corte de este mes si
///    D <= cutoffDay (clampeado al último día del mes). Si D > cutoffDay,
///    pertenece al corte del mes siguiente.
///  - El pago cae el paymentDay del mes SIGUIENTE al corte.
///
/// Ejemplo con cutoffDay=15, paymentDay=2:
///   14 ene -> corte 15 ene -> pago 2 feb
///   16 ene -> corte 15 feb -> pago 2 mar
library;

import '../dates.dart';

class CreditCardCycle {
  const CreditCardCycle({
    required this.cycleStart,
    required this.cycleCutoff,
    required this.paymentDate,
  });

  /// Primer día del ciclo al que pertenece la compra.
  final IsoDate cycleStart;

  /// Fecha de corte del ciclo (el día D queda incluido si D <= cutoffDay).
  final IsoDate cycleCutoff;

  /// Fecha en la que ese ciclo se paga.
  final IsoDate paymentDate;
}

CreditCardCycle calculateCreditCardCycle(
  IsoDate purchaseDate, {
  int cutoffDay = 15,
  int paymentDay = 2,
}) {
  final ymd = parseIso(purchaseDate);
  final y = ymd.y, m = ymd.m, d = ymd.d;

  final cutoffThisMonth = clampDay(y, m, cutoffDay);
  final cutoffYM = d <= cutoffThisMonth ? (y: y, m: m) : shiftMonth(y, m, 1);
  final cutoffDayClamped = clampDay(cutoffYM.y, cutoffYM.m, cutoffDay);

  final payYM = shiftMonth(cutoffYM.y, cutoffYM.m, 1);
  final paymentDayClamped = clampDay(payYM.y, payYM.m, paymentDay);

  final prevCutoffYM = shiftMonth(cutoffYM.y, cutoffYM.m, -1);
  final prevCutoffDay = clampDay(prevCutoffYM.y, prevCutoffYM.m, cutoffDay);
  final cycleStart = addDays(Ymd(prevCutoffYM.y, prevCutoffYM.m, prevCutoffDay), 1);

  return CreditCardCycle(
    cycleStart: toIso(cycleStart),
    cycleCutoff: toIso(Ymd(cutoffYM.y, cutoffYM.m, cutoffDayClamped)),
    paymentDate: toIso(Ymd(payYM.y, payYM.m, paymentDayClamped)),
  );
}
