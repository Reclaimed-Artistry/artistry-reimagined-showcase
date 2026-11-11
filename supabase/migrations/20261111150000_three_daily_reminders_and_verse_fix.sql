-- Three scheduled reminders a day, and verses that reach the whole device.
--
-- Three problems with the first version:
--
-- 1. **Verse slots were missed entirely.** The scheduler matched the local clock
--    against exactly '06:00' and '21:00'. The cron runs every minute, but if a
--    tick is delayed or skipped the string never matches and that day's verse is
--    silently lost. It now matches a window since the last run, so a late tick
--    still catches up.
-- 2. **Devices with no account were unreachable.** Verse and reminder queries
--    started from `auth.users`, so a subscriber whose web push row has no
--    `user_id` — which is every row today — never received anything. Delivery is
--    now driven by *subscriptions*, and an account is only needed to look up a
--    time zone.
-- 3. **One reading reminder.** The reader asked for three a day. The single
--    `reminder_time` cannot express that, so the continue-reading nudge gets its
--    own schedule at 08:00, 13:00 and 19:00 local.

-- ---------------------------------------------------------------------------
-- Continue-reading reminder
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reading_reminder_slots (
  slot text PRIMARY KEY CHECK (slot IN ('mid_morning', 'afternoon', 'evening')),
  hour smallint NOT NULL CHECK (hour BETWEEN 0 AND 23)
);

INSERT INTO public.reading_reminder_slots (slot, hour) VALUES
  ('mid_morning', 8),
  ('afternoon', 13),
  ('evening', 19)
ON CONFLICT (slot) DO NOTHING;

-- Which reminders a reader wants. Existing rows predate this and must keep the
-- behaviour they already had: the reading reminder was on for them.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS reading_reminder boolean NOT NULL DEFAULT true;

-- Allow the new notification kind.
ALTER TABLE public.group_notifications
  DROP CONSTRAINT IF EXISTS group_notifications_kind_check;

ALTER TABLE public.group_notifications
  ADD CONSTRAINT group_notifications_kind_check
  CHECK (kind IN ('post', 'progress', 'member_joined', 'member_left', 'reminder', 'verse', 'reading'));

-- ---------------------------------------------------------------------------
-- Schedule helpers
-- ---------------------------------------------------------------------------

/**
 * Which slots are due for one subscriber.
 *
 * Returns every slot whose local hour has been crossed since the last
 * successful send, so a delayed cron tick catches up instead of dropping the
 * reminder. Called once per subscriber with its own effective time zone.
 */
CREATE OR REPLACE FUNCTION public.due_reading_slots(
  p_last_sent date,
  p_time_zone text,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (slot text, local_date date)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH localised AS (
    SELECT (p_now AT TIME ZONE coalesce(p_time_zone, 'UTC')) AS local_now
  )
  SELECT s.slot, localised.local_now::date
  FROM public.reading_reminder_slots s, localised
  WHERE s.hour <= extract(hour FROM localised.local_now)::int
    AND (p_last_sent IS NULL OR p_last_sent < localised.local_now::date)
  ORDER BY s.hour;
$$;

/**
 * The verse slots that are due.
 *
 * Morning is 06:00-11:59 and evening is 12:00-23:59, mirroring the two daily
 * pushes. Window matching rather than an exact minute is the fix for missed
 * ticks: the `delivery_key` unique index keeps a re-run from double-sending.
 */
CREATE OR REPLACE FUNCTION public.due_verse_slots(p_time_zone text, p_now timestamptz DEFAULT now())
RETURNS TABLE (slot text, local_date date)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN extract(hour FROM (p_now AT TIME ZONE coalesce(p_time_zone, 'UTC'))) < 12
              THEN 'morning' ELSE 'evening' END,
         (p_now AT TIME ZONE coalesce(p_time_zone, 'UTC'))::date;
$$;

GRANT EXECUTE ON FUNCTION public.due_reading_slots(date, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.due_verse_slots(text, timestamptz) TO service_role;

-- The queue functions live in 20261111160000_reach_unlinked_devices.sql: they
-- have to know how to address an installation, and that migration is what makes
-- an installation addressable. There is deliberately no backfill of
-- device_push_reminders.user_id -- see that file for why.
