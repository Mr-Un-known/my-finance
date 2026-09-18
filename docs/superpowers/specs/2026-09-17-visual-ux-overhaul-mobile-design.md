# Visual & UX Overhaul (Mobile) — Design Spec

**Fecha:** 2026-09-17
**Sub-proyecto:** A (de 3: A visual/UX mobile, B desktop, C Shortcuts, D Excel/Sheets sync)
**Estado:** Aprobado por el usuario — pendiente de plan de implementación
**Enfoque:** Incremental por fases (cada fase ship independiente)

---

## Objetivo

Modernizar la app manteniendo toda la funcionalidad actual, con:

1. Lenguaje visual iOS 18 nativo (SF Pro, materiales translúcidos, spring motion, colores del sistema).
2. Flow de crear gasto/ingreso reducido de ~10 interacciones a 2-3 (repetido) / 4-5 (nuevo).
3. Inferencia autónoma de categoría/método basada en historial (estilo Copilot Money).
4. Jerarquía de información clara: hero = "Sobrante del mes" (matches la mental model del usuario), lo demás por scroll.
5. Análisis con visualizaciones más ricas (barras stacked por categoría, pie clickable con detalle).
6. Etiquetado claro y sin ambigüedad (Ingresos vs Gastos distinguidos visualmente en toda la app; consolidar "Pendientes/Programados/En TC" en un único chip "Por pagar" con desglose al tap).

## Contexto — bugs ya resueltos por hotfix (2026-09-17)

Los siguientes 3 issues del usuario fueron atendidos por commit `1bf51c7` antes de escribir este spec, por lo que NO entran en este spec:

- **Libre real mostrando negativo confuso**: hero cambiado a `Sobrante del mes` (`ingresos - gastos totales sin filtrar por status`). Libre real removido temporalmente; regresa en Fase 4 con etiqueta clara.
- **Ingresos apareciendo en "Próximos pagos"**: `selectUpcoming` ahora filtra `type === 'expense'`.
- **FAB "+" bloqueando modales**: CSS `body:has([role="dialog"])` esconde el FAB cuando hay diálogo abierto (requiere iOS 15.4+, que es baseline).

## Alcance del spec

**Incluido:**
- Nuevo sistema de tokens de diseño (`tokens.css` v2).
- Rediseño de Chrome (TabBar, headers de pantalla).
- Rediseño de `TransactionForm` con keypad in-app + smart-fill autónomo.
- Rediseño de Dashboard (con hero Sobrante, quincenas refinadas, chips consolidados, próximos con distinción visual ingreso/gasto).
- Rediseño de pantallas secundarias: Movimientos, Calendario, Tarjeta, Análisis, Ajustes.
- Motion system y feedback háptico donde aplique.

**Excluido (sub-proyectos separados):**
- Layout desktop (sub-proyecto B).
- Integración iOS Shortcuts (sub-proyecto C).
- Export xlsx/csv (sub-proyecto D) — solo agregamos el placeholder de "Exportar" en Ajustes; la implementación va en D.

## Direcciones de diseño aprobadas

| Decisión | Valor |
|---|---|
| Estilo visual | iOS 18 nativo (SF Pro, materiales, springs) |
| Flow prioritario a optimizar | Crear gasto/ingreso |
| Nivel de auto-completado | Autónomo (aprende del historial, no pregunta) |
| Densidad del Dashboard | Hero + 2 quincenas above-fold; resto por scroll |
| Enfoque de ejecución | Incremental por fases |
| Nav pattern | 5 tabs actuales (no consolidar Calendario en Movimientos) |
| Motion | Springs iOS con `--ease-spring-out`, respeta `prefers-reduced-motion` |
| Analytics | Barras stacked por categoría; pie clickable con detalle |

---

## Arquitectura por Fases

Cada fase es un PR/commit independiente que shippa a producción. El orden minimiza pantallas con mezcla de estilos "viejo" y "nuevo".

### Fase 1 — Design tokens v2

**Objetivo:** reemplazar `src/styles/tokens.css` con el sistema iOS 18. Todas las pantallas actuales adoptan automáticamente los nuevos valores porque usan `var(--x)`. Cambios "invisibles" pero foundational.

**Cambios:**

