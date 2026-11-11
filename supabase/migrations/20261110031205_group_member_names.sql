-- Display names for a forum thread.
--
-- auth.users is not readable from the browser and must not become so. This
-- function returns names only for a group the caller already belongs to, so a
-- member can see who wrote what without being able to enumerate accounts.
CREATE OR REPLACE FUNCTION public.group_member_names(p_group_id uuid)
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    coalesce(
      nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data->>'name'), ''),
      nullif(split_part(u.email, '@', 1), ''),
      'A reader'
    )::text AS display_name
  FROM public.reading_group_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.group_id = p_group_id
    AND public.is_reading_group_member(p_group_id, auth.uid());
$$;

REVOKE ALL ON FUNCTION public.group_member_names(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_member_names(uuid) TO authenticated;
