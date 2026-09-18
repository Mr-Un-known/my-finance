-- Programa la llamada a la Edge Function `send-reminders` cada 15 minutos.
--
-- IMPORTANTE - pasos manuales antes de aplicar esto (ver docs/NOTIFICATIONS.md):
--   1. Desplegar la funcion: supabase functions deploy send-reminders
--   2. Guardar la URL del proyecto y el mismo valor de CRON_SECRET que
--      configuraste como secret de la funcion (supabase secrets set
--      CRON_SECRET=...) en Vault, NUNCA en texto plano en una migracion.
--   3. Reemplazar los placeholders de abajo antes de aplicar.
--
-- pg_cron y pg_net vienen habilitados por defecto en todos los proyectos
-- Supabase (free, pro y team) — no hay que activarlos a mano.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Usar el secret guardado en Vault, no la key en texto plano:
      -- 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      'Authorization', 'Bearer REEMPLAZAR_CON_TU_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para desactivarlo despues: select cron.unschedule('send-reminders-every-15-min');
