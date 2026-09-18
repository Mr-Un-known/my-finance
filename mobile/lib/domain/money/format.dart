/// Formato de plata. Por defecto colombiano ($ 2.500.000, punto de miles,
/// sin decimales), pero la moneda y el locale los elige el usuario.
///
/// El default es una variable de módulo, no un parámetro obligatorio, a
/// propósito: hay decenas de call sites en la UI y ninguno tiene por qué
/// cargar con el Settings. La app la fija una vez al arrancar.
///
/// NO usa NumberFormat.currency. Motivo: la app web formatea la misma plata
/// del mismo usuario, y los datos CLDR de Dart no son los mismos que los del
/// navegador — es-PE agrupa con punto acá y con coma allá, es-CO pone el
/// símbolo después ("2.500.000 $") mientras el navegador lo pone antes, y
/// es-ES no agrupa números de 4 dígitos allá pero sí acá. La tabla de abajo
/// está duplicada, idéntica, en src/domain/money/format.ts, y los dos tests
/// la verifican: es la única forma de que las dos apps escriban la misma
/// cifra igual.
library;

class MonedaFormato {
  const MonedaFormato(this.simbolo, {required this.miles, this.sufijo = false, this.espacio = true});

  final String simbolo;

  /// true = el símbolo va después ("2.500 €").
  final bool sufijo;

  /// ¿espacio entre símbolo y número?
  final bool espacio;

  /// Separador de miles.
  final String miles;
}

const Map<String, MonedaFormato> _formatos = {
  'COP': MonedaFormato(r'$', miles: '.'),
  'MXN': MonedaFormato(r'$', miles: ',', espacio: false),
  'ARS': MonedaFormato(r'$', miles: '.'),
  'CLP': MonedaFormato(r'$', miles: '.', espacio: false),
  'PEN': MonedaFormato('S/', miles: ','),
  'USD': MonedaFormato(r'$', miles: ',', espacio: false),
  'EUR': MonedaFormato('€', miles: '.', sufijo: true),
};

String _localeActual = 'es_CO';
String _monedaActual = 'COP';

/// La fija la app cuando cargan los Settings. Sin llamarla, queda en COP.
/// Acepta tanto 'es-CO' (como lo guarda la app web) como 'es_CO'.
void setMoneyLocale(String locale, String currency) {
  _localeActual = locale.replaceAll('-', '_');
  _monedaActual = currency;
}

String get monedaActual => _monedaActual;
String get localeActual => _localeActual;

MonedaFormato _formatoDe(String currency) => _formatos[currency] ?? MonedaFormato(currency, miles: '.');

/// Agrupa de a tres desde la derecha. Determinístico, sin depender de CLDR.
String _agrupar(int n, String separador) {
  final s = n.toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(separador);
    buf.write(s[i]);
  }
  return buf.toString();
}

/// El locale no es parámetro: con la tabla de arriba, el formato lo decide
/// la moneda sola. Se sigue guardando en Settings porque lo usan las fechas.
String formatMoney(int amount, {String? currency}) {
  final f = _formatoDe(currency ?? _monedaActual);
  final signo = amount < 0 ? '-' : '';
  final cuerpo = _agrupar(amount.abs(), f.miles);
  final sep = f.espacio ? ' ' : '';
  return f.sufijo ? '$signo$cuerpo$sep${f.simbolo}' : '$signo${f.simbolo}$sep$cuerpo';
}

/// Solo el símbolo de la moneda activa, para ejes y etiquetas cortas.
String currencySymbol() => _formatoDe(_monedaActual).simbolo;

/// Versión compacta para gráficos: $ 2,5 M
String formatCompact(int amount) {
  final abs = amount.abs();
  final signo = amount < 0 ? '-' : '';
  final sym = currencySymbol();
  if (abs >= 1000000) {
    final millones = (abs / 1000000).toStringAsFixed(1).replaceAll('.', ',');
    return '$signo$sym $millones M';
  }
  if (abs >= 1000) return '$signo$sym ${(abs / 1000).round()} k';
  return '$signo$sym $abs';
}

/// Acepta lo que el usuario escriba: '85000', '85.000', '$ 85.000', '85,000'.
/// Devuelve null si no hay un número válido.
int? parseMoney(String input) {
  final limpio = input.replaceAll(RegExp(r'[^\d-]'), '');
  if (limpio.isEmpty || limpio == '-') return null;
  return int.tryParse(limpio);
}
