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
    WHERE reminder.reminder_time <= date_trunc('minute', now() AT TIME ZONE reminder.time_zone)::time
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
