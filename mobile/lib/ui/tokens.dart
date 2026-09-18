/// Los mismos tokens visuales que la app web (src/styles/tokens.css), para
/// que las dos se sientan la misma app: colores de sistema de iOS y un
/// color propio por quincena.
library;

import 'package:flutter/material.dart';

class T {
  // Acentos de quincena
  static const q10 = Color(0xFF007AFF); // SystemBlue — quincena del 10
  static const q10Soft = Color(0xFFE5F0FF);
  static const q25 = Color(0xFFFF9500); // SystemOrange — quincena del 25
  static const q25Soft = Color(0xFFFFF3E0);

  // Semánticos
  static const positive = Color(0xFF34C759);
  static const danger = Color(0xFFFF3B30);
  static const committed = Color(0xFFAF52DE);

  // Superficies
  static const paper = Color(0xFFF2F2F7);
  static const surface = Color(0xFFFFFFFF);
  static const sunken = Color(0xFFE5E5EA);
  static const line = Color(0xFFE5E5EA);
  static const lineStrong = Color(0xFFC7C7CC);

  // Texto
  static const text = Color(0xFF000000);
  static const textMuted = Color(0xFF3C3C43);
  static const textFaint = Color(0xFF8E8E93);

  static const radiusS = 12.0;
  static const radiusM = 18.0;
  static const radiusL = 24.0;
}

const List<String> mesesEs = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

String nombreMes(int m) => (m >= 1 && m <= 12) ? mesesEs[m - 1] : '';
