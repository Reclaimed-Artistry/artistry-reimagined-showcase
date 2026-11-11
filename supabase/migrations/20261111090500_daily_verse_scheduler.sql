-- Queue the daily verse at 06:00 and 21:00 in each member's own time zone.
--
-- A single device row has one `reminder_time`, which cannot express "morning
-- and evening", so the verse schedule is computed here instead: every minute
-- the scheduler asks which members have just crossed 06:00 or 21:00 in their
-- local zone, and queues one notice per member per slot per day.
--
-- The unique index `group_notifications_verse_once_idx` makes this idempotent,
-- so running every minute cannot double-send. The recipient's time zone comes
-- from their notification preferences, falling back to their most recent
-- device, then UTC.

CREATE OR REPLACE FUNCTION public.queue_daily_verse_notifications()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  queued integer := 0;
  slot_row record;
  verse record;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  SELECT * INTO verse FROM public.verse_of_the_day(v_today);
  IF verse.reference IS NULL THEN
    RETURN 0;
  END IF;

  -- Members who opted in, with a resolved time zone.
  FOR slot_row IN
    WITH opted_in AS (
      SELECT
        u.id AS user_id,
        coalesce(
          nullif(btrim(p.verse_time_zone), ''),
          (SELECT d.time_zone FROM public.device_push_reminders d
            WHERE d.user_id = u.id AND d.time_zone IS NOT NULL
            ORDER BY d.updated_at DESC LIMIT 1),
          'UTC'
        ) AS tz,
        coalesce(p.daily_verse, true) AS wants_verse
      FROM auth.users u
      LEFT JOIN public.notification_preferences p ON p.user_id = u.id
    ),
    localised AS (
      SELECT
        user_id,
        tz,
        (now() AT TIME ZONE tz)::date AS local_date,
        to_char(now() AT TIME ZONE tz, 'HH24:MI') AS local_hm
      FROM opted_in
      WHERE wants_verse
    )
    SELECT
      user_id,
      tz,
      local_date,
      CASE WHEN local_hm = '06:00' THEN 'morning' ELSE 'evening' END AS slot
    FROM localised
    WHERE local_hm IN ('06:00', '21:00')
  LOOP
    -- The key is the local date, so a member at UTC+13 gets one morning verse
    -- per *their* day rather than per UTC day.
    INSERT INTO public.group_notifications
      (recipient_id, group_id, kind, slot, delivery_key, title, body, url, subject_id, actor_id)
    VALUES (
      slot_row.user_id,
      NULL,
      'verse',
      slot_row.slot,
      'verse:' || slot_row.local_date::text || ':' || slot_row.slot,
      CASE WHEN slot_row.slot = 'morning'
        THEN 'Verse of the day · ' || verse.reference
        ELSE 'Evening verse · ' || verse.reference
      END,
      verse.text,
      '/?section=home&verse=' || slot_row.local_date::text,
      NULL,
      NULL
    )
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      queued := queued + 1;
    END IF;
  END LOOP;

  RETURN queued;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_daily_verse_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_daily_verse_notifications() TO service_role;

-- Owner-scheduled group reminders, dispatched at the owner's chosen local time.
CREATE OR REPLACE FUNCTION public.queue_scheduled_group_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g record;
  queued integer := 0;
  v_today jsonb;
  v_first jsonb;
  v_passage text;
  v_body text;
BEGIN
  FOR g IN
    SELECT *
    FROM public.reading_groups
    WHERE daily_reminder_enabled
      AND daily_reminder_time IS NOT NULL
      AND to_char(now() AT TIME ZONE coalesce(daily_reminder_time_zone, 'UTC'), 'HH24:MI')
          = to_char(daily_reminder_time, 'HH24:MI')
      AND (last_reminder_sent_on IS NULL
           OR last_reminder_sent_on < (now() AT TIME ZONE coalesce(daily_reminder_time_zone, 'UTC'))::date)
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Claim the day first so a slow loop cannot queue it twice.
    UPDATE public.reading_groups
    SET last_reminder_sent_on = (now() AT TIME ZONE coalesce(g.daily_reminder_time_zone, 'UTC'))::date
    WHERE id = g.id;

    -- Day 1 of the plan is a reasonable stand-in for "today's scripture" on a
    -- scheduled nudge: the stored passage label belongs to each member's own
    -- position, which differs per person.
    v_today := g.plan -> 'days' -> 0;
    v_first := v_today -> 'passages' -> 0;
    v_passage := NULL;
    IF v_first IS NOT NULL THEN
      v_passage := 'chapter ' || (v_first ->> 'startChapter');
    END IF;
    v_body := 'Take a few minutes to read today''s Scripture.'
      || CASE WHEN v_passage IS NOT NULL THEN ' (' || v_passage || ')' ELSE '' END;

    INSERT INTO public.group_notifications
      (recipient_id, group_id, kind, delivery_key, title, body, url, actor_id)
    SELECT
      m.user_id,
      g.id,
      'reminder',
      'scheduled:' || g.id::text || ':' || (now() AT TIME ZONE coalesce(g.daily_reminder_time_zone, 'UTC'))::date::text,
      g.title || ' — reminder to read',
      v_body,
      '/?section=study&group=' || g.id::text,
      g.owner_id
    FROM public.reading_group_members m
    WHERE m.group_id = g.id
    ON CONFLICT DO NOTHING;

    queued := queued + 1;
  END LOOP;

  RETURN queued;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_scheduled_group_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_scheduled_group_reminders() TO service_role;

-- ---------------------------------------------------------------------------
-- Claim must hand back `slot` so the worker can tag the push correctly
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_undelivered_group_notifications(integer);

CREATE OR REPLACE FUNCTION public.claim_undelivered_group_notifications(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  recipient_id uuid,
  group_id uuid,
  kind text,
  slot text,
  title text,
  body text,
  url text,
  subject_id uuid,
  actor_id uuid,
  created_at timestamptz,
  read_at timestamptz,
  delivered_at timestamptz,
  delivery_attempts integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH claimed AS (
    SELECT n.id
    FROM public.group_notifications n
    WHERE n.delivered_at IS NULL
      AND n.created_at > now() - interval '1 day'
    ORDER BY n.created_at
    LIMIT greatest(1, least(p_limit, 500))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.group_notifications n
  SET delivered_at = now(),
      delivery_attempts = n.delivery_attempts + 1
  FROM claimed
  WHERE n.id = claimed.id
  RETURNING n.id, n.recipient_id, n.group_id, n.kind, n.slot, n.title, n.body,
            n.url, n.subject_id, n.actor_id, n.created_at, n.read_at,
            n.delivered_at, n.delivery_attempts;
$$;

REVOKE ALL ON FUNCTION public.claim_undelivered_group_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_undelivered_group_notifications(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Reads tolerate a null group
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_group_notifications_read(p_group_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.group_notifications
  SET read_at = now()
  WHERE recipient_id = auth.uid()
    AND read_at IS NULL
    AND (p_group_id IS NULL OR group_id = p_group_id);
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_group_notifications_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_group_notifications_read(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Run both schedulers from the existing every-minute cron
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_notification_schedulers()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'verse', public.queue_daily_verse_notifications(),
    'groupReminders', public.queue_scheduled_group_reminders()
  );
$$;

REVOKE ALL ON FUNCTION public.run_notification_schedulers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_notification_schedulers() TO service_role;
