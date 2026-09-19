# Notificaciones — cómo funcionan y cómo activarlas

## Por qué esto no es trivial en iPhone

Antes de la guía, los hechos que determinaron esta arquitectura (verificados
contra la documentación oficial, no supuestos):

- El Push API en iOS solo está disponible para web apps instaladas en la
  pantalla de inicio desde Safari — una pestaña abierta no cuenta, y
  ningún otro navegador en iOS sirve (todos corren sobre WebKit).
  Funciona desde iOS 16.4.
- **No existe** una API de notificaciones locales *programadas* en Safari.
  No puedes decirle al navegador "avísame en 3 días" y que lo haga aunque
  la app esté cerrada. Cualquier tutorial que use `setTimeout` para esto
  está describiendo algo que no funciona.
- Por lo tanto, el disparador tiene que vivir en un servidor, no en el
  teléfono. Esta app usa **pg_cron** (viene habilitado por defecto en todo
  proyecto Supabase, incluido el free tier) para revisar cada 15 minutos
  si hay recordatorios pendientes, y **pg_net** para llamar a una Edge
  Function que envía el push de verdad.

## Arquitectura

```
Guardas un gasto con fecha futura
   → se crea/actualiza una fila en `reminders` EN LOCAL (IndexedDB),
     con remind_at = fecha - X días
   → la sincronización la sube a Postgres
     (antes se escribía directo en la nube, y sin conexión se perdía
      en silencio: el upsert fallaba y nadie reintentaba)
pg_cron, cada 15 minutos
   → pg_net llama a la Edge Function `send-reminders`
Edge Function
   → busca reminders vencidos
   → busca las push_subscriptions del usuario
   → firma y envía un Web Push (protocolo VAPID) a cada suscripción
   → Apple Push Notification service (APNs) — Safari enruta todo por ahí
   → tu iPhone
   → marca el reminder como 'sent'
```

## Limitaciones que hay que aceptar

- **Precisión de ±15 minutos**, no al segundo — el cron corre cada 15
  min. Para "mañana tienes un pago" sobra de sobra.
- Suscripciones que expiran o se invalidan (código 404/410 de APNs) se
  borran automáticamente por la Edge Function; si eso pasa, simplemente
  vuelve a activarlas desde Ajustes.
- Si desinstalas y reinstalas la PWA, tu suscripción anterior queda
  huérfana — actívalas de nuevo después de reinstalar.
- **Plan B siempre disponible:** el Dashboard muestra "Próximos pagos"
  sin depender de ningún push. Si por lo que sea las notificaciones no
  llegan, esa lista nunca falla porque no depende de red ni de permisos.
- En la Unión Europea, Apple retiró el soporte de web push con iOS 17.4
  por el DMA. No aplica si usas la app desde Colombia, se documenta aquí
  por completitud.

## Guía de activación (para quien administra el proyecto)

### 1. Generar las llaves VAPID

```bash
npx web-push generate-vapid-keys
```

Esto imprime un par de llaves. Ejemplo real de una corrida (las tuyas
serán distintas — nunca reuses estas):

```
Public Key:
BOOCkd6EkVjwo4PeLJ8CFZK07yXnAlmOWi_dXkxo_ILzs4iMtAZvHWD7fmq8TqpvzStTdFXgnn4LbiYnCHi1boM

Private Key:
xBfEDFU88HG21OOcHQwHuk4FFjFe305oGakMoAAQGvE
```

La **pública** va en `.env.local` y en los secrets de GitHub Actions
como `VITE_VAPID_PUBLIC_KEY` (es pública por diseño, puede ir en el
bundle). La **privada** nunca toca el frontend ni un archivo de git —
solo va como secret de la Edge Function (paso 3).

### 2. Instalar el CLI de Supabase y conectar el proyecto

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF   # lo ves en la URL del panel
```

### 3. Configurar los secrets de la Edge Function

```bash
supabase secrets set VAPID_PUBLIC_KEY=BOOCkd6EkVjwo4Pe...
supabase secrets set VAPID_PRIVATE_KEY=xBfEDFU88HG21OOc...
supabase secrets set VAPID_SUBJECT=mailto:tucorreo@dominio.com
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
```

`CRON_SECRET` es un valor que te inventas — es la contraseña que usa
pg_cron para autenticarse contra tu propia función y que nadie más pueda
dispararla a mano.

### 4. Desplegar la función

```bash
supabase functions deploy send-reminders
```

### 5. Programar el cron

Abre `supabase/manual/0003_reminder_cron.sql`, reemplaza:
- `TU-PROYECTO` por tu referencia real de proyecto.
- `REEMPLAZAR_CON_TU_CRON_SECRET` por el mismo valor que usaste en
  `CRON_SECRET` arriba (idealmente, guardado en Vault — el archivo tiene
  la alternativa comentada).

Luego pégalo y córrelo en el SQL Editor del panel de Supabase.

### 6. Probarlo

```bash
curl -X POST https://TU-PROYECTO.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

Debe responder `{"sent":0,"failed":0}` si no hay recordatorios vencidos
todavía — eso ya confirma que la función está viva y autenticando bien.

### 7. Activarlo en tu iPhone

Con la app instalada en pantalla de inicio (no en una pestaña de Safari),
entra a **Ajustes → Recordatorios → Activar recordatorios**, acepta el
permiso de notificaciones. Listo — el siguiente gasto con fecha futura
que registres ya programará su aviso.
