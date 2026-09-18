/// Restante por quincena y sobrante del mes.
///
/// Regla (viene directo del Excel original): el restante de una quincena es
/// ingresos - gastos de esa quincena, SIN filtrar por si ya están pagados
/// (el check de "pagado" es seguimiento aparte, no cambia la matemática).
/// "Cancelado" sí se excluye: un gasto cancelado nunca debió contar.
///
/// "Sobrante del mes" = suma de los dos restantes.
library;

import '../types.dart';
import 'quincena.dart';

/// Una transacción con su quincena ya resuelta. Existe para que este
/// archivo se pueda probar con fixtures sin depender de calculateQuincena:
/// "sumar" y "calcular a qué quincena pertenece" se prueban por separado.
class ResolvedTx {
  const ResolvedTx(this.tx, this.key);
  final Transaction tx;
  final QuincenaKey key;
}

List<ResolvedTx> withResolvedQuincena(
  List<Transaction> transactions, [
  List<int> startDays = quincenaPorDefecto,
]) =>
    transactions.map((tx) => ResolvedTx(tx, resolveQuincenaKey(tx, startDays))).toList();

class QuincenaBalance {
  const QuincenaBalance({
    required this.key,
    required this.income,
    required this.expense,
  });

  final QuincenaKey key;
  final int income;
  final int expense;

  int get restante => income - expense;
}

class MonthBalance {
  const MonthBalance({
    required this.year,
    required this.month,
    required this.quincenas,
  });

  final int year;
  final int month;
  final List<QuincenaBalance> quincenas;

  int get income => quincenas.fold(0, (a, q) => a + q.income);
  int get expense => quincenas.fold(0, (a, q) => a + q.expense);
  int get sobrante => quincenas.fold(0, (a, q) => a + q.restante);
}

QuincenaBalance calculateQuincenaBalance(List<ResolvedTx> resueltas, QuincenaKey key) {
  var income = 0;
  var expense = 0;
  for (final r in resueltas) {
    if (r.tx.isCancelled) continue;
    if (r.key != key) continue;
    if (r.tx.isIncome) {
      income += r.tx.amount;
    } else {
      expense += r.tx.amount;
    }
  }
  return QuincenaBalance(key: key, income: income, expense: expense);
}

MonthBalance calculateMonthBalance(List<ResolvedTx> resueltas, int year, int month) => MonthBalance(
      year: year,
      month: month,
      quincenas: quincenasOfMonth(year, month)
          .map((k) => calculateQuincenaBalance(resueltas, k))
          .toList(),
    );