- **Tipografía**:
  - `--font-ui: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif` (SF Pro Text nativo en iOS; system fallback en desktop web hasta sub-proyecto B).
  - `--font-figures: 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, sans-serif` (números en Rounded, matches iOS Wallet/Health).
  - Escala tipográfica de 8 pasos alineada a iOS text styles: `--text-xs 12px · --text-sm 13px · --text-base 15px · --text-md 17px · --text-lg 20px · --text-xl 24px · --text-2xl 34px · --text-3xl 44px`.
  - Line-heights consistentes: `--lh-tight 1.15`, `--lh-normal 1.4`, `--lh-loose 1.55`.

- **Colores** (matching iOS SystemColors, ambos light/dark):
  - Acentos actuales quincena mapean a iOS: `--q10: #007AFF` (SystemBlue), `--q25: #FF9500` (SystemOrange). Mantiene identidad "cada quincena su color" con valores más vibrantes/familiares.
  - `--positive: #34C759` (SystemGreen), `--danger: #FF3B30` (SystemRed), `--committed: #AF52DE` (SystemPurple), `--warning: #FFCC00` (SystemYellow).
  - Escala de grises iOS: `--gray-50 #F2F2F7 · --gray-100 #E5E5EA · --gray-200 #D1D1D6 · --gray-300 #C7C7CC · --gray-400 #AEAEB2 · --gray-500 #8E8E93 · --gray-600 #636366 · --gray-700 #48484A · --gray-800 #3A3A3C · --gray-900 #2C2C2E · --gray-950 #1C1C1E`.
  - `--paper`, `--surface`, `--surface-sunken`, `--text`, `--text-muted`, `--text-faint`, `--line`, `--line-strong` referencian la escala de grises con semántica.
  - Dark mode: valores oficiales de iOS Dark. `--paper #000`, `--surface #1C1C1E`, `--surface-sunken #2C2C2E`, texto invertido.

- **Materiales** (nuevo):
  - `--material-thin: color-mix(in srgb, var(--surface) 72%, transparent)` con `backdrop-filter: blur(20px) saturate(180%)`.
  - `--material-regular: color-mix(in srgb, var(--surface) 90%, transparent)` con blur más denso.
  - Uso: TabBar y modals usarán estos como fondo.

