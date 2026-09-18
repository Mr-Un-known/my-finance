# Testing

## Tests unitarios (Vitest)

```bash
npm run test        # corre todo una vez
npm run test:watch  # modo interactivo
```

123 tests, todos sobre `src/domain/` y la lógica de agrupación de
`src/features/*/` — funciones puras, sin necesidad de un navegador ni
una base de datos real. Cubren, entre otras cosas:

- Los 10 casos exactos de ciclos de tarjeta de crédito pedidos
  originalmente (14/15/16/31 de enero, cambios de mes, año bisiesto,
  cambio de año), más un test de propiedad que verifica el invariante
  ("el pago siempre es posterior al corte") sobre 400 fechas consecutivas.
- Quincenas: límites exactos (día 9, 10, 24, 25), cruces de mes y de año,
  configuraciones no estándar.
- El restante de cada quincena y el sobrante del mes, verificados contra
  las cifras reales de la hoja de Excel original del usuario.
- Recurrencia: las 4 frecuencias, respeto de fecha de inicio/fin,
  idempotencia, clampeo de días en meses cortos.
- Los mappers de Supabase (dominio ↔ fila de Postgres), por round-trip.

## Tests E2E (Playwright)

```bash
npx playwright install chromium   # una sola vez
npm run test:e2e
```

8 flujos, cada uno en Chromium y en emulación de iPhone Safari (16 tests
en total):

1. Crear un gasto
2. Editarlo
3. Eliminarlo
4. Crear un gasto con tarjeta de crédito (y ver el preview de fecha antes
   de guardar)
5. Ver la fecha de pago en la pantalla de Tarjeta
6. Crear un gasto recurrente y confirmar que se materializa
7. Crear un ingreso
8. Ver el Dashboard con datos de ejemplo

Corren contra un build de producción real (`npm run build && npm run
preview`), no contra el servidor de desarrollo — más cercano a lo que de
verdad se despliega.

## Qué NO está cubierto (a propósito)

- La Edge Function de notificaciones (`supabase/functions/send-reminders`)
  no tiene tests automatizados — se prueba con el `curl` documentado en
  `docs/NOTIFICATIONS.md`. Automatizarla requeriría un entorno Deno +
  Supabase local corriendo en CI, que no vale la complejidad para una
  función de ~100 líneas.
- No hay tests de integración contra un Supabase real — los mappers
  (que es donde vive el riesgo real de bugs de este tipo de código) sí
  están probados; las llamadas de red del repositorio no se simulan con
  mocks falsos, siguiendo el principio de no fingir cobertura que no
  existe.

## CI

`.github/workflows/ci.yml` corre, en cada push y PR: typecheck (de
`src/` y de `e2e/` por separado), lint, tests unitarios, build, y los
tests E2E completos con Chromium.
