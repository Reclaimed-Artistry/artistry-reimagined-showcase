CREATE TABLE IF NOT EXISTS public.device_push_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  reminder_time time NOT NULL,
  time_zone text NOT NULL,
  last_sent_local_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_push_reminders_endpoint_https CHECK (endpoint LIKE 'https://%'),
  CONSTRAINT device_push_reminders_time_zone_not_empty CHECK (length(time_zone) > 0)
);

ALTER TABLE public.device_push_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_push_reminders FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS device_push_reminders_due_idx
  ON public.device_push_reminders (reminder_time, time_zone, last_sent_local_date);

CREATE OR REPLACE FUNCTION public.claim_due_push_reminders()
RETURNS SETOF public.device_push_reminders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH due AS MATERIALIZED (
    SELECT reminder.id,
           (now() AT TIME ZONE reminder.time_zone)::date AS local_date
    FROM public.device_push_reminders AS reminder
    WHERE reminder.reminder_time = date_trunc('minute', now() AT TIME ZONE reminder.time_zone)::time
      AND (reminder.last_sent_local_date IS NULL OR
           reminder.last_sent_local_date < (now() AT TIME ZONE reminder.time_zone)::date)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.device_push_reminders AS reminder
  SET last_sent_local_date = due.local_date,
      updated_at = now()
  FROM due
  WHERE reminder.id = due.id
  RETURNING reminder.*;
$$;

REVOKE ALL ON FUNCTION public.claim_due_push_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_push_reminders() TO service_role;
