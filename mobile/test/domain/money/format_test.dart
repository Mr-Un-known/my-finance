import 'package:flutter_test/flutter_test.dart';
import 'package:my_finance/domain/money/format.dart';

void main() {
  setUp(() => setMoneyLocale('es-CO', 'COP'));

  group('formatMoney', () {
    test('usa formato colombiano con punto de miles', () {
      expect(formatMoney(2500000), r'$ 2.500.000');
    });

    test('no muestra decimales', () {
      expect(formatMoney(9900), r'$ 9.900');
      expect(formatMoney(175094), r'$ 175.094');
    });

    test('maneja cero y negativos', () {
      expect(formatMoney(0), r'$ 0');
      expect(formatMoney(-48000), r'-$ 48.000');
    });
  });

  group('parseMoney', () {
    test('acepta lo que el usuario realmente escribe', () {
      expect(parseMoney('85000'), 85000);
      expect(parseMoney('85.000'), 85000);
      expect(parseMoney(r'$ 85.000'), 85000);
      expect(parseMoney('1.500.000'), 1500000);
    });

    test('devuelve null cuando no hay número', () {
      expect(parseMoney(''), isNull);
      expect(parseMoney('abc'), isNull);
    });
  });

  group('formatCompact', () {
    test('abrevia millones y miles', () {
      expect(formatCompact(2500000), r'$ 2,5 M');
      expect(formatCompact(85000), r'$ 85 k');
    });
  });

  group('setMoneyLocale', () {
    test('cambia la moneda de todos los formatos', () {
      setMoneyLocale('es-ES', 'EUR');
      expect(formatMoney(2500), '2.500 €');
      expect(currencySymbol(), '€');
      expect(formatCompact(2500000), '€ 2,5 M');
    });

    test('acepta el locale con guion, como lo guarda la app web', () {
      setMoneyLocale('en-US', 'USD');
      expect(formatMoney(2500), r'$2,500');
    });

    // Los mismos ejemplos que muestra la configuración inicial de la app
    // web (src/domain/money/currencies.ts). Si cambian allá y no acá, las
    // dos apps le muestran al usuario la misma plata escrita distinto.
    test('coincide con los ejemplos de la app web', () {
      const esperados = {
        ('es-CO', 'COP', 2500000): r'$ 2.500.000',
        ('es-MX', 'MXN', 2500): r'$2,500',
        ('es-AR', 'ARS', 2500): r'$ 2.500',
        ('es-CL', 'CLP', 2500): r'$2.500',
        ('es-PE', 'PEN', 2500): 'S/ 2,500',
        ('en-US', 'USD', 2500): r'$2,500',
        ('es-ES', 'EUR', 2500): '2.500 €',
      };
      esperados.forEach((clave, esperado) {
        final (loc, cur, monto) = clave;
        setMoneyLocale(loc, cur);
        expect(formatMoney(monto), esperado, reason: '\$loc/\$cur');
      });
    });

    test('vuelve a colombiano al restaurar', () {
      setMoneyLocale('es-CO', 'COP');
      expect(formatMoney(2500000), r'$ 2.500.000');
    });
  });
}
