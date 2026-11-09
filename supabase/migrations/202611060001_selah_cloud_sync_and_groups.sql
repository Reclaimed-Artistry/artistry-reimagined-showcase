CREATE TABLE IF NOT EXISTS public.user_sync_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_sync_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own sync snapshot" ON public.user_sync_snapshots;
CREATE POLICY "Users manage their own sync snapshot" ON public.user_sync_snapshots
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reading_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  plan jsonb NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.reading_group_members (
  group_id uuid NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS reading_group_members_user_idx ON public.reading_group_members(user_id);
CREATE TABLE IF NOT EXISTS public.reading_group_progress (
  group_id uuid NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_days integer[] NOT NULL DEFAULT '{}',
  current_day integer NOT NULL DEFAULT 1 CHECK (current_day > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.reading_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_group_progress ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_reading_group_member(target_group uuid, target_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reading_group_members m
    WHERE m.group_id = target_group AND m.user_id = target_user
  );
$$;
REVOKE ALL ON FUNCTION public.is_reading_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reading_group_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can view their groups" ON public.reading_groups;
CREATE POLICY "Members can view their groups" ON public.reading_groups FOR SELECT TO authenticated
  USING (public.is_reading_group_member(id, auth.uid()));
DROP POLICY IF EXISTS "Users can create their own groups" ON public.reading_groups;
CREATE POLICY "Users can create their own groups" ON public.reading_groups FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners can update their groups" ON public.reading_groups;
CREATE POLICY "Owners can update their groups" ON public.reading_groups FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners can delete their groups" ON public.reading_groups;
CREATE POLICY "Owners can delete their groups" ON public.reading_groups FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Group members can view membership" ON public.reading_group_members;
CREATE POLICY "Group members can view membership" ON public.reading_group_members FOR SELECT TO authenticated
  USING (public.is_reading_group_member(group_id, auth.uid()));
DROP POLICY IF EXISTS "Members can leave or owners can remove members" ON public.reading_group_members;
CREATE POLICY "Members can leave or owners can remove members" ON public.reading_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.reading_groups g WHERE g.id = reading_group_members.group_id AND g.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Group members can view progress" ON public.reading_group_progress;
CREATE POLICY "Group members can view progress" ON public.reading_group_progress FOR SELECT TO authenticated
  USING (public.is_reading_group_member(group_id, auth.uid()));
DROP POLICY IF EXISTS "Users manage their own group progress" ON public.reading_group_progress;
CREATE POLICY "Users manage their own group progress" ON public.reading_group_progress FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_reading_group_member(group_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_reading_group_member(group_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.add_reading_group_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.reading_group_members(group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reading_group_owner_membership ON public.reading_groups;
CREATE TRIGGER reading_group_owner_membership AFTER INSERT ON public.reading_groups
  FOR EACH ROW EXECUTE FUNCTION public.add_reading_group_owner();

CREATE OR REPLACE FUNCTION public.join_reading_group(p_invite_code text)
RETURNS SETOF public.reading_groups LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.reading_groups;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO target FROM public.reading_groups WHERE invite_code = lower(trim(p_invite_code));
  IF target.id IS NULL THEN RAISE EXCEPTION 'Invite code not found'; END IF;
  INSERT INTO public.reading_group_members(group_id, user_id, role)
  VALUES (target.id, auth.uid(), 'member') ON CONFLICT DO NOTHING;
  RETURN NEXT target;
END;
$$;
REVOKE ALL ON FUNCTION public.join_reading_group(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_reading_group(text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sync_snapshots, public.reading_groups, public.reading_group_members, public.reading_group_progress TO authenticated;
