CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'selah-push-reminders-every-minute';

SELECT cron.schedule(
  'selah-push-reminders-every-minute',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://hvgmwiylmtdxiuqzcgxp.supabase.co/functions/v1/push-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-selah-push-cron-secret', (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'selah_push_cron_secret'
          LIMIT 1
        )
      ),
      body := jsonb_build_object('action', 'send-due')
    );
  $$
);
