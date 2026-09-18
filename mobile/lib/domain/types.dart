/// Tipos del dominio. Esta carpeta NO importa Flutter ni Supabase.
///
/// Reglas duras, iguales a las de la app web (src/domain/types.ts):
///  - El dinero es siempre un entero (pesos). Nunca double: 0.1 + 0.2 no
///    da 0.3 y en plata eso es un bug, no un redondeo.
///  - Las fechas de negocio son 'YYYY-MM-DD', nunca DateTime con hora.
library;

import 'dates.dart';

typedef Id = String;

/// Ej: '2026-09-Q1' (quincena del 10) | '2026-09-Q2' (quincena del 25)
typedef QuincenaKey = String;

enum TransactionType {
  income,
  expense;

  static TransactionType desdeJson(String v) =>
      v == 'income' ? TransactionType.income : TransactionType.expense;
  String get json => name;
}

enum TransactionStatus {
  paid,
  pending,
  scheduled,
  cancelled;

  static TransactionStatus desdeJson(String v) =>
      TransactionStatus.values.firstWhere((s) => s.name == v, orElse: () => TransactionStatus.pending);
  String get json => name;
}

enum PaymentMethodType {
  debit,
  credit,
  cash,
  transfer;

  static PaymentMethodType desdeJson(String v) =>
      PaymentMethodType.values.firstWhere((t) => t.name == v, orElse: () => PaymentMethodType.debit);
  String get json => name;
}

enum Frequency {
  monthly,
  biweekly,
  weekly,
  yearly;

  static Frequency desdeJson(String v) =>
      Frequency.values.firstWhere((f) => f.name == v, orElse: () => Frequency.monthly);
  String get json => name;
}

enum CategoryKind {
  expense,
  income,
  both;

  static CategoryKind desdeJson(String v) =>
      CategoryKind.values.firstWhere((k) => k.name == v, orElse: () => CategoryKind.both);
  String get json => name;
}

class Category {
  const Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.kind,
    this.isArchived = false,
    this.sortOrder = 0,
  });

  final Id id;
  final String name;
  final String icon;
  /// Hex '#RRGGBB'. Se guarda como texto para que la fila viaje igual a
  /// Postgres y a la app web sin convertir.
  final String color;
  final CategoryKind kind;
  final bool isArchived;
  final int sortOrder;

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'icon': icon,
        'color': color,
        'kind': kind.json,
        'isArchived': isArchived ? 1 : 0,
        'sortOrder': sortOrder,
      };

  static Category fromJson(Map<String, Object?> j) => Category(
        id: j['id']! as String,
        name: j['name']! as String,
        icon: j['icon']! as String,
        color: j['color']! as String,
        kind: CategoryKind.desdeJson(j['kind']! as String),
        isArchived: (j['isArchived'] as int? ?? 0) == 1,
        sortOrder: j['sortOrder'] as int? ?? 0,
      );
}

class PaymentMethod {
  const PaymentMethod({
    required this.id,
    required this.type,
    required this.name,
    this.isDefault = false,
    this.cutoffDay,
    this.paymentDay,
  });

  final Id id;
  final PaymentMethodType type;
  final String name;
  final bool isDefault;

  /// Solo si type == credit. Configurables, nunca hardcodeados.
  final int? cutoffDay;
  final int? paymentDay;

  Map<String, Object?> toJson() => {
        'id': id,
        'type': type.json,
        'name': name,
        'isDefault': isDefault ? 1 : 0,
        'cutoffDay': cutoffDay,
        'paymentDay': paymentDay,
      };

  static PaymentMethod fromJson(Map<String, Object?> j) => PaymentMethod(
        id: j['id']! as String,
        type: PaymentMethodType.desdeJson(j['type']! as String),
        name: j['name']! as String,
        isDefault: (j['isDefault'] as int? ?? 0) == 1,
        cutoffDay: j['cutoffDay'] as int?,
        paymentDay: j['paymentDay'] as int?,
      );
}

class Transaction {
  const Transaction({
    required this.id,
    required this.type,
    required this.concept,
    required this.amount,
    required this.date,
    required this.status,
    this.categoryId,
    this.paymentMethodId,
    this.notes,
    this.cycleCutoffDate,
    this.cyclePaymentDate,
    this.quincenaKey,
    this.recurringRuleId,
    this.periodKey,
    required this.createdAt,
    required this.updatedAt,
  });

  final Id id;
  final TransactionType type;
  final String concept;
  final int amount; // pesos enteros
  final IsoDate date; // fecha de la compra / del ingreso
  final TransactionStatus status;
  final Id? categoryId;
  final Id? paymentMethodId;
  final String? notes;

  /// Derivados de TC, persistidos para que cambiar el corte no reescriba
  /// la historia.
  final IsoDate? cycleCutoffDate;
  final IsoDate? cyclePaymentDate;

  /// null = se calcula por fecha. Con valor = el usuario lo movió a mano.
  final QuincenaKey? quincenaKey;

  /// Trazabilidad de recurrencia. UNIQUE(recurringRuleId, periodKey).
  final Id? recurringRuleId;
  final String? periodKey; // '2026-09'

  final String createdAt;
  final String updatedAt;

  bool get isIncome => type == TransactionType.income;
  bool get isPaid => status == TransactionStatus.paid;
  bool get isCancelled => status == TransactionStatus.cancelled;
  bool get isUpcoming =>
      status == TransactionStatus.pending || status == TransactionStatus.scheduled;

  /// La fecha que importa: la de pago de la TC si existe, si no la del
  /// movimiento. Una compra de septiembre con tarjeta puede salir de la
  /// cuenta en noviembre.
  IsoDate get relevantDate => cyclePaymentDate ?? date;

