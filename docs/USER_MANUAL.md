# Manual de usuario

## Inicio (Dashboard)

Lo primero que ves. Cuatro cosas, de arriba a abajo:

- **Libre real** — el número grande. Es lo que de verdad te queda,
  restando lo que ya está comprometido (pendientes + programados), no
  solo lo que ves en el saldo del banco.
- **Las dos quincenas** — cuánto te queda en la del 10 y en la del 25.
- **Sobrante del mes** — la suma de las dos.
- **Próximos pagos** — lo que se acerca, ordenado por fecha (para
  tarjeta de crédito, por la fecha en que realmente se paga, no por
  cuándo compraste).

## Agregar un movimiento

Toca el botón **+** (siempre visible, abajo al centro) desde cualquier
pantalla. Cuatro campos:

1. **Concepto** — qué es.
2. **Valor** — cuánto. Puedes escribir con o sin puntos (`85000` o
   `85.000`, da igual).
3. **Categoría** — toca un ícono.
4. **Método de pago** — Débito o Tarjeta de crédito. Si eliges tarjeta,
   la app te muestra de inmediato "Se paga el [fecha]" antes de guardar.

La fecha es hoy por defecto (la puedes cambiar). Hay un interruptor
"Ya está pagado" — si lo dejas apagado, el movimiento queda pendiente
(así es como arrancan casi todos en la hoja de Excel original).

## Movimientos

La lista completa, agrupada por quincena — igual que la organizabas en
Excel. Cada quincena muestra su restante al final. Toca el ✓ de la
izquierda de cualquier fila para marcarla pagada o pendiente sin abrir
nada. Toca la fila completa para editarla, duplicarla o eliminarla.

## Tarjeta de crédito

Accesible desde el chip "En TC" del Dashboard. Cada compra aparece
individual, con su propia fecha de pago — y agrupadas, ves el total que
se paga en cada ciclo (el equivalente calculado a lo que antes escribías
a mano como "Pago compras TC").

## Calendario

Cada día con algo muestra un punto: verde si hay ingreso, gris si hay
gasto, ocre si ese día se paga algo de tarjeta de crédito. Toca cualquier
día para ver el detalle abajo.

## Recurrentes

Desde Ajustes → Recurrentes. Configura una vez ("Arriendo, $2.500.000,
mensual, día 1") y la app genera sola las instancias de cada mes — sin
que tengas que volver a escribirlo ni riesgo de que se duplique.

## Presupuestos

Desde Ajustes → Presupuestos. Ponle un tope mensual a una categoría y
verás una barra de progreso. Se pone ocre cerca del límite y roja si te
pasas — pero nunca te bloquea para seguir registrando gastos.

## Análisis

Gráficos de ingresos vs. gastos (mes/trimestre/año), gasto por categoría,
fijos vs. variables, y débito vs. tarjeta de crédito.

## Ajustes

- **Tema** — claro, oscuro, o el de tu sistema.
- **Moneda y quincenas** — cambia los días en que arrancan tus quincenas
  si no son el 10 y el 25.
- **Tarjeta de crédito** — día de corte y de pago. Solo afecta compras
  nuevas; las que ya hiciste conservan su fecha original.
- **Categorías** — crea, edita o archiva las tuyas.
- **Tus datos** — exporta todo en JSON (para respaldo completo) o tus
  movimientos en CSV (para abrir en Excel). Importar reemplaza *todos*
  tus datos actuales — te lo confirma antes de hacerlo, y no se puede
  deshacer.
- **Nube** (si se configuró Supabase) — sube o baja tus datos como
  respaldo, o cierra sesión.
- **Recordatorios** (si se configuró Supabase + notificaciones) — activa
  avisos para tus pagos pendientes. Solo funciona si instalaste la app en
  tu pantalla de inicio, no en una pestaña normal de Safari.

## Instalar en tu iPhone

Safari → botón de Compartir → "Agregar a inicio". Ver
`docs/DEPLOYMENT.md` para el detalle completo si estás desplegando la
app por primera vez.
