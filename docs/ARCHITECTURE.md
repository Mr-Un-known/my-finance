# Arquitectura

## Capas

```
UI (React, componentes .tsx)
   ↓ hooks (useLiveQuery de Dexie, hooks propios)
domain/ (TypeScript puro — sin React, sin Dexie, sin Supabase)
   ↓
Repository (interfaz, src/data/repository.ts)
   ├─ LocalRepository   (Dexie / IndexedDB) — fuente de verdad offline
   └─ SupabaseRepository (Postgres, vía RLS) — respaldo/sync en la nube
```

`domain/` es la capa que de verdad importa: son funciones puras,
100% testeadas, que no saben si están corriendo en un navegador, un
test, o (en teoría) un servidor. Ver `docs/FINANCIAL_LOGIC.md` para el
detalle de cada una.

## Por qué local-first

La app funciona completa sin ninguna cuenta ni configuración: todo vive
en IndexedDB del dispositivo desde el primer uso. Supabase (Fase 13) es
una capa **opcional** encima — si no se configuran las variables de
entorno, ese código ni siquiera se descarga (ver más abajo).

Ambos repositorios implementan la misma interfaz `Repository`
(`src/data/repository.ts`), así que en teoría la UI podría no saber
cuál está usando — en la práctica, hoy la UI sigue leyendo de Dexie
directamente (vía `useLiveQuery`) para las pantallas en vivo, y
Supabase se usa para: autenticación, sincronización manual explícita
(`data/sync/syncService.ts`), y notificaciones push. Una sincronización
en tiempo real completa (que cada pantalla lea indistintamente de
cualquiera de los dos repositorios) es la extensión natural si más
adelante se necesita multi-dispositivo en vivo — el modelo de datos y la
interfaz ya están listos para eso, no haría falta rediseñar nada.

## Code-splitting

Dos dependencias pesadas se separan en sus propios chunks, cargados solo
si se necesitan:

- **Recharts** (~115kB gzip) — solo lo usa la pantalla de Análisis,
  cargada con `React.lazy()` en el router.
- **`@supabase/supabase-js`** (~150kB gzip) — `getSupabase()` en
  `data/supabase/client.ts` lo importa con `import()` dinámico. Si nunca
  se configuran las variables de Supabase, ese código nunca se descarga:
  el bundle inicial de un usuario 100% local pesa ~59kB gzip.

## Seguridad: por qué Auth no es opcional si usas Supabase

El repositorio es público en GitHub Pages, así que la `anon key` de
Supabase queda visible en el código para cualquiera que la busque. Eso
es normal — está diseñada para ser pública. Lo que protege los datos es
que cada tabla tiene Row Level Security (`supabase/migrations/0001_init.sql`)
con una política que solo permite leer/escribir filas donde
`auth.uid() = user_id`. Sin sesión iniciada, esa key no le da acceso a
nadie a nada.

## Notificaciones: por qué el disparador vive en el servidor

Documentado en detalle en `docs/NOTIFICATIONS.md` — resumen: Safari en
iOS no tiene una API de notificaciones locales *programadas*, así que
pg_cron + una Edge Function + Web Push (VAPID) es la única arquitectura
que en verdad funciona, no una elección de preferencia.

## Modelo de datos

Ver `src/domain/types.ts` para las definiciones exactas. Entidades:
`Settings`, `Category`, `PaymentMethod`, `Transaction`, `RecurringRule`,
`Budget`, `Reminder`. El esquema de Postgres
(`supabase/migrations/0001_init.sql`) es un espejo snake_case de estos
mismos tipos — la conversión vive en `src/data/supabase/mappers.ts`,
con tests de round-trip.