  Transaction copyWith({
    TransactionType? type,
    String? concept,
    int? amount,
    IsoDate? date,
    TransactionStatus? status,
    Id? categoryId,
    Id? paymentMethodId,
    String? notes,
    IsoDate? cycleCutoffDate,
    IsoDate? cyclePaymentDate,
    QuincenaKey? quincenaKey,
    String? updatedAt,
  }) =>
      Transaction(
        id: id,
        type: type ?? this.type,
        concept: concept ?? this.concept,
        amount: amount ?? this.amount,
        date: date ?? this.date,
        status: status ?? this.status,
        categoryId: categoryId ?? this.categoryId,
        paymentMethodId: paymentMethodId ?? this.paymentMethodId,
        notes: notes ?? this.notes,
        cycleCutoffDate: cycleCutoffDate ?? this.cycleCutoffDate,
        cyclePaymentDate: cyclePaymentDate ?? this.cyclePaymentDate,
        quincenaKey: quincenaKey ?? this.quincenaKey,
        recurringRuleId: recurringRuleId,
        periodKey: periodKey,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'type': type.json,
        'concept': concept,
        'amount': amount,
        'date': date,
        'status': status.json,
        'categoryId': categoryId,
        'paymentMethodId': paymentMethodId,
        'notes': notes,
        'cycleCutoffDate': cycleCutoffDate,
        'cyclePaymentDate': cyclePaymentDate,
        'quincenaKey': quincenaKey,
        'recurringRuleId': recurringRuleId,
        'periodKey': periodKey,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static Transaction fromJson(Map<String, Object?> j) => Transaction(
        id: j['id']! as String,
        type: TransactionType.desdeJson(j['type']! as String),
        concept: j['concept']! as String,
        amount: j['amount']! as int,
        date: j['date']! as String,
        status: TransactionStatus.desdeJson(j['status']! as String),
        categoryId: j['categoryId'] as String?,
        paymentMethodId: j['paymentMethodId'] as String?,
        notes: j['notes'] as String?,
        cycleCutoffDate: j['cycleCutoffDate'] as String?,
        cyclePaymentDate: j['cyclePaymentDate'] as String?,
        quincenaKey: j['quincenaKey'] as String?,
        recurringRuleId: j['recurringRuleId'] as String?,
        periodKey: j['periodKey'] as String?,
        createdAt: j['createdAt']! as String,
        updatedAt: j['updatedAt']! as String,
      );
}

class RecurringRule {
  const RecurringRule({
    required this.id,
    required this.name,
    required this.type,
    required this.amount,
    required this.frequency,
    required this.startDate,
    this.categoryId,
    this.paymentMethodId,
    this.dayOfMonth,
    this.dayOfWeek,
    this.endDate,
    this.isActive = true,
  });

  final Id id;
  final String name;
  final TransactionType type;
  final int amount;
  final Id? categoryId;
  final Id? paymentMethodId;
  final Frequency frequency;
  final int? dayOfMonth;
  final int? dayOfWeek;
  final IsoDate startDate;
  final IsoDate? endDate;
  final bool isActive;

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'type': type.json,
        'amount': amount,
        'categoryId': categoryId,
        'paymentMethodId': paymentMethodId,
        'frequency': frequency.json,
        'dayOfMonth': dayOfMonth,
        'dayOfWeek': dayOfWeek,
        'startDate': startDate,
        'endDate': endDate,
        'isActive': isActive ? 1 : 0,
      };

  static RecurringRule fromJson(Map<String, Object?> j) => RecurringRule(
        id: j['id']! as String,
        name: j['name']! as String,
        type: TransactionType.desdeJson(j['type']! as String),
        amount: j['amount']! as int,
        categoryId: j['categoryId'] as String?,
        paymentMethodId: j['paymentMethodId'] as String?,
        frequency: Frequency.desdeJson(j['frequency']! as String),
        dayOfMonth: j['dayOfMonth'] as int?,
        dayOfWeek: j['dayOfWeek'] as int?,
        startDate: j['startDate']! as String,
        endDate: j['endDate'] as String?,
        isActive: (j['isActive'] as int? ?? 1) == 1,
      );
}

class Settings {
  const Settings({
    this.displayName = '',
    this.currency = 'COP',
    this.locale = 'es-CO',
    this.quincenaStartDays = const [10, 25],
    this.defaultPaymentMethodId,
    this.reminderDefaultDaysBefore = 1,
    this.theme = 'system',
    this.onboardedAt,
  });

  final String displayName;
  final String currency;
  final String locale;

  /// Día en que arranca cada quincena. Por defecto [10, 25].
  final List<int> quincenaStartDays;
  final Id? defaultPaymentMethodId;
  final int reminderDefaultDaysBefore;
  final String theme; // 'system' | 'light' | 'dark'

  /// null = todavía no pasó por la configuración inicial.
  final String? onboardedAt;

  Settings copyWith({
    String? displayName,
    String? currency,
    String? locale,
    List<int>? quincenaStartDays,
    Id? defaultPaymentMethodId,
    int? reminderDefaultDaysBefore,
    String? theme,
    String? onboardedAt,
  }) =>
      Settings(
        displayName: displayName ?? this.displayName,
        currency: currency ?? this.currency,
        locale: locale ?? this.locale,
        quincenaStartDays: quincenaStartDays ?? this.quincenaStartDays,
        defaultPaymentMethodId: defaultPaymentMethodId ?? this.defaultPaymentMethodId,
        reminderDefaultDaysBefore: reminderDefaultDaysBefore ?? this.reminderDefaultDaysBefore,
        theme: theme ?? this.theme,
        onboardedAt: onboardedAt ?? this.onboardedAt,
      );
}