- **Motion** (nuevo):
  - `--ease-spring-out: cubic-bezier(0.22, 1, 0.36, 1)` (aproxima el spring de iOS).
  - `--ease-spring-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
  - `--dur-fast: 120ms · --dur-med: 240ms · --dur-slow: 360ms`.
  - Todo respeta `@media (prefers-reduced-motion: reduce)` (ya existe una regla que reduce todo a 0.01ms; se mantiene).

- **Radios** (levemente más grandes):
  - `--radius-s: 12px (era 10) · --radius-m: 18px (era 16) · --radius-l: 24px (era 22) · --radius-xl: 32px (nuevo)`.

- **Elevación** (nuevo):
  - `--shadow-1: 0 1px 2px rgba(0,0,0,.04), 0 1px 4px rgba(0,0,0,.03)` (rows, chips).
  - `--shadow-2: 0 2px 8px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)` (cards elevadas).
  - `--shadow-3: 0 6px 20px rgba(0,0,0,.10)` (FAB, dialogs).
  - Dark mode: sombras se atenúan o se reemplazan por bordes más brillantes.

- **Spacing**: se mantiene la escala actual (`--gap-xs .25rem · --gap-s .5rem · --gap-m .875rem · --gap-l 1.25rem · --gap-xl 2rem`). Es 8pt-ish y funciona.

**Testing:** todos los tests unitarios y E2E deben seguir verdes sin cambios (tokens no afectan lógica; textos siguen ahí).

**Riesgo:** ninguno funcional. Estética general de la app cambia (mejor), algunas pantallas pueden verse desalineadas hasta la Fase 5.

### Fase 2 — Chrome: TabBar + Screen headers

**Objetivo:** renovar el chrome (tab bar + headers) al lenguaje iOS 18.

**TabBar (`src/components/ui/TabBar.tsx`):**

- Fondo: `--material-thin` con `backdrop-filter` real (reemplaza el `color-mix` actual).
- 5 tabs se mantienen: Inicio, Movimientos, Calendario, Análisis, Ajustes.
- Íconos redibujados en estilo SF Symbols (líneas 1.5px, terminaciones redondeadas, consistencia de peso). Reemplazan los paths actuales.
- Tap del tab activo → scroll to top de la pantalla actual (patrón iOS). Usa `useLayoutEffect` con ref a `<Screen>`.
- **FAB (+)**:
  - Posición: `bottom: calc(100% + 12px)` (ya arreglado por hotfix, flota arriba del bar).
  - Tap animation: `transform: scale(0.94)` al `active`, spring easing.
  - Haptic feedback en tap: `navigator.vibrate(10)` si soportado.
  - **Long-press** (500ms): abre un action sheet iOS-style con 3 opciones: "Gasto rápido" (default), "Ingreso", "Nuevo recurrente". Cada uno navega al form correspondiente pre-seleccionado. Implementación: `useRef` a un timer + `onTouchStart`/`onTouchEnd`. En desktop (sub-proyecto B) equivalente click derecho o dropdown.

**Screen chrome (`src/components/ui/Screen.tsx`):**

- **Large title** iOS 18: 34pt bold, left-aligned, padding-top generoso. Aparece al top de cada pantalla scrolleable.
- **Collapsing behavior**: al scrollear > 40px, el large title se transforma en inline title (17pt) centered dentro de un header sticky con `--material-thin` blur. Implementación: `IntersectionObserver` sobre un sentinel invisible al inicio del contenido. Cross-fade en el `opacity` con `--ease-spring-out`.
- Subtitle debajo del large title (14pt, `--text-muted`).
- **Botones de acción**: slot `<Screen right={...}>` para acciones contextuales (ej. Movimientos: botón filtro; Ajustes: `Editar` si hay lista). Los botones respetan safe-area-top.
- **Pull-to-refresh**: opt-in via `<Screen onRefresh={fn}>`. Overscroll gesture nativo (`overscroll-behavior: contain` + touch handlers).

**AppLayout (`src/app/AppLayout.tsx`):**

- `paddingBottom` sube a `calc(var(--safe-bottom) + 92px)` para dar aire al FAB en su nueva posición sobre el bar.
- Fondo del contenido: `var(--paper)`.

**Testing:**

- Los 8 E2E que dependen del chrome se revisan y actualizan si labels cambiaron (probablemente ninguno, se mantienen).
- Nuevo test manual: verificar collapsing header en iPhone real.

**Riesgo:** el collapsing header con IntersectionObserver puede tener glitches con pull-to-refresh iOS. Mitigación: si aparece, se degrada a static large title (no colapsa) en iOS < 16.

### Fase 3 — TransactionForm con keypad in-app + smart-fill

**Objetivo:** reducir el flow de crear gasto/ingreso de ~10 interacciones a 2-3 (repetido) o 4-5 (nuevo). Nueva UX autónoma que aprende del historial.

**Layout del sheet (mobile portrait):**

```
┌──────────────────────────────┐
│  ✕                     Nuevo │  Close (X) top-left, tipo chip top-right
│                              │
│         $ 45.000             │  Amount HUGE (44pt SF Pro Rounded),
│                              │  live-formatted, tabular-nums
│                              │
│  [Uber][Café][Mercado][+]    │  Chips de conceptos recientes
│                              │  (tap → autofill TODO; + = nuevo)
│                              │
│  ┌────┬────┬────┐            │
│  │ 1  │ 2  │ 3  │            │  Keypad in-app 3×4, botones 58×58px
│  ├────┼────┼────┤            │  SF Pro 24pt, bg = --surface
│  │ 4  │ 5  │ 6  │            │  Haptic al tap (vibrate 10ms)
│  ├────┼────┼────┤            │
│  │ 7  │ 8  │ 9  │            │
│  ├────┼────┼────┤            │
│  │ .  │ 0  │ ⌫  │            │
│  └────┴────┴────┘            │
│                              │
│  ── Concepto ──────          │  Aparece al tener un amount válido
│  Uber_________________       │  input, autofocus al terminar de teclear amount
│                              │
│  🚗 Transporte  💳 Tarjeta    │  Auto-inferido (pill grande con SF Symbol);
│  ↑ sugerido                  │  tap → sheet con todas las categorías/métodos
│                              │
│  📅 Hoy  ·  ○ Pendiente       │  Fecha + estado (chips secundarios)
│                              │
│  ┌─────────────────────────┐ │
│  │       Guardar           │ │  CTA fill, spring on tap, disabled si !canSave
│  └─────────────────────────┘ │
└──────────────────────────────┘
```

**Componentes nuevos:**

- **`AmountKeypad.tsx`**: keypad reutilizable. Props: `value: string`, `onChange`, `onDone`. Botones 58×58 con haptic. `.` restringido a uno solo. `⌫` borra último char.
- **`ConceptChips.tsx`**: chips scrolleables de conceptos recientes. Props: `recents: RecentConcept[]`, `onSelect: (concept) => void`. Cada chip incluye emoji de la categoría inferida al lado del nombre.
- **`InferencePill.tsx`**: pill grande con categoría + método inferidos. Tap → sheet con opciones alternativas.

**Smart-fill autónomo:**

- Nueva tabla en Dexie: `conceptIndex`:
  ```ts
  interface ConceptIndexEntry {
    id: string;             // conceptKey (normalizado: lowercase, trim, sin punct)
    displayName: string;    // el más reciente casing usado
    categoryId: string | null;
    paymentMethodId: string | null;
    count: number;
    lastUsedAt: string;     // ISO
  }
  ```
- **Al guardar una transacción** (`saveTransaction`):
  - Se calcula `conceptKey = normalize(tx.concept)`.
  - `db.conceptIndex.put({ id: conceptKey, displayName: tx.concept, categoryId, paymentMethodId, count: prev.count+1, lastUsedAt: now })`.
- **Chips de recientes**: query `db.conceptIndex.orderBy('lastUsedAt').reverse().limit(5)` (con weight opcional por `count`).
- **Inferencia al escribir** (`inferFromConcept(text)`):
  - Debounce 200ms.
  - Match exacto normalizado → pill con "sugerido" + confidence alta (auto-selected).
  - Match por prefijo (≥3 chars) → pill con confidence media.
  - Sin match → usa último-usado (last transaction del user, cualquier concepto).
- **Override manual**: si el user cambia la categoría/método sugerida antes de guardar, ese cambio se persiste al `conceptIndex` al guardar (aprende del override).

**Ingreso vs Gasto:**

- Se elimina el toggle Gasto/Ingreso del header del form.
- El tipo se determina por CÓMO se abrió el form:
  - FAB tap normal → gasto (default más común).
  - FAB long-press → sheet con "Gasto rápido / Ingreso / Nuevo recurrente"; navega al form con `type` preseleccionado.
  - Editar existente → mantiene el tipo original.
- El chip top-right del form muestra: `Nuevo` para gasto, `Nuevo ingreso` para ingreso (color `--positive`). Le da visibilidad al tipo sin toggle.
- Cuando `type === 'income'`:
  - Color del amount: `--positive` con prefijo `+`.
  - Filtro de métodos: solo Débito y Transferencia (no TC, no Efectivo para ingresos).

**Estados de transición:**

- Al abrir: amount focused, keypad visible. Chips de recientes arriba (5 más recientes por lastUsed).
- Al escribir el primer dígito: amount aparece formateado en vivo (`$ 1`, `$ 12`, `$ 123`, `$ 1.234`).
- Amount válido (> 0): campo concepto aparece con animación fade-in + slide-up (240ms spring).
- Concepto no vacío: pill de inferencia aparece.
- Todo válido: botón Guardar se habilita (color texto → color pleno).

**Cambios en dominio/data:**

- Nueva migración de Dexie: `db.version(N+1).stores({ conceptIndex: 'id, lastUsedAt' })`.
- `localRepository.saveTransaction` actualiza `conceptIndex` post-save.
- Nuevo módulo `src/domain/inference/conceptInference.ts` con `normalize()`, `inferFromConcept()`.

**Testing:**

- Unit tests para `normalize()` y `inferFromConcept()` con fixtures.
- Unit test para el update de `conceptIndex` en `saveTransaction`.
- E2E: existentes (01, 02, 03, 04, 05, 06, 07, 08) se adaptan al nuevo layout. Nuevo test: crear "Uber" dos veces, verificar que la segunda vez la categoría se auto-selecciona.

**Riesgo:** el keypad in-app podría sentirse extraño al principio (usuarios acostumbrados al keyboard del sistema). Mitigación: se puede desactivar en Ajustes → "Usar teclado del sistema" (opt-out).

### Fase 4 — Dashboard rediseñado

**Objetivo:** Dashboard con hero `Sobrante del mes` (matches mental model), quincenas refinadas, chips consolidados y clarity de ingresos vs gastos en Próximos.

**Layout:**

```
┌────────────────────────────────┐
│  Inicio                        │  ← Large title (colapsable, Fase 2)
│  Septiembre 2026               │
│                                │
│  ┌──────────────────────────┐  │
│  │ Sobrante del mes         │  │  ← Hero card (tinted según quincena
│  │                          │  │    activa: Q10 → tinte azul,
│  │        $ 1.400.000       │  │    Q25 → tinte naranja)
│  │                          │  │  SF Pro Rounded 44pt.
│  │ 💵 Disponible ahora      │  │  Cuenta animada 0→total en 400ms
│  │           $ 800.000  ⓘ    │  │  (respeta reduced-motion).
│  └──────────────────────────┘  │
│                                │
│  ┌──────────┐ ┌──────────┐    │  Grid 2 col, cards con color de fondo
│  │ Q. del 10│ │ Q. del 25│    │  suave (--q10-soft / --q25-soft).
│  │ +$ 400K  │ │ +$ 800K  │    │  Subtitle: "5 gastos · 2 pendientes"
│  │ 5·2·1TC  │ │ 3·1·2TC  │    │
│  └──────────┘ └──────────┘    │
│  ══════════ FOLD ══════════   │
│                                │
│  ┌──────────────────────────┐  │
│  │ Por pagar   10   $ 950K  │  │  ← Chip único (reemplaza los 3
│  │ Pendientes · Programados │  │    anteriores). Tap → sheet con
│  │ · En tarjeta        →    │  │    desglose por estado.
│  └──────────────────────────┘  │
│                                │
│  Próximos movimientos          │  ← Renombrado (era "Próximos pagos")
│  ─────────────────────         │  Solo gastos (ya filtrado por hotfix).
│  🚗 Uber              -$ 15K   │  Amount en color de texto, prefijo `-`.
│     Hoy · TC          20 Sep   │
│  🍔 Restaurante       -$ 42K   │
│     Mañana · Débito   21 Sep   │
│  ...                           │
│                                │
│  [ Ver todos los movimientos ] │
└────────────────────────────────┘
```

**Cambios detallados:**

- **Hero tinted por quincena activa**:
  - Hoy: si `today.day < settings.quincenaStartDays[1]` → tinte Q10 (azul suave), si no → tinte Q25 (naranja suave). Cambia automáticamente al cruzar el día 25.
  - Implementación: `background: color-mix(in srgb, var(--q10-soft) 70%, var(--surface))` según la quincena activa.
  - Refuerza la identidad "cada quincena su color".

- **Número principal `Sobrante del mes`**:
  - 44pt SF Pro Rounded, tabular-nums.
  - Color: `--text` si ≥ 0, `--danger` si < 0.
  - Animación de cuenta al mount: de 0 al total en 400ms con `--ease-spring-out`. `useEffect` con `requestAnimationFrame`. Skip si `prefers-reduced-motion: reduce`.

- **Métrica secundaria `Disponible ahora`** (regreso limpio de Libre real):
  - Debajo del sobrante, más chico (17pt).
  - Fórmula: `disponible - comprometido` (misma que la vieja Libre real).
  - Prefijo con SF Symbol `banknote` (o 💵 emoji temporal).
  - Info-icon `ⓘ` al lado → sheet iOS que explica en 2 líneas: "Disponible ahora es la plata que ya tenés (ingresos ya recibidos menos gastos ya pagados), menos lo comprometido (pendientes + programados). Puede ser negativo si aún no llegó el sueldo y tenés gastos pagados con ahorro."
  - Solo se muestra si difiere del Sobrante (evita ruido cuando no hay pending/scheduled distinction relevante).

- **Quincena cards con más aire y contexto**:
  - Padding 16×20.
  - Subtitle con `5 gastos · 2 pendientes · 1 en TC` (visible; en móvil abreviado como `5·2·1TC`).
  - Restante con prefix `+` si positivo, `-` si negativo, color adecuado.
  - Tap → Movimientos filtrado a esa quincena.

- **Chip único "Por pagar"** (consolidación):
  - Card con: total count (`10`), total monto (`$ 950K`), 3 sub-labels (Pendientes · Programados · En tarjeta), chevron `→`.
  - Tap → sheet con desglose:
    ```
    Pendientes             3    $ 450.000
    Programados            2    $ 200.000
    En tarjeta             5    $ 300.000
    ─────────────────────────────────────
    Total por pagar       10    $ 950.000
    ```
  - Cada línea del sheet es tap-able → Movimientos filtrado.
  - Info-icon en el header del sheet → explicación de cada estado en 1 línea.

- **Próximos movimientos** (renombrado):
  - Rows iOS-style: `[emoji categoría] [concepto] [fecha·método] [monto]`.
  - Amount con prefijo `-` en color de texto (gastos) — sub-proyecto A NO cambia esto porque ya son solo gastos por el hotfix.
  - Nota: en Movimientos (Fase 5) sí distinguimos ingresos con `+` verde.

**Testing:** actualizar test 08 para nuevos labels/estados.

**Riesgo:** el cambio a chip único "Por pagar" oculta info que hoy está visible. Se compensa con sheet de desglose fácil de invocar. Si el user siente pérdida de contexto, se puede agregar caption inline con los 3 números.

### Fase 5 — Pantallas secundarias

**Objetivo:** llevar todas las pantallas restantes al lenguaje visual + patrones consolidados de las Fases 1-4.

#### Movimientos (Lista)

- **Rows iOS-style**: `[emoji categoría (32px)] [concepto (17pt) + fecha·método (13pt --text-muted)] [monto (17pt tabular-nums)]`. Altura 60px, padding vertical 12.
- **Ingresos vs Gastos visualmente distinguidos**:
  - Ingreso: monto en `--positive` prefijado `+` (ej. `+$ 45.000`).
  - Gasto: monto en `--text` sin prefijo especial (ej. `$ 45.000`) — o `-$ 45.000` para contexto donde importa.
- **Swipe actions iOS gesture**:
  - Swipe-left: [Eliminar] (rojo).
  - Swipe-right: [Marcar pagado] (verde) — si `status !== 'paid'`. Si ya está pagado, [Duplicar].
  - Implementación: `useSwipe` custom hook con `touchstart/move/end` + transform en el row.
- **Agrupamiento por día** con separadores sticky: `HOY · Lunes 20 sep`, `AYER`, `Sáb 18 sep`, etc.
- **Header con filtros** (chips scroll horizontal, sticky bajo el large title):
  - `[Todos] [Gastos] [Ingresos] [Pendientes] [Categoría·▼] [Método·▼]`
  - Selección persistente en URL query params (deep-linkable desde Dashboard).
- **Search bar** iOS-style: aparece al pull-down desde top (patrón Mail/Notes). Filtra por concepto.

#### Calendario

- **Grid del mes** clásico 7×N:
  - Cada celda muestra dots pequeños (5px) por movimiento del día:
    - Verde `--positive` = ingreso.
    - Gris `--text` = gasto.
    - Morado `--committed` = TC (fecha de pago del ciclo, no fecha de compra).
  - Máx 4 dots visibles; `+N` si hay más.
- **Header del mes**: nombre + año 34pt SF Pro Rounded. Navegación `< >` con spring animation. Tap del título → jump a hoy.
- **Tap día** → sheet iOS con lista de movimientos del día + botón `+ Agregar aquí` (pre-completa la fecha en el form).
- **Highlighting**:
  - Día actual: círculo lleno `--q10` (o color de la quincena activa).
  - Días con saldo diario < 0: borde inferior sutil `--danger` (opcional).
- **Swipe horizontal** para cambiar de mes (bonus, si tiempo).

#### Tarjeta (ciclo actual TC)

- **Hero**: `$ 1.230.000` (44pt SF Pro Rounded).
- **Meta info**: `Corte: 25 sep · Pago: 5 oct` con SF Symbol `calendar.badge.clock`.
- **Progress bar del ciclo**: horizontal, muestra días transcurridos / total del ciclo. Muy sutil, altura 4px, color `--q25`.
- **Lista de compras del ciclo** agrupada por semana. Row iOS-style igual que Movimientos.
- **Comparación con ciclo anterior**: chip pequeño `vs. mes anterior: -12% · +$ 80.000` (color según si es mejor o peor).

#### Análisis (rediseño grande — pedido explícito del usuario)

- **Selector de período**: pills top: `[Este mes] [Mes anterior] [Última quincena] [Custom]`. Custom abre date picker range. Transición al cambiar con fade + slight slide.

- **Card 1 — Balance del período**:
  ```
  Ingresos │ [Sueldo    85%] [Inversiones 15%]           $ 5.2M
  Gastos   │ [Comida 30%][Transp 20%][Renta 25%][Otro..] $ 3.8M
  Sobrante │                                              +$ 1.4M
  ```
  - Cada segmento coloreado por categoría (usa el `color` de `Category`).
  - Tap segmento → sheet con `{ nombre, monto, %, count de transacciones, promedio, últimas 5 transacciones de esa categoría }`.
  - Altura de barra 24px, segmentos con gap 1px (visual separation), corners rounded en los extremos.

- **Card 2 — Distribución de gastos** (pie clickable):
  - Pie chart de gastos por categoría (top 6 + "Otro").
  - Slices coloreados por categoría, gap sutil entre slices.
  - Leyenda debajo con emoji + nombre + % (tocar la leyenda es equivalente al slice).
  - **Tap slice o leyenda** → sheet iOS con:
    - Nombre y emoji de la categoría (grande).
    - Monto total (44pt SF Pro Rounded).
    - % del gasto total.
    - Count de transacciones.
    - Promedio por transacción.
    - Lista tap-able de todas las transacciones de esa categoría en el período.
  - Recharts se mantiene como lib de gráficos (ya está en `package.json`).

- **Card 3 — Tendencia mensual**:
  - Línea de gastos + línea de ingresos últimos 6 meses.
  - Toggle en top del card: `[Línea] [Barras]`.
  - Área bajo cada línea con gradient sutil.
  - Puntos tap-ables → tooltip con `mes: X, ingresos: Y, gastos: Z, sobrante: W`.

- **Card 4 — Top conceptos**:
  - "Uber $ 340K · 12 veces · $ 28K promedio", top 5 conceptos por total gastado.
  - Row tap-able → Movimientos filtrado a ese concepto.

#### Ajustes

- Structure iOS grouped list:
  - **Personal**: Categorías → sub-screen CRUD con color picker iOS-style + emoji picker. Métodos de pago → sub-screen CRUD. Días de quincena → sub-screen con date picker.
  - **Automatización**: Recurrentes → sub-screen con cards de reglas, cada una editable inline. Recordatorios → toggle + info (dormant hasta reactivar Supabase, sub-proyecto no incluido acá).
  - **Datos**: Exportar (placeholder para sub-proyecto D). Importar (existente). Borrar todos los datos (con confirmación doble).
  - **Apariencia**: Tema (auto / claro / oscuro) — ya existe `useTheme`. Idioma (futuro).
  - **Acerca de**: Versión, links a docs (`docs/USER_MANUAL.md`, etc.), GitHub link.
- Cada row: leading SF Symbol (24px), title (17pt), chevron `›` (color `--text-faint`). Tap → sub-screen o toggle inline.

**Testing:**

- Tests E2E existentes (01-08) revisados y actualizados para nuevos selectors si cambiaron.
- Nuevos tests E2E:
  - `09-analisis-pie-clickable`: cargar demo, ir a Análisis, tap slice del pie, verificar que aparece el sheet con monto y % correctos.
  - `10-movimientos-swipe`: crear gasto, swipe-left, verificar botón Eliminar aparece, tap → gasto eliminado.
  - `11-por-pagar-desglose`: cargar demo, tap chip "Por pagar", verificar sheet muestra las 3 líneas con counts y montos correctos.

**Riesgo:** el rediseño de Análisis es el cambio más grande de esta fase (nueva visualización con barras stacked + pie clickable). Se puede shippear Movimientos, Calendario y Tarjeta primero, y Análisis + Ajustes como sub-fase 5b.

---

## Estrategia de motion (cross-cutting)

- **Entrada de pantalla**: fade + slight slide-up (12px), 240ms, `--ease-spring-out`.
- **Sheet abrir**: slide-up desde bottom con backdrop fade, 300ms.
- **Sheet cerrar**: reverso, 240ms.
- **Chips/rows tap**: `transform: scale(0.97)` on `:active`, 120ms.
- **FAB tap**: `transform: scale(0.94)`, 120ms.
- **Number counting** (Dashboard hero): 400ms, `--ease-spring-out`, ease-out del delta.
- **List row swipe**: transform-x controlado por gesture, snap-back con spring 300ms al soltar.
- **Prefers-reduced-motion**: todas las animaciones caen a 0.01ms (ya existe la regla global en `index.css`).

## Estrategia de haptic

- Todos los taps con `navigator.vibrate` si soportado (iOS PWA lo soporta desde 16.4+):
  - Tap normal: 10ms.
  - Tap importante (Guardar, Delete): 20ms.
  - Toggle: 15ms.
- Envuelto en helper `haptic(intensity: 'light' | 'medium' | 'heavy')`.

## Cross-cutting: distinción visual Ingresos vs Gastos

Regla global aplicable en TODAS las pantallas donde se muestre un movimiento:

- Ingreso: monto con prefijo `+`, color `--positive`.
- Gasto: monto sin prefijo o con prefijo `-` según densidad de contexto, color `--text` (o `--danger` si contexto de alerta).
- Iconografía: donde hay espacio, usar SF Symbol `arrow.down.circle.fill` (verde) para ingreso, `arrow.up.circle.fill` (gris) para gasto. En rows compactos, solo el emoji de la categoría + el color/prefijo del monto son suficientes.

---

## Consideraciones de accesibilidad

- Contraste WCAG AA en todos los textos (verificado contra los colores nuevos de iOS System, que ya cumplen).
- `aria-label` en todos los botones sin texto (FAB, close, chevrons).
- `role="dialog"` + `aria-labelledby` en sheets/modals.
- Keyboard navigation: tab order lógico, `:focus-visible` outline preservado.
- VoiceOver: rows con `aria-label` que dice el concepto + monto + fecha.
- Reduced motion respetado.

## Consideraciones de performance

- Number counting animation: solo dispara al mount, no re-render loop.
- IntersectionObserver del collapsing header: 1 observer por pantalla, se limpia al unmount.
- ConceptIndex query en el form: cached en useLiveQuery, actualiza automático al guardar.
- Recharts: mantiene tree-shake automático de Vite (chunk lazy si es posible).

---

## Plan de implementación

Se completará en un plan separado usando el skill `writing-plans` después de que el usuario apruebe este spec.

Orden de ejecución (ya aprobado):

1. **Fase 1** — Design tokens v2 (~1-2 días de trabajo).
2. **Fase 2** — Chrome (TabBar + Screen headers colapsables) (~2 días).
3. **Fase 3** — TransactionForm rediseñado + smart-fill autónomo (~3-4 días).
4. **Fase 4** — Dashboard con hero Sobrante refinado + chip "Por pagar" + Disponible ahora con info-icon (~2 días).
5. **Fase 5** — Pantallas secundarias en 5a (Movimientos, Calendario, Tarjeta) + 5b (Análisis, Ajustes) (~3-4 días).

**Total estimado:** 11-15 días de trabajo real, ship incremental por fase.

## Sub-proyectos siguientes (fuera de este spec)

- **B**: Layout desktop (sidebar, keyboard shortcuts, multi-column).
- **C**: iOS Shortcuts (URL scheme `my-finance://add?type=X&amount=Y`, pantalla de auto-submit, archivo `.shortcut` distribuible).
- **D**: Export xlsx/csv (botón en Ajustes → Datos → Exportar). One-way, sin sync back. Genera archivo y usa Web Share API para pasarlo a Files/iCloud/Excel.
