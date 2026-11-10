-- Group forum: questions and answers, plus a notification fan-out every member
-- can read. Also adds mobile (FCM/APNs) device registration next to the
-- existing web push subscriptions.
--
-- Applied to project hvgmwiylmtdxiuqzcgxp on 2026-11-10. Kept here so a fresh
-- environment can be rebuilt from the repository.

-- ---------------------------------------------------------------- chat -----
CREATE TABLE IF NOT EXISTS public.reading_group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  -- A reply points at the question it answers; a question has parent_id null.
  parent_id uuid REFERENCES public.reading_group_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS reading_group_posts_group_created_idx
  ON public.reading_group_posts (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reading_group_posts_parent_idx
  ON public.reading_group_posts (parent_id) WHERE parent_id IS NOT NULL;

-- A reply must belong to the same group as the question it answers.
CREATE OR REPLACE FUNCTION public.enforce_group_post_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reading_group_posts p
      WHERE p.id = NEW.parent_id AND p.group_id = NEW.group_id
    ) THEN
      RAISE EXCEPTION 'Reply must belong to the same group as its question';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reading_group_posts_thread ON public.reading_group_posts;
CREATE TRIGGER reading_group_posts_thread BEFORE INSERT ON public.reading_group_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_post_thread();

ALTER TABLE public.reading_group_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their group posts" ON public.reading_group_posts;
CREATE POLICY "Members can read their group posts" ON public.reading_group_posts FOR SELECT TO authenticated
  USING (public.is_reading_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can post as themselves" ON public.reading_group_posts;
CREATE POLICY "Members can post as themselves" ON public.reading_group_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_reading_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "Authors can edit their posts" ON public.reading_group_posts;
CREATE POLICY "Authors can edit their posts" ON public.reading_group_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.is_reading_group_member(group_id, auth.uid()))
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors and owners can delete posts" ON public.reading_group_posts;
CREATE POLICY "Authors and owners can delete posts" ON public.reading_group_posts FOR DELETE TO authenticated
  USING (
    public.is_reading_group_member(group_id, auth.uid())
    AND (
      author_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.reading_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_group_posts TO authenticated;

-- ------------------------------------------------- notification queue -----
CREATE TABLE IF NOT EXISTS public.group_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('post', 'progress', 'member_joined', 'member_left')),
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/',
  subject_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  delivered_at timestamptz,
  delivery_attempts integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS group_notifications_recipient_unread_idx
  ON public.group_notifications (recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS group_notifications_pending_idx
  ON public.group_notifications (created_at) WHERE delivered_at IS NULL;

ALTER TABLE public.group_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_notifications FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Recipients can read their notifications" ON public.group_notifications;
CREATE POLICY "Recipients can read their notifications" ON public.group_notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Recipients can mark their notifications read" ON public.group_notifications;
CREATE POLICY "Recipients can mark their notifications read" ON public.group_notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.lock_group_notification_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.recipient_id <> OLD.recipient_id
     OR NEW.group_id <> OLD.group_id
     OR NEW.kind <> OLD.kind
     OR NEW.title <> OLD.title
     OR NEW.body <> OLD.body
     OR NEW.url <> OLD.url
     OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     OR NEW.delivery_attempts <> OLD.delivery_attempts THEN
    IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
       OR current_user = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only the read flag can be changed on a notification';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS group_notifications_lock ON public.group_notifications;
CREATE TRIGGER group_notifications_lock BEFORE UPDATE ON public.group_notifications
  FOR EACH ROW EXECUTE FUNCTION public.lock_group_notification_columns();

GRANT SELECT, UPDATE ON public.group_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.fan_out_group_notification(
  p_group_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_url text,
  p_subject_id uuid,
  p_actor_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_notifications (recipient_id, group_id, kind, title, body, url, subject_id, actor_id)
  SELECT m.user_id, p_group_id, p_kind, p_title, p_body, p_url, p_subject_id, p_actor_id
  FROM public.reading_group_members m
  WHERE m.group_id = p_group_id
    AND m.user_id <> p_actor_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fan_out_group_notification(uuid, text, text, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_group_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  group_title text;
  author_name text;
  excerpt text;
  notice_title text;
  notice_url text;
BEGIN
  SELECT g.title INTO group_title FROM public.reading_groups g WHERE g.id = NEW.group_id;
  SELECT coalesce(
           nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
           nullif(btrim(u.raw_user_meta_data->>'name'), ''),
           split_part(u.email, '@', 1),
           'Someone'
         )
    INTO author_name
    FROM auth.users u WHERE u.id = NEW.author_id;

  excerpt := left(btrim(regexp_replace(NEW.body, '\s+', ' ', 'g')), 140);
  notice_url := '/?section=study&group=' || NEW.group_id::text;

  IF NEW.parent_id IS NULL THEN
    notice_title := author_name || ' asked in ' || coalesce(group_title, 'your group');
  ELSE
    notice_title := author_name || ' answered in ' || coalesce(group_title, 'your group');
  END IF;

  PERFORM public.fan_out_group_notification(
    NEW.group_id, 'post', notice_title, excerpt, notice_url, NEW.id, NEW.author_id
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reading_group_posts_notify ON public.reading_group_posts;
CREATE TRIGGER reading_group_posts_notify AFTER INSERT ON public.reading_group_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_post();

CREATE OR REPLACE FUNCTION public.notify_group_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  member_name text;
  group_title text;
  added integer;
  plan_days integer;
BEGIN
  IF NEW.completed_days IS NOT DISTINCT FROM OLD.completed_days THEN
    RETURN NEW;
  END IF;

  added := coalesce(array_length(NEW.completed_days, 1), 0) - coalesce(array_length(OLD.completed_days, 1), 0);
  IF added <= 0 THEN RETURN NEW; END IF;

  SELECT g.title, coalesce((g.plan->>'durationDays')::int, 0) INTO group_title, plan_days
  FROM public.reading_groups g WHERE g.id = NEW.group_id;

  SELECT coalesce(
           nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
           nullif(btrim(u.raw_user_meta_data->>'name'), ''),
           split_part(u.email, '@', 1),
           'A member'
         )
    INTO member_name
    FROM auth.users u WHERE u.id = NEW.user_id;

  PERFORM public.fan_out_group_notification(
    NEW.group_id,
    'progress',
    member_name || ' read further in ' || coalesce(group_title, 'your group'),
    CASE
      WHEN plan_days > 0 AND coalesce(array_length(NEW.completed_days, 1), 0) >= plan_days
        THEN 'They finished the whole plan.'
      ELSE 'Now at day ' || NEW.current_day || ' of ' || coalesce(group_title, 'the plan') || '.'
    END,
    '/?section=study&group=' || NEW.group_id::text,
    NULL,
    NEW.user_id
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reading_group_progress_notify ON public.reading_group_progress;
CREATE TRIGGER reading_group_progress_notify AFTER UPDATE ON public.reading_group_progress
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_progress();

CREATE OR REPLACE FUNCTION public.notify_group_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  member_name text;
  group_title text;
BEGIN
  SELECT g.title INTO group_title FROM public.reading_groups g WHERE g.id = NEW.group_id;
  SELECT coalesce(
           nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
           nullif(btrim(u.raw_user_meta_data->>'name'), ''),
           split_part(u.email, '@', 1),
           'Someone'
         )
    INTO member_name
    FROM auth.users u WHERE u.id = NEW.user_id;

  PERFORM public.fan_out_group_notification(
    NEW.group_id,
    'member_joined',
    member_name || ' joined ' || coalesce(group_title, 'your group'),
    'Say hello, or post something for the group to study together.',
    '/?section=study&group=' || NEW.group_id::text,
    NULL,
    NEW.user_id
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reading_group_members_notify ON public.reading_group_members;
CREATE TRIGGER reading_group_members_notify AFTER INSERT ON public.reading_group_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_membership();

-- ------------------------------------------------------- device tokens -----
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  token text NOT NULL UNIQUE,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_failure_at timestamptz,
  failure_reason text
);
CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx ON public.device_push_tokens (user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own device tokens" ON public.device_push_tokens;
CREATE POLICY "Users manage their own device tokens" ON public.device_push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;

CREATE OR REPLACE FUNCTION public.unread_group_notification_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(count(*), 0)::int
  FROM public.group_notifications
  WHERE recipient_id = auth.uid() AND read_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.unread_group_notification_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unread_group_notification_count() TO authenticated;

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
REVOKE ALL ON FUNCTION public.mark_group_notifications_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_group_notifications_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_undelivered_group_notifications(p_limit integer DEFAULT 100)
RETURNS SETOF public.group_notifications
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
  RETURNING n.*;
$$;
REVOKE ALL ON FUNCTION public.claim_undelivered_group_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_undelivered_group_notifications(integer) TO service_role;

ALTER TABLE public.device_push_reminders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS device_push_reminders_user_idx
  ON public.device_push_reminders (user_id);
