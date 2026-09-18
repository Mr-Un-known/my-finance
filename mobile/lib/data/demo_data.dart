/// Datos de ejemplo, para ver la app funcionando sin teclear veinte
/// movimientos. Las fechas son relativas a hoy, no fijas: con fechas fijas
/// el ejemplo se ve vacío apenas pasa el mes.
library;

import '../domain/credit_card/cycle.dart';
import '../domain/dates.dart';
import '../domain/types.dart';
import 'local_repository.dart';

IsoDate _relativa(int dias) => toIso(addDays(parseIso(todayIso()), dias));

Future<void> sembrarDemo(LocalRepository repo) async {
  final ahora = nowIso();
  final compraTc = _relativa(-2);
  final ciclo = calculateCreditCardCycle(compraTc, cutoffDay: 15, paymentDay: 2);

  final movimientos = <Transaction>[
    Transaction(
      id: 'demo-sueldo', type: TransactionType.income, concept: 'Sueldo', amount: 2800000,
      date: _relativa(-5), status: TransactionStatus.paid, paymentMethodId: 'pm-debito',
      createdAt: ahora, updatedAt: ahora,
    ),
    Transaction(
      id: 'demo-arriendo', type: TransactionType.expense, concept: 'Arriendo', amount: 1800000,
      date: _relativa(-4), status: TransactionStatus.paid, categoryId: 'cat-hogar',
      paymentMethodId: 'pm-debito', createdAt: ahora, updatedAt: ahora,
    ),
    Transaction(
      id: 'demo-mercado', type: TransactionType.expense, concept: 'Mercado', amount: 145000,
      date: _relativa(-1), status: TransactionStatus.pending, categoryId: 'cat-alimentacion',
      paymentMethodId: 'pm-debito', createdAt: ahora, updatedAt: ahora,
    ),
    Transaction(
      id: 'demo-gasolina', type: TransactionType.expense, concept: 'Gasolina', amount: 60000,
      date: _relativa(-3), status: TransactionStatus.paid, categoryId: 'cat-transporte',
      paymentMethodId: 'pm-debito', createdAt: ahora, updatedAt: ahora,
    ),
    Transaction(
      id: 'demo-zapatos', type: TransactionType.expense, concept: 'Zapatos', amount: 210000,
      date: compraTc, status: TransactionStatus.pending, categoryId: 'cat-compras',
      paymentMethodId: 'pm-tc', cycleCutoffDate: ciclo.cycleCutoff,
      cyclePaymentDate: ciclo.paymentDate, createdAt: ahora, updatedAt: ahora,
    ),
    Transaction(
      id: 'demo-servicios', type: TransactionType.expense, concept: 'Servicios', amount: 200000,
      date: _relativa(6), status: TransactionStatus.scheduled, categoryId: 'cat-servicios',
      paymentMethodId: 'pm-debito', createdAt: ahora, updatedAt: ahora,
    ),
    Transaction(
      id: 'demo-freelance', type: TransactionType.income, concept: 'Freelance', amount: 700000,
      date: _relativa(4), status: TransactionStatus.pending, paymentMethodId: 'pm-debito',
      createdAt: ahora, updatedAt: ahora,
    ),
  ];

  await repo.saveTransactions(movimientos);
}
