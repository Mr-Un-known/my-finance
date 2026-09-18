# Automatizar con Atajos de iOS

Esto es lo que faltaba: cómo meter un ingreso (o un gasto) desde el iPhone
sin abrir la app y navegar hasta el formulario.

La app acepta que le abran el formulario **ya lleno** desde una URL. Los
Atajos de iOS saben abrir URLs. Con eso alcanza — no hace falta nada más.

> **Antes de empezar: ten cuenta creada.** iOS no sabe abrir una URL
> dentro de una web app instalada, así que el Atajo siempre abre Safari.
> Safari y la app instalada tienen almacenamientos separados, de modo que
> sin cuenta el gasto que registras desde el Atajo no aparece en la app.
> Con cuenta, los dos lados sincronizan solos. Ver [CUENTA.md](CUENTA.md).

> **Ojo con la URL:** el usuario es `mr-un-known` (con la "n" final).
> Sin ella el enlace da "Site not found".

---

## La URL

```
https://mr-un-known.github.io/my-finance/movimientos?nuevo=1&tipo=ingreso&monto=3000000&concepto=Sueldo&pagado=1
```

| Parámetro   | Qué hace                                        | Valores                       |
|-------------|-------------------------------------------------|-------------------------------|
| `nuevo=1`   | Obligatorio. Abre el formulario.                 | `1`                           |
| `tipo`      | Ingreso o gasto. Si no lo pones, gasto.          | `ingreso` \| `gasto`          |
| `monto`     | Valor en pesos, solo dígitos.                    | `3000000`                     |
| `concepto`  | Texto del movimiento (codificado para URL).      | `Sueldo`, `Mercado%20D1`      |
| `fecha`     | Si no la pones, hoy.                             | `2026-09-18`                  |
| `pagado=1`  | Lo marca como ya recibido / ya pagado.           | `1`                           |

Si instalaste la app en la pantalla de inicio ("Compartir → Agregar a
inicio"), la URL abre **la app instalada**, no Safari.

> El formulario se abre lleno y vos tocás **Guardar**. Ese toque es a
> propósito: un Atajo que lee un SMS del banco puede sacar mal el monto, y
> un registro de plata escrito sin que nadie lo mire es peor que teclearlo.

---

## Atajo 1 — "Registrar ingreso" (manual, el más útil)

1. Abre **Atajos** → **+** (arriba a la derecha).
2. Agrega **Pedir entrada**
   - Pregunta: `¿Cuánto entró?`
   - Tipo: **Número**
3. Agrega otra **Pedir entrada**
   - Pregunta: `¿De qué?`
   - Tipo: **Texto**
4. Agrega **Texto** y pega esto, reemplazando los espacios reservados por
   las variables mágicas de los pasos 2 y 3:

   ```
   https://mr-un-known.github.io/my-finance/movimientos?nuevo=1&tipo=ingreso&pagado=1&monto=[Entrada número]&concepto=[Entrada texto]
   ```

   (Toca el campo → **Seleccionar variable** → elige la salida de cada
   "Pedir entrada".)
5. Agrega **Abrir URLs** y pásale el texto del paso 4.
6. Renómbralo **Registrar ingreso** y ponle un ícono.

Ahora funciona desde: Siri ("Oye Siri, registrar ingreso"), el widget de
Atajos en la pantalla de inicio, o el **Toque en la parte trasera**
(Ajustes → Accesibilidad → Tocar → Toque en la parte trasera).

---

## Atajo 2 — Automatización el día de pago

Para que te lo pregunte solo, los días 10 y 25:

1. Atajos → pestaña **Automatización** → **+** → **Hora del día**.
2. Hora: la que quieras. Repetir: **Mensualmente**, día **10**.
3. Acción: **Ejecutar atajo** → *Registrar ingreso*.
4. Desactiva **Preguntar antes de ejecutar** si quieres que salte solo.
5. Repite para el día 25.

---

## Atajo 3 — Desde la notificación del banco

Esto es lo más cercano a "que se agregue solo". iOS puede disparar un
atajo cuando llega un mensaje:

1. Automatización → **+** → **Mensaje**.
2. **Remitente**: el número o nombre corto de tu banco.
   **Contiene**: una palabra que salga siempre, p. ej. `abono` o
   `transferencia`.
3. Acciones:
   - **Obtener texto del input** (el cuerpo del mensaje).
   - **Buscar coincidencias en texto** con este patrón, que saca el monto:

     ```
     \$\s?([\d.,]+)
     ```

   - **Reemplazar texto**: busca `[.,]` reemplaza por vacío → deja solo
     dígitos.
   - **Texto**: la URL del Atajo 1, usando esa salida como `monto` y un
     `concepto` fijo (`Abono`).
   - **Abrir URLs**.
4. En **Ejecutar inmediatamente**, actívalo.

Se abre la app con el monto ya puesto; tocás Guardar y listo.

> Ojo: el patrón de arriba asume el formato `$ 1.234.567`. Abre un mensaje
> real de tu banco y ajusta la expresión si el formato es otro.

---

## Atajo 4 — Gasto rápido con un monto fijo

Para lo que gastás siempre igual (pasaje, almuerzo):

```
https://mr-un-known.github.io/my-finance/movimientos?nuevo=1&monto=12000&concepto=Pasaje&pagado=1
```

Un solo paso **Abrir URLs**. Ponelo como widget y es un toque.
