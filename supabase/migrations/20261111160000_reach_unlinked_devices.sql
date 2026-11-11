-- Deliver the verse of the day to every installation, signed in or not.
--
-- Why this exists
-- ---------------
-- The schedulers used to start from `auth.users`, so a device was only reachable
-- if it was linked to an account. In practice six installations were subscribed
-- and none of them had a `user_id`: the app can subscribe to web push before the
-- reader signs in, and signing in does not always run the linking step. Every
-- one of those devices was silently excluded, which is why the verse of the day
-- had never once been pushed.
--
-- This migration makes an installation addressable in its own right.
--
-- Deliberately not done: backfilling `device_push_reminders.user_id`. An
-- installation id says nothing about who was signed in on that device, and a
-- guess would attribute one person's reading to another. Unlinked devices
-- receive verses and reading nudges; they link on the next app launch, when
-- `linkAccountToWebSubscription` updates the row by endpoint.

-- ---------------------------------------------------------------- addressing --
-- A notice can now name either an account or an installation. Exactly one of the
-- two is set; accounts remain the way group notifications are addressed.
alter table public.group_notifications alter column recipient_id drop not null;

alter table public.group_notifications
  add column if not exists device_id uuid
    references public.device_push_reminders(id) on delete cascade;

create index if not exists group_notifications_device_pending_idx
  on public.group_notifications (device_id)
  where device_id is not null and delivered_at is null;

-- ------------------------------------------------------------------- slots ---
-- Verse slots are morning/evening; the continue-reading nudge has three slots.
-- One column carries both, so it has to accept every name either emits.
alter table public.group_notifications drop constraint if exists group_notifications_slot_check;

alter table public.group_notifications
  add constraint group_notifications_slot_check
  check (slot is null or slot in ('morning', 'evening', 'mid_morning', 'afternoon'));

-- ------------------------------------------------------------------ kind -----
alter table public.group_notifications drop constraint if exists group_notifications_kind_check;

alter table public.group_notifications
  add constraint group_notifications_kind_check
  check (kind in ('post', 'progress', 'member_joined', 'member_left', 'reminder', 'verse', 'reading'));

-- ------------------------------------------------------------- preference ----
alter table public.notification_preferences
  add column if not exists reading_reminder boolean not null default true;

-- ----------------------------------------------------------- reading slots ---
create table if not exists public.reading_reminder_slots (
  slot text primary key,
  hour integer not null check (hour between 0 and 23),
  label text not null
);

insert into public.reading_reminder_slots (slot, hour, label) values
  ('mid_morning', 8,  'Morning'),
  ('afternoon',   13, 'Afternoon'),
  ('evening',     19, 'Evening')
on conflict (slot) do update set hour = excluded.hour, label = excluded.label;

-- ------------------------------------------------------------- claiming ------
-- Only claim a notice that has somewhere to go right now. Previously a notice
-- was claimed -- and so marked delivered -- even with no reachable device, which
-- meant a device that had unsubscribed quietly consumed its own verse.
drop function if exists public.claim_undelivered_group_notifications(integer);

create or replace function public.claim_undelivered_group_notifications(p_limit integer default 100)
returns table (id uuid, recipient_id uuid, device_id uuid, group_id uuid, kind text, slot text,
               title text, body text, url text, subject_id uuid, actor_id uuid,
               created_at timestamptz, read_at timestamptz, delivered_at timestamptz, delivery_attempts integer)
language sql
security definer
set search_path to 'public'
as $function$
  with reachable as (
    select n.id
      from public.group_notifications n
     where n.delivered_at is null
       and n.created_at > now() - interval '1 day'
       and (
         (n.device_id is not null
           and exists (select 1 from public.device_push_reminders d where d.id = n.device_id))
         or (n.device_id is null and n.recipient_id is not null
           and (exists (select 1 from public.device_push_reminders d where d.user_id = n.recipient_id)
             or exists (select 1 from public.device_push_tokens t where t.user_id = n.recipient_id)))
       )
     order by n.created_at
     limit greatest(1, least(p_limit, 500))
     for update skip locked
  ),
  claimed as (
    select r.id from reachable r
  )
  update public.group_notifications n
     set delivered_at = now(), delivery_attempts = n.delivery_attempts + 1
    from claimed where n.id = claimed.id
  returning n.id, n.recipient_id, n.device_id, n.group_id, n.kind, n.slot, n.title, n.body, n.url,
            n.subject_id, n.actor_id, n.created_at, n.read_at, n.delivered_at, n.delivery_attempts;
$function$;

revoke all on function public.claim_undelivered_group_notifications(integer) from public;
grant execute on function public.claim_undelivered_group_notifications(integer) to service_role;

-- ------------------------------------------------------- delivery once ------
-- The original dedupe index was (recipient_id, delivery_key). A notice addressed
-- to a device has recipient_id NULL, and a unique index treats NULLs as
-- distinct, so that index never constrained those rows: every cron tick wrote
-- another copy of the same verse and pushed it. One device received 847 pushes
-- in a day instead of two.
--
-- delivery_key already embeds the device or account id, so it is unique on its
-- own and needs no second column.
delete from public.group_notifications n
 where n.delivery_key is not null
   and n.id in (
     select id from (
       select id, row_number() over (partition by delivery_key order by created_at) as dup
         from public.group_notifications
        where delivery_key is not null
     ) ranked where ranked.dup > 1
   );

drop index if exists public.group_notifications_delivery_once_idx;

