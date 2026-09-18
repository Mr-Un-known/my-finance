# SQL que NO se aplica solo

Lo de acá tiene placeholders que hay que reemplazar a mano antes de
ejecutarlo. Por eso vive fuera de `supabase/migrations/`: cualquier
`supabase db push` aplicaría estos archivos tal cual, y
`0003_reminder_cron.sql` crearía un cron que cada 15 minutos llama a
`https://TU-PROYECTO.supabase.co/...` con el token literal
`REEMPLAZAR_CON_TU_CRON_SECRET`.

- **`0003_reminder_cron.sql`** — cron de recordatorios push. Solo hace
  falta si vas a usar notificaciones. Antes: desplegar la Edge Function y
  guardar `CRON_SECRET`. Ver [docs/NOTIFICATIONS.md](../../docs/NOTIFICATIONS.md).
