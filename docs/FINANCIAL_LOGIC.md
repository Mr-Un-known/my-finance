# Lógica financiera — cómo se calcula cada número

Todo lo de aquí vive en `src/domain/`, como funciones puras de TypeScript
sin ninguna dependencia de React ni de la base de datos. Cada una tiene
sus tests junto al archivo (`*.test.ts`). Este documento explica el
**por qué** de cada regla; el código explica el cómo.

## El kernel de fechas (`domain/dates.ts`)

Todo lo demás depende de esto, así que empieza aquí. Dos reglas duras:

1. **El dinero es siempre un entero.** Nunca `float`. En pesos colombianos
   no hay centavos en la práctica, así que un `amount: number` siempre es
   pesos enteros.
2. **Las fechas de negocio son strings `'YYYY-MM-DD'`, nunca `Date` con
   hora.** Colombia es UTC-5 sin horario de verano; si guardáramos un
   `Date` con hora, una compra hecha a las 11pm del día 15 podría, según
   en qué zona horaria corra el código que la procese, calcularse como si
   fuera el día 16. Evitamos el problema entero trabajando siempre con la
   fecha "de calendario", sin hora.

Toda la aritmética de meses (`shiftMonth`, `daysInMonth`, `clampDay`) usa
`Date.UTC(...)` internamente — nunca métodos de `Date` con zona horaria
local — para que el resultado no dependa de en qué servidor o navegador
se ejecute.

## Ciclos de tarjeta de crédito (`domain/credit-card/cycle.ts`)

Regla, en tus palabras: si compras del 1 al 15, pagas el 2 del mes
siguiente al corte. Si compras del 16 al 31 (o al último día del mes),
pagas un mes después de eso.

**Por qué es genérico y no una tabla de fechas fijas:** `cutoffDay` y
`paymentDay` son parámetros, no constantes. El algoritmo:

1. Si el día de la compra es `<= cutoffDay` (clampeado al último día real
   del mes — así `cutoffDay=31` no revienta en febrero), el corte es este
   mes. Si no, es el mes siguiente.
2. El pago cae el `paymentDay` del mes **siguiente al corte** (también
   clampeado).

Esto resuelve solo, sin casos especiales, los cambios de año (una compra
el 31 de diciembre calcula correctamente un corte en enero del año
*siguiente*) y los años bisiestos (29 de febrero).

**Por qué se persiste (`cycleCutoffDate`, `cyclePaymentDate`) en vez de
calcularse al vuelo cada vez:** si más adelante cambias el día de corte
en Ajustes, las compras que ya hiciste no deben cambiar de fecha de
pago retroactivamente — ya la pagaste (o la vas a pagar) cuando el banco
te dijo, no cuando cambiaste una configuración meses después.

## Quincenas (`domain/quincena/quincena.ts`)

No son mitades del mes. Por defecto, la quincena del 10 va del día 10 al
24; la quincena del 25 va del día 25 al **9 del mes siguiente** — cruza
el cambio de mes. Esto se confirmó contra un caso real: el Arriendo,
pagado el 1 de octubre, aparece contablemente en la quincena del 25 de
*septiembre*, no en una quincena nueva de octubre.

`quincenaKey` en cada transacción es `null` por defecto (se calcula por
fecha) pero puede tener un valor explícito si el usuario decide mover un
movimiento a mano a la otra quincena — así la app no pelea contra cómo
alguien organiza su plata en casos borde.

## Restantes y sobrante (`domain/quincena/balance.ts`)

`restante = ingresos de la quincena − gastos de la quincena`. No filtra
por si ya están pagados — el estado "pagado/pendiente" es seguimiento
aparte, no cambia la matemática (igual que en una hoja de Excel, donde
el casillero de "Ready" no afecta la resta). Los movimientos cancelados
sí se excluyen: uno cancelado nunca debió contar.

`sobrante del mes = restante quincena 1 + restante quincena 2`.

## Disponible / Comprometido / Libre real (`domain/totals/available.ts`)

Los tres números del Dashboard:

- **Disponible** = ingresos ya pagados − gastos ya pagados. Lo que
  realmente ya pasó por tu cuenta.
- **Comprometido** = gastos pendientes + programados. Plata que ya no es
  tuya aunque técnicamente siga en el banco.
- **Libre real** = Disponible − Comprometido. Este es el número grande
  del Dashboard — no el saldo bancario, que puede mentir si tienes
  compromisos por pagar.

## Recurrentes: regla vs. instancia (`domain/recurring/expansion.ts`)

Una `RecurringRule` ("Arriendo, $2.500.000, mensual, día 1") es una
plantilla. `expandRecurringRule` la convierte en fechas concretas dentro
de un rango — es una función pura, no escribe nada.

Quien sí escribe es `data/local/materialize.ts`, que antes de crear una
instancia pregunta si ya existe una para esa combinación
`(recurringRuleId, periodKey)`. La protección real contra duplicados no
es esa pregunta — es el índice **único** en la base de datos
(`&[recurringRuleId+periodKey]` en Dexie; `unique(user_id,
recurring_rule_id, period_key)` en Postgres). Aunque el materializador
corriera diez veces por error, la base de datos rechazaría los
duplicados.

`periodKey` cambia según la frecuencia: `'YYYY-MM'` para mensual,
`'YYYY'` para anual, la fecha exacta para semanal/quincenal (donde no hay
un "período" natural más ancho que agrupe una sola ocurrencia).

## Presupuestos (`domain/budget/status.ts`)

Solo informan. `state` es `'ok'` por debajo del 80%, `'warning'` desde
80%, `'exceeded'` al pasarse — pero nunca hay un `if (excedido) bloquear
el gasto`. Ese fue un requisito explícito: la app avisa, no decide por
el usuario.

## Series para gráficos (`domain/analytics/series.ts`)

`monthlySeries` agrupa por el prefijo `'YYYY-MM'` de la fecha — un mes
sin ningún movimiento simplemente no genera un punto (no un punto en
cero), para no ensuciar el eje X de los gráficos con meses vacíos que
nadie pidió ver.

## Recordatorios (`domain/reminders/schedule.ts`)

`calculateReminderTime` resta los días configurados y fija la hora a las
9:00am hora de Colombia (14:00 UTC, sin horario de verano que complique
la resta). Ver `docs/NOTIFICATIONS.md` para cómo se dispara de ahí en
adelante.
