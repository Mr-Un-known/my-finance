# Changelog

## [0.2.0] — Fase 2: Lógica financiera + tests

### Agregado
- `domain/dates.ts`: kernel de fechas puro sobre epoch UTC (nunca `Date` local).
  Todo el resto del dominio pasa por aquí para sumar/restar meses y días sin
  bugs de zona horaria.
- `calculateCreditCardCycle(purchaseDate, cutoffDay, paymentDay)`: corte y
  pago de TC, genérico (no hardcodeado a 2026 ni a día 15/2). 15 tests,
  incluyendo los 10 casos exactos del enunciado, cambio de año y clamps.
- `calculateQuincena(date, startDays)`: quincena del 10 y del 25 (no mitades
  del mes), con la Q2 cruzando el cambio de mes. 12 tests, incluyendo el
  caso "Arriendo" (pagado el 1 de octubre, cae en la quincena del 25 de
  septiembre).
- `calculateQuincenaBalance` / `calculateMonthBalance`: restante por
  quincena y sobrante del mes. **Verificado con los números reales de tu
  Excel**: restante Q1 = $1.215.000, restante Q2 = $1.167.006, sobrante =
  $2.382.006.
- `calculateAvailableBalance`: disponible / comprometido / libre real.
- `expandRecurringRule`: separa regla de instancia para gastos recurrentes
  (mensual, semanal, quincenal, anual), con `periodKey` idempotente.
- `calculateBudgetStatus`: informa (ok / warning / exceeded), nunca bloquea.

### Verificado en este entorno
- `npm test` → 64/64 tests pasando.
- `npm run typecheck` → sin errores.
- `npm run lint` → sin errores.
- `npm run build` → build de producción exitoso.

### Corregido
- Un bug en el TEST de `calculateCreditCardCycle` (no en la lógica): la
  expectativa asumía que el pago cae en el mismo mes del corte; en realidad
  cae el mes siguiente. Detectado al correr la suite de verdad.
- Un error de tipos en `parseISO` bajo `noUncheckedIndexedAccess`.

## [0.3.0] — Fases 3 a 12: MVP completo, local-first

### Fase 3 — Movimientos
- CRUD completo de transacciones sobre IndexedDB (crear/editar/eliminar/duplicar).
- Formulario rápido de 4 campos (concepto, valor, categoría, método de pago;
  fecha=hoy por defecto), con preview de "se paga el X" al elegir tarjeta de
  crédito, antes de guardar.
- Lista agrupada por quincena (`groupByQuincena`), con toggle de
  pagado/pendiente de un toque.
- Datos de ejemplo cargables desde el estado vacío (montos ficticios,
  nunca los reales del usuario).

### Fase 4 — Dashboard
- Libre real / Disponible / Comprometido, las dos quincenas, sobrante del
  mes, chips de pendientes/programados/TC, y próximos pagos — todo desde
  `domain/`, sin cálculos en los componentes.

### Fase 5 — Categorías
- CRUD con ícono y color, gasto por categoría del mes visible en la lista.

### Fase 6 — Ingresos
- Cubierto por el toggle Gasto/Ingreso del formulario de la Fase 3; los
  recurrentes se resuelven en la Fase 7.

### Fase 7 — Recurrentes
- CRUD de reglas (gastos fijos e ingresos recurrentes) separadas de sus
  instancias. `materializeRecurringRules` genera las instancias futuras al
  abrir la app y al guardar una regla, sin duplicar nunca (protegido por el
  índice único de la Fase 1).

### Fase 8 — Tarjeta de crédito híbrida
- Cada compra individual, con su propio día de pago, y el total agregado
  por ciclo (`groupByCycle`) — el equivalente calculado de "Pago compras TC".

### Fase 9 — Calendario
- Grilla mensual con indicadores de ingreso/gasto/pago de TC por día,
  detalle del día seleccionado.

### Fase 10 — Presupuestos
- Por categoría y mes. Solo informa (ok/warning/exceeded), nunca bloquea.

### Fase 11 — Análisis
- Ingresos vs. gastos (mes/trimestre/año), gasto por categoría, fijos vs.
  variables, débito vs. TC. Recharts separado en su propio chunk
  (`React.lazy`) para no inflar la carga inicial.

### Fase 12 — PWA + iPhone + datos
- Manifest, service worker (`vite-plugin-pwa`), íconos generados (192,
  512, maskable, apple-touch-icon), meta tags de iOS.
- Banner que detecta Safari/iOS sin instalar y explica cómo agregarla a
  inicio (necesario para que las notificaciones de la Fase 14 puedan
  funcionar).
- Exportar JSON completo y CSV de movimientos. Importar backup con
  validación Zod + pantalla de confirmación antes de reemplazar datos.
- Ajustes completamente editable: moneda, formato, quincenas, corte/pago
  de TC, días de recordatorio.

### Verificado en este entorno
- 91/91 tests, typecheck limpio, lint limpio, build de producción exitoso
  (con code-splitting: bundle inicial ~150kB gzip, Análisis aparte).

## [0.4.0] — Fases 15 a 17: E2E, deployment y documentación final

### Fase 15 — Testing E2E
- 8 flujos con Playwright (crear/editar/eliminar gasto, gasto con TC +
  ver su fecha de pago, gasto recurrente, ingreso, dashboard), corriendo
  en Chromium y en emulación de iPhone Safari — 16 tests en total.
- `tsconfig.e2e.json` propio: `playwright test --list` no hace typecheck
  real: sin este archivo, `e2e/` nunca pasaba por TypeScript en modo
  estricto.
- Cableado a CI (`.github/workflows/ci.yml`): instala Chromium y corre
  los E2E contra un build de producción real en cada push.
- **Limitación honesta de este entorno de desarrollo:** no pude ejecutar
  estos tests yo mismo — el binario de Chromium se descarga desde
  `cdn.playwright.dev`, fuera de la lista blanca de red del sandbox.
  Quedaron verificados por typecheck real y por `--list`, y correrán de
  verdad en GitHub Actions.

### Fase 16 — Deployment
- `DEPLOYMENT.md`: guía completa de cero — clonar, subir a GitHub,
  activar Pages, configurar Supabase (opcional), instalar en iPhone,
  actualizar, solución de problemas comunes.

### Fase 17 — Documentación final
- `docs/USER_MANUAL.md`, `docs/FINANCIAL_LOGIC.md`,
  `docs/NOTIFICATIONS.md`, `docs/TESTING.md`, `CONTRIBUTING.md` — todos
  nuevos. `docs/ARCHITECTURE.md` y `README.md` reescritos con el estado
  final del proyecto.
- Comando de generación de llaves VAPID (`npx web-push
  generate-vapid-keys`) verificado corriendo de verdad en este entorno,
  no solo documentado de memoria.

### Verificado en este entorno (estado final)
- 104/104 tests unitarios, typecheck limpio (`src/` y `e2e/` por
  separado), lint limpio, build de producción exitoso.
- Bundle inicial para un usuario 100% local: ~59kB gzip (Recharts y
  Supabase-js code-split, cargados solo si se usan).
