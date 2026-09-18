/// Flujo del mes: los cuatro números que el usuario realmente necesita.
///
/// Antes existía "Disponible ahora" = pagados - comprometidos, que sobre un
/// mes suelto daba casi siempre negativo (los gastos se registran, el sueldo
/// del mes todavía no llegó / no se marcó recibido) y no significaba nada.
/// Se reemplaza por el desglose explícito: lo que ya entró, lo que falta
/// entrar, lo que ya salió, lo que falta salir. Ninguno de los cuatro puede
/// ser negativo, y el neto se muestra etiquetado, no como "disponible".
library;

import '../types.dart';

class MonthFlow {
  const MonthFlow({
    required this.recibido,
    required this.porRecibir,
    required this.pagado,
    required this.porPagar,
  });

  /// Ingresos ya recibidos.
  final int recibido;

  /// Ingresos que aún esperas recibir (pendientes + programados).
  final int porRecibir;

  /// Gastos ya pagados.
  final int pagado;

  /// Gastos que aún esperas pagar (pendientes + programados).
  final int porPagar;

  /// Lo que realmente se movió ya. Puede ser negativo.
  int get enCaja => recibido - pagado;

  /// Cómo queda el mes si todo se cumple.
  int get proyectado => recibido + porRecibir - (pagado + porPagar);
}

MonthFlow calculateMonthFlow(List<Transaction> transactions) {
  var recibido = 0, porRecibir = 0, pagado = 0, porPagar = 0;

  for (final tx in transactions) {
    if (tx.isCancelled) continue;
    if (tx.isIncome) {
      if (tx.isPaid) {
        recibido += tx.amount;
      } else {
        porRecibir += tx.amount;
      }
    } else {
      if (tx.isPaid) {
        pagado += tx.amount;
      } else {
        porPagar += tx.amount;
      }
    }
  }

  return MonthFlow(recibido: recibido, porRecibir: porRecibir, pagado: pagado, porPagar: porPagar);
}

/// Los `limit` movimientos pendientes más cercanos a la fecha. Recibe la
/// lista ya acotada al mes: acotar es responsabilidad de quien llama, para
/// que el hero y esta lista nunca digan cosas distintas.
List<Transaction> selectUpcoming(List<Transaction> delMes, {int limit = 8}) {
  final pendientes = delMes.where((t) => t.isUpcoming).toList()
    ..sort((a, b) => a.relevantDate.compareTo(b.relevantDate));
  return pendientes.take(limit).toList();
}
