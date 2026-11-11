-- Group activity and streaks.
--
-- `reading_group_progress.completed_days` is an array of day numbers. It says
-- how much of the plan someone has finished, but not *when* they finished it, so
-- a streak cannot be derived from it. This adds the missing dimension: one row
-- per member per calendar day they read.
--
-- Everything below is additive. Existing progress rows keep working and
-- `reading_group_progress` is still what the progress bar reads.

CREATE TABLE IF NOT EXISTS public.group_activity_days (
  group_id uuid NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The member's own local date, not UTC: a streak should break at their
  -- midnight, and someone reading at 1am in Lagos should not lose a day.
  activity_date date NOT NULL,
  plan_day integer,
  minutes integer CHECK (minutes IS NULL OR minutes BETWEEN 0 AND 600),
  note text CHECK (note IS NULL OR char_length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS group_activity_recent_idx
  ON public.group_activity_days (group_id, activity_date DESC);

ALTER TABLE public.group_activity_days ENABLE ROW LEVEL SECURITY;

-- Members can read the whole group's activity; everyone can write only their
-- own row.
DROP POLICY IF EXISTS "Members can see group activity" ON public.group_activity_days;
CREATE POLICY "Members can see group activity"
  ON public.group_activity_days FOR SELECT TO authenticated
  USING (public.is_reading_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members record their own activity" ON public.group_activity_days;
CREATE POLICY "Members record their own activity"
  ON public.group_activity_days FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_reading_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members update their own activity" ON public.group_activity_days;
CREATE POLICY "Members update their own activity"
  ON public.group_activity_days FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- The group's current activity
-- ---------------------------------------------------------------------------

-- The owner picks what the group reads together. Null means "the plan's day for
-- today", which is what most groups will use.
ALTER TABLE public.reading_groups
  ADD COLUMN IF NOT EXISTS activity_date date,
  ADD COLUMN IF NOT EXISTS activity_note text,
  ADD COLUMN IF NOT EXISTS time_zone text;

/**
 * What the group is reading today.
 *
 * "Today" is the group's own date, taken from the requesting member's time zone
 * so a group spread across zones still agrees on one passage. The plan day
 * advances with the calendar from the group's start date, which is what makes
 * this an "activity" rather than just "day 1 forever".
 */
CREATE OR REPLACE FUNCTION public.group_current_activity(p_group_id uuid)
RETURNS TABLE (
  activity_date date,
  plan_day integer,
  title text,
  passages jsonb,
  note text,
  group_start date,
  total_days integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text;
  v_today date;
  v_start date;
  v_total integer;
  v_pinned date;
  v_note text;
  v_day integer;
  v_plan jsonb;
BEGIN
  IF NOT public.is_reading_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT date_trunc('day', g.created_at)::date, g.plan, g.activity_date, g.activity_note
    INTO v_start, v_plan, v_pinned, v_note
  FROM public.reading_groups g WHERE g.id = p_group_id;

  IF v_start IS NULL THEN RAISE EXCEPTION 'That group does not exist'; END IF;

  v_total := coalesce((v_plan ->> 'durationDays')::int, 0);

  -- The caller's zone decides which date "today" is.
  SELECT coalesce(nullif(btrim(np.verse_time_zone), ''), 'UTC') INTO v_tz
  FROM public.notification_preferences np WHERE np.user_id = auth.uid();
  v_today := (now() AT TIME ZONE coalesce(v_tz, 'UTC'))::date;

  IF v_pinned IS NOT NULL THEN
    v_day := 1;
    activity_date := v_pinned;
  ELSE
    v_day := least(greatest(v_today - v_start + 1, 1), greatest(v_total, 1));
    activity_date := v_today;
  END IF;

  plan_day := v_day;
  title := coalesce(v_plan -> 'days' -> (v_day - 1) ->> 'title', v_plan ->> 'title', 'Reading together');
  passages := coalesce(v_plan -> 'days' -> (v_day - 1) -> 'passages', '[]'::jsonb);
  note := coalesce(nullif(btrim(v_note), ''), v_plan -> 'days' -> (v_day - 1) ->> 'reflectionPrompt');
  group_start := v_start;
  total_days := v_total;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.group_current_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_current_activity(uuid) TO authenticated;

/**
 * Streak state for every member, plus the group's shared streak.
 *
 * A member's streak is consecutive local dates ending today or yesterday. It
 * ends yesterday rather than today so a streak is not shown as broken during
 * the hours before someone reads.
 */
CREATE OR REPLACE FUNCTION public.group_activity_summary(p_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  streak integer,
  read_today boolean,
  read_days integer,
  last_read_on date,
  is_me boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text;
  v_today date;
BEGIN
  IF NOT public.is_reading_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT coalesce(nullif(btrim(np.verse_time_zone), ''), 'UTC') INTO v_tz
  FROM public.notification_preferences np WHERE np.user_id = auth.uid();
  v_today := (now() AT TIME ZONE coalesce(v_tz, 'UTC'))::date;

  RETURN QUERY
  WITH dates AS (
    SELECT a.user_id, a.activity_date
    FROM public.group_activity_days a
    WHERE a.group_id = p_group_id
  ),
  per_member AS (
    SELECT
      d.user_id,
      d.activity_date,
      -- Anchor the streak at today or yesterday, then count backwards.
      d.activity_date - (row_number() OVER (PARTITION BY d.user_id ORDER BY d.activity_date DESC) - 1) AS grp,
      row_number() OVER (PARTITION BY d.user_id ORDER BY d.activity_date DESC) AS rn
    FROM dates d
    WHERE d.activity_date <= v_today
  ),
  streaks AS (
    SELECT
      pm.user_id,
      max(CASE WHEN pm.grp = (SELECT max(activity_date) FROM per_member x WHERE x.user_id = pm.user_id) THEN pm.rn ELSE 0 END) AS ladder,
      max(pm.activity_date) AS last_read_on,
      count(*) AS read_days
    FROM per_member pm
    GROUP BY pm.user_id
  ),
  anchored AS (
    SELECT
      s.user_id,
      CASE
        WHEN s.last_read_on IS NULL THEN 0
        WHEN s.last_read_on < v_today - 1 THEN 0
        ELSE coalesce(s.ladder, 0)::int
      END AS streak,
      (s.last_read_on = v_today) AS read_today,
      coalesce(s.read_days, 0)::int AS read_days,
      s.last_read_on
    FROM streaks s
  )
  SELECT
    m.user_id,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(u.email, '@', 1),
      'A reader'
    ) AS display_name,
    coalesce(a.streak, 0) AS streak,
    coalesce(a.read_today, false) AS read_today,
    coalesce(a.read_days, 0) AS read_days,
    a.last_read_on,
    (m.user_id = auth.uid()) AS is_me
  FROM public.reading_group_members m
  LEFT JOIN anchored a ON a.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.group_id = p_group_id
  ORDER BY coalesce(a.read_today, false) DESC, coalesce(a.streak, 0) DESC, m.joined_at;
END;
$$;

REVOKE ALL ON FUNCTION public.group_activity_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_activity_summary(uuid) TO authenticated;

/**
 * Record that the caller read today.
 *
 * `join` also marks a member who has been in the group without reading; it is
 * what the "Start today's reading" button calls. Idempotent: pressing it twice
 * updates the same row rather than inflating the streak.
 */
CREATE OR REPLACE FUNCTION public.record_group_activity(
  p_group_id uuid,
  p_date date DEFAULT NULL,
  p_plan_day integer DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_reading_group_member(p_group_id, v_uid) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT coalesce(nullif(btrim(np.verse_time_zone), ''), 'UTC') INTO v_tz
  FROM public.notification_preferences np WHERE np.user_id = v_uid;
  v_today := (now() AT TIME ZONE coalesce(v_tz, 'UTC'))::date;

  INSERT INTO public.group_activity_days (group_id, user_id, activity_date, plan_day, note)
  VALUES (p_group_id, v_uid, coalesce(p_date, v_today), p_plan_day, nullif(btrim(coalesce(p_note, '')), ''))
  ON CONFLICT (group_id, user_id, activity_date)
  DO UPDATE SET
    plan_day = coalesce(excluded.plan_day, public.group_activity_days.plan_day),
    note = coalesce(excluded.note, public.group_activity_days.note);

  RETURN (
    SELECT count(*)::int FROM public.group_activity_days a
    WHERE a.group_id = p_group_id AND a.user_id = v_uid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_group_activity(uuid, date, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_group_activity(uuid, date, integer, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Notify the group when someone reads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_group_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  member_name text;
  group_title text;
  streak integer;
BEGIN
  SELECT g.title INTO group_title FROM public.reading_groups g WHERE g.id = NEW.group_id;

  SELECT coalesce(
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
           split_part(u.email, '@', 1),
           'A member'
         )
    INTO member_name
    FROM auth.users u WHERE u.id = NEW.user_id;

  SELECT coalesce(s.streak, 0) INTO streak
  FROM public.group_activity_summary(NEW.group_id) s
  WHERE s.user_id = NEW.user_id;

  -- Only the first read of a day is worth telling the group about; an update to
  -- the same row (a note added later) is not news.
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  PERFORM public.fan_out_group_notification(
    NEW.group_id,
    'progress',
    member_name || ' read today in ' || coalesce(group_title, 'your group'),
    CASE WHEN streak > 1 THEN 'That is ' || streak || ' days in a row.' ELSE 'The streak starts here.' END,
    '/?section=study&group=' || NEW.group_id::text,
    NULL,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_activity_notify ON public.group_activity_days;
CREATE TRIGGER group_activity_notify
  AFTER INSERT ON public.group_activity_days
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_activity();

-- 'progress' is already an allowed notification kind, so no constraint change
-- is needed here.