create unique index group_notifications_delivery_once_idx
  on public.group_notifications (delivery_key)
  where delivery_key is not null;

-- ------------------------------------------------------------ verse queue ----
-- Every installation is a target, linked or not. A device with no account still
-- gets the verse; it falls back to UTC until the app reports a time zone.
create or replace function public.queue_daily_verse_notifications()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  queued integer := 0;
  target record;
  slot_row record;
  v_verse record;
begin
  select * into v_verse from public.verse_of_the_day((now() at time zone 'UTC')::date);
  if v_verse.reference is null then return 0; end if;

  for target in
    select d.id as device_id, d.user_id, coalesce(d.time_zone, 'UTC') as tz
      from public.device_push_reminders d
     where d.user_id is null
        or coalesce((select p.daily_verse from public.notification_preferences p
                      where p.user_id = d.user_id), true)
  loop
    for slot_row in select * from public.due_verse_slots(target.tz) loop
      insert into public.group_notifications
        (recipient_id, device_id, group_id, kind, slot, delivery_key, title, body, url)
      values (target.user_id, target.device_id, null, 'verse', slot_row.slot,
        'verse:' || target.device_id::text || ':' || slot_row.local_date::text || ':' || slot_row.slot,
        case when slot_row.slot = 'morning'
             then 'Verse of the day · ' || v_verse.reference
             else 'Evening verse · ' || v_verse.reference end,
        v_verse.text,
        '/?section=home&verse=' || slot_row.local_date::text)
      on conflict do nothing;
      if found then queued := queued + 1; end if;
    end loop;
  end loop;

  -- Accounts that asked for the verse but have no device record yet still get it
  -- queued, so it is waiting when they sign in on a new device.
  for target in
    select p.user_id, coalesce(p.verse_time_zone, 'UTC') as tz
      from public.notification_preferences p
     where p.daily_verse
       and not exists (select 1 from public.device_push_reminders d where d.user_id = p.user_id)
  loop
    for slot_row in select * from public.due_verse_slots(target.tz) loop
      insert into public.group_notifications
        (recipient_id, group_id, kind, slot, delivery_key, title, body, url)
      values (target.user_id, null, 'verse', slot_row.slot,
        'verse:' || target.user_id::text || ':' || slot_row.local_date::text || ':' || slot_row.slot,
        case when slot_row.slot = 'morning'
             then 'Verse of the day · ' || v_verse.reference
             else 'Evening verse · ' || v_verse.reference end,
        v_verse.text,
        '/?section=home&verse=' || slot_row.local_date::text)
      on conflict do nothing;
      if found then queued := queued + 1; end if;
    end loop;
  end loop;

  return queued;
end;
$function$;

-- ---------------------------------------------------------- reading queue ----
create or replace function public.queue_reading_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  queued integer := 0;
  target record;
  slot_row record;
  v_progress text;
  v_body text;
begin
  for target in
    select d.id as device_id, d.user_id, coalesce(d.time_zone, 'UTC') as tz,
           d.last_sent_local_date,
           coalesce((select p.reading_reminder from public.notification_preferences p
                      where p.user_id = d.user_id), true) as wants_reading
      from public.device_push_reminders d
  loop
    continue when not target.wants_reading;

    v_progress := null;
    if target.user_id is not null then
      select 'Day ' || (s.payload -> 'enrollments' -> 0 ->> 'lastReadDay')
        into v_progress
        from public.user_sync_snapshots s
       where s.user_id = target.user_id
         and s.payload -> 'enrollments' -> 0 ->> 'lastReadDay' is not null
       limit 1;
    end if;

    v_body := case when v_progress is not null
                then 'You were on ' || v_progress || '. A few minutes is enough to keep going.'
                else 'A few quiet minutes with Scripture — pick up where you left off.' end;

    -- An installation that has never received a nudge only gets the most recent
    -- elapsed slot. Otherwise a brand-new device on its first run would receive
    -- every slot of the day at once.
    for slot_row in
      select * from public.due_reading_slots(target.last_sent_local_date, target.tz)
    loop
      if target.last_sent_local_date is null and slot_row.local_date <> (
           select min(s2.local_date) from public.due_reading_slots(null, target.tz) s2
         ) then
        continue;
      end if;

      insert into public.group_notifications
        (recipient_id, device_id, group_id, kind, slot, delivery_key, title, body, url)
      values (target.user_id, target.device_id, null, 'reading', slot_row.slot,
        'reading:' || target.device_id::text || ':' || slot_row.local_date::text || ':' || slot_row.slot,
        'Continue where you stopped', v_body, '/?section=reader')
      on conflict do nothing;
      if found then queued := queued + 1; end if;
    end loop;
  end loop;

  return queued;
end;
$function$;

-- ------------------------------------------------------------- entry point ---
create or replace function public.run_notification_schedulers()
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'verse', public.queue_daily_verse_notifications(),
    'reading', public.queue_reading_reminders(),
    'groupReminders', public.queue_scheduled_group_reminders()
  );
$function$;

revoke all on function public.queue_daily_verse_notifications() from public, anon, authenticated;
revoke all on function public.queue_reading_reminders() from public, anon, authenticated;
revoke all on function public.run_notification_schedulers() from public, anon, authenticated;
grant execute on function public.queue_daily_verse_notifications() to service_role;
grant execute on function public.queue_reading_reminders() to service_role;
grant execute on function public.run_notification_schedulers() to service_role;
