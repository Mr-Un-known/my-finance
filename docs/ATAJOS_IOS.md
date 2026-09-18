# Automatizar con Atajos de iOS

Cómo meter gastos e ingresos desde el iPhone sin abrir la app y navegar
hasta el formulario.

> **Antes de empezar: ten cuenta creada.** iOS no sabe abrir una URL
> dentro de una web app instalada, así que el Atajo siempre abre Safari.
> Safari y la app instalada tienen almacenamientos separados, de modo que
> sin cuenta el gasto que registras desde el Atajo no aparece en la app.
> Con cuenta, los dos lados sincronizan solos. Ver [CUENTA.md](CUENTA.md).

> **Ojo con la URL:** el usuario es `mr-un-known` (con la "n" final).
> Sin ella el enlace da "Site not found".

---

## La forma corta: mandarle la frase y que la app entienda

```
https://mr-un-known.github.io/my-finance/movimientos?texto=TU%20FRASE
```

La app interpreta español: saca el monto, la fecha, el método de pago y
el concepto, y propone categoría. No hace falta que el Atajo arme nada.

| Le mandas | Entiende |
|---|---|
| `gasté 45 mil en el almuerzo` | Gasto, $45.000, Almuerzo, hoy, Alimentación |
| `pagué 120 mil de mercado con la tarjeta` | Gasto, $120.000, Mercado, Tarjeta de crédito |
| `me llegaron 2 millones de nómina` | Ingreso, $2.000.000, Nómina |
| `gasté 20 mil en uber ayer` | Gasto, $20.000, Uber, ayer, Transporte |
| `cuarenta y cinco mil en cine` | Gasto, $45.000, Cine, Entretenimiento |

Entiende montos como los dice la gente: `45000`, `45.000`, `45 mil`,
`45k`, `45 lucas`, `cuarenta y cinco mil`, `1.2 millones`,
`dos millones y medio`.

**Y aprende.** Si corriges la categoría una vez, la próxima vez que
menciones ese mismo concepto ya sale bien — sale de tu historial, no de
una lista fija.

---

## La forma larga: campo por campo

Si prefieres que el Atajo arme cada dato:

```
https://mr-un-known.github.io/my-finance/movimientos?nuevo=1&tipo=ingreso
```

| Parámetro   | Qué hace                                   | Valores                  |
|-------------|--------------------------------------------|--------------------------|
| `nuevo=1`   | Abre el formulario vacío.                   | `1`                      |
| `tipo`      | Si no lo pones, gasto.                      | `ingreso` \| `gasto`     |
| `monto`     | Opcional. Solo dígitos.                     | `3000000`                |
| `concepto`  | Opcional, codificado para URL.              | `Sueldo`, `Mercado%20D1` |
| `fecha`     | Opcional. Si no la pones, hoy.              | `2026-09-18`             |
| `pagado=1`  | Lo marca como ya recibido / ya pagado.      | `1`                      |

**El enlace de arriba no lleva monto a propósito**: el Atajo lo pega al
final. Si prefieres que la app pregunte, no mandes `monto` y el
formulario se abre listo para escribirlo.

> El formulario se abre lleno y tú tocas **Guardar**. Ese toque es a
> propósito: un Atajo que lee un SMS del banco puede sacar mal el monto, y
> un registro de plata escrito sin que nadie lo mire es peor que teclearlo.

---

## Atajo 1 — Dictar un gasto

El más útil, y son tres pasos:

1. **Atajos** → **+**.
2. Agrega **Dictar texto** (Idioma: Español).
3. Agrega **Texto** y pega, poniendo la variable de *Texto dictado* al final:

   ```
   https://mr-un-known.github.io/my-finance/movimientos?texto=[Texto dictado]
   ```

4. Agrega **Abrir URLs** con ese texto.
5. Nómbralo **Anotar gasto**.

Ahora dices *"Oye Siri, anotar gasto"*, hablas normal, y la app abre el
formulario ya lleno.

También funciona desde el widget de Atajos o con el **Toque en la parte
trasera** (Ajustes → Accesibilidad → Tocar → Toque en la parte trasera).

> Dentro de la app también puedes hablar: el botón **+** → **Contarle a la
> app** tiene micrófono. Ahí no hace falta Atajos.

---

## Atajo 2 — Desde el SMS del banco

**Lo que iOS sí permite y lo que no.** Ninguna app puede leer tus mensajes:
iOS no lo expone, ni a las apps ni a los Atajos. Lo único posible es una
**automatización que se dispara cuando llega un mensaje** y recibe ese
mensaje. Es automático a partir de ahí, pero el disparador es la llegada
del SMS, no una app leyendo tu bandeja.

1. Atajos → pestaña **Automatización** → **+** → **Mensaje**.
2. **Remitente**: el número o nombre corto de tu banco.
   **Contiene**: una palabra que salga siempre (`Compra`, `Pagaste`,
   `Recibiste`).
3. Acciones:
   - **Obtener texto del input** (el cuerpo del mensaje).
   - **Texto**:

     ```
     https://mr-un-known.github.io/my-finance/movimientos?texto=[Texto]
     ```

   - **Abrir URLs**.
4. Activa **Ejecutar inmediatamente**.

Eso es todo. **No hace falta ninguna expresión regular**: le pasas el SMS
crudo y la app lo interpreta. Ya reconoce las formas típicas:

```
Bancolombia le informa Compra por $145.000 en EXITO 18/09/2026 14:32
Nequi: Pagaste $12.500 a RAPPI
Bancolombia: Recibiste $2.800.000 por NOMINA
```

Saca el monto, el comercio, la fecha del mensaje, y si fue compra o abono.
El nombre del banco no queda como concepto.

Si tu banco usa un formato que no reconoce, mándame un mensaje de ejemplo
(sin datos de cuenta) y lo agrego.

---

## Atajo 3 — Gasto fijo de un toque

Para lo que gastas siempre igual:

```
https://mr-un-known.github.io/my-finance/movimientos?texto=pasaje%2012%20mil
```

Un solo paso **Abrir URLs**. Ponlo como widget y es un toque.

---

## Por qué no usa inteligencia artificial

La interpretación corre **en tu teléfono, sin conexión y sin costo**. No
hay modelo de lenguaje ni llamada a ninguna API.

Es a propósito: para plata, una interpretación que puede cambiar sola
entre dos ejecuciones no es lo que uno quiere. Y la clave de una API no
puede vivir en el código de una web pública sin quedar expuesta.

Lo que la app aprende, lo aprende de **tu** historial: cada vez que
guardas, recuerda qué categoría y qué método le pusiste a ese concepto.

Si algún día la lista de frases se queda corta, el camino sería una Edge
Function de Supabase que hable con un modelo — la clave queda del lado del
servidor. Tiene costo por uso y necesita internet; por eso no es el
arranque.
