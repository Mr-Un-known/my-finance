/// Base local en SQLite. Espejo del esquema de Dexie de la app web
/// (src/data/db.ts) y del de Postgres (supabase/migrations/), para que una
/// fila pueda viajar entre los tres sin traducirse.
///
/// El dinero es INTEGER y las fechas de negocio son TEXT 'YYYY-MM-DD':
/// misma regla que el dominio, por los mismos motivos.
library;

import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

const String dbName = 'my_finance.db';
const int dbVersion = 1;

Future<void> crearEsquema(Database db, int version) async {
  await db.execute('''
    CREATE TABLE settings (
      id TEXT PRIMARY KEY,
      displayName TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'COP',
      locale TEXT NOT NULL DEFAULT 'es-CO',
      quincenaStartDays TEXT NOT NULL DEFAULT '10,25',
      defaultPaymentMethodId TEXT,
      reminderDefaultDaysBefore INTEGER NOT NULL DEFAULT 1,
      theme TEXT NOT NULL DEFAULT 'system',
      onboardedAt TEXT
    )
  ''');

  await db.execute('''
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      kind TEXT NOT NULL,
      isArchived INTEGER NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0
    )
  ''');

  await db.execute('''
    CREATE TABLE payment_methods (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      cutoffDay INTEGER,
      paymentDay INTEGER
    )
  ''');

  await db.execute('''
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      concept TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      categoryId TEXT,
      paymentMethodId TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      cycleCutoffDate TEXT,
      cyclePaymentDate TEXT,
      quincenaKey TEXT,
      recurringRuleId TEXT,
      periodKey TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  ''');
  await db.execute('CREATE INDEX transactions_date_idx ON transactions(date)');
  await db.execute('CREATE INDEX transactions_status_idx ON transactions(status)');
  // El mismo índice ÚNICO que en Dexie y en Postgres: es lo que hace
  // imposible duplicar "Arriendo septiembre 2026", no el código que llama.
  await db.execute(
    'CREATE UNIQUE INDEX transactions_recurrence_idx ON transactions(recurringRuleId, periodKey)',
  );

  await db.execute('''
    CREATE TABLE recurring_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      categoryId TEXT,
      paymentMethodId TEXT,
      frequency TEXT NOT NULL,
      dayOfMonth INTEGER,
      dayOfWeek INTEGER,
      startDate TEXT NOT NULL,
      endDate TEXT,
      isActive INTEGER NOT NULL DEFAULT 1
    )
  ''');

  // Lápidas de borrado: sin ellas, sincronizar resucita lo borrado.
  // Ver src/data/sync/tombstones.ts en la app web.
  await db.execute('''
    CREATE TABLE deletions (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      entityId TEXT NOT NULL,
      deletedAt TEXT NOT NULL
    )
  ''');
}

Future<Database> abrirDb({String? ruta}) async {
  final path = ruta ?? p.join(await getDatabasesPath(), dbName);
  return openDatabase(path, version: dbVersion, onCreate: crearEsquema);
}
