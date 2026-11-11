-- Correct a real bug: the column-lock trigger also blocked the delivery worker.
--
-- claim_undelivered_group_notifications() writes delivered_at, and the trigger
-- guarding that column used a role check that does not fire reliably inside a
-- SECURITY DEFINER function (the effective role there is still postgres). The
-- result was that claiming a notice raised "Only the read flag can be changed",
-- which would have blocked every group notification from ever being sent.
--
-- The column lock only existed to stop a signed-in reader editing the text of a
-- notice addressed to them. Removing their UPDATE policy gives that more
-- strongly: the table becomes append-only from the browser, and
-- mark_group_notifications_read() is the only way a reader can change anything.
DROP POLICY IF EXISTS "Recipients can mark their notifications read" ON public.group_notifications;
DROP TRIGGER IF EXISTS group_notifications_lock ON public.group_notifications;
DROP FUNCTION IF EXISTS public.lock_group_notification_columns();

REVOKE ALL ON public.group_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.group_notifications TO authenticated;

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
