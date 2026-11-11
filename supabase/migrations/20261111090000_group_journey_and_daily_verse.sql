-- Journey visibility, owner reminders, and the daily verse.
--
-- Three additions to the reading-group feature:
--
--   1. A roster that names each member and shows when they started, where they
--      are in the plan, and how far through they are. The group card previously
--      rendered "Reader 3f8a2" because it had no way to look up a display name.
--   2. Owner-sent reminders, delivered to every member through the existing
--      notification queue, plus an optional daily reminder time per group.
--   3. A global verse of the day, queued once per member per slot and delivered
--      at 06:00 and 21:00 in each member's own time zone.
--
-- The verse is global rather than plan-derived: it has to reach people who are
-- not in a group, and a group's plan may be finished, empty, or custom.

-- ---------------------------------------------------------------------------
-- Notification kinds
-- ---------------------------------------------------------------------------

-- 'reminder' is an owner nudge. 'verse' is the daily verse of the day.
ALTER TABLE public.group_notifications
  DROP CONSTRAINT IF EXISTS group_notifications_kind_check;

ALTER TABLE public.group_notifications
  ADD CONSTRAINT group_notifications_kind_check
  CHECK (kind IN ('post', 'progress', 'member_joined', 'member_left', 'reminder', 'verse'));

-- The verse is addressed to an individual, not a group, so it has no group.
ALTER TABLE public.group_notifications
  ALTER COLUMN group_id DROP NOT NULL;

ALTER TABLE public.group_notifications
  ADD COLUMN IF NOT EXISTS slot text
    CHECK (slot IS NULL OR slot IN ('morning', 'evening'));

-- One verse notice per member per local day per slot.
--
-- `delivery_key` carries "verse:<local-date>:<slot>" and the unique index is on
-- (recipient_id, delivery_key). An index over the timestamp cannot work: NULLs
-- are distinct by default, so every non-verse row would slip past a partial
-- unique index and a verse row could still be inserted twice once its slot
-- differed. An explicit key says exactly what "once" means.
ALTER TABLE public.group_notifications
  ADD COLUMN IF NOT EXISTS delivery_key text;

CREATE UNIQUE INDEX IF NOT EXISTS group_notifications_delivery_once_idx
  ON public.group_notifications (recipient_id, delivery_key)
  WHERE delivery_key IS NOT NULL;

-- Delivery and unread counts filter on these.
CREATE INDEX IF NOT EXISTS group_notifications_pending_idx
  ON public.group_notifications (created_at)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS group_notifications_recipient_unread_idx
  ON public.group_notifications (recipient_id)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- The daily verse
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_verses (
  id serial PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  book text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  verse_start integer NOT NULL CHECK (verse_start > 0),
  verse_end integer,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 600),
  morning_note text,
  evening_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_verses_verse_end_check
    CHECK (verse_end IS NULL OR verse_end >= verse_start)
);

ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

-- The verse is public content. Everyone signed in may read it; nobody writes
-- through the API, because the rotation is computed from the row count and a
-- sparse or malformed table would pick empty days.
DROP POLICY IF EXISTS "Anyone signed in can read the daily verses" ON public.daily_verses;
CREATE POLICY "Anyone signed in can read the daily verses"
  ON public.daily_verses FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.daily_verses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.daily_verses TO authenticated;

/**
 * The verse for a given day.
 *
 * Rotation is `day number mod row count`, so it walks the whole list and only
 * repeats once every verse has had its turn. Anchored to a fixed epoch so the
 * choice is stable and every member sees the same verse on the same date.
 */
CREATE OR REPLACE FUNCTION public.verse_of_the_day(p_date date DEFAULT (now() AT TIME ZONE 'UTC')::date)
RETURNS TABLE (
  reference text,
  book text,
  chapter integer,
  verse_start integer,
  verse_end integer,
  text text,
  morning_note text,
  evening_note text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Numbered inline rather than with OFFSET: a scalar subquery is not accepted
  -- in an OFFSET clause, and the modulo has to be clamped for dates before the
  -- epoch, where `%` would go negative.
  WITH ranked AS (
    SELECT v.*,
           (row_number() OVER (ORDER BY v.id) - 1)::int AS rn,
           (count(*) OVER ())::int AS total
    FROM public.daily_verses v
  )
  SELECT r.reference, r.book, r.chapter, r.verse_start, r.verse_end,
         r.text, r.morning_note, r.evening_note
  FROM ranked r
  WHERE r.rn = (((p_date - date '2026-01-01') % r.total) + r.total) % r.total
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verse_of_the_day(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verse_of_the_day(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- Notification preferences
-- ---------------------------------------------------------------------------

-- One row per signed-in account. Absent means "defaults", which are: group
-- activity on, daily verse on. The reader turns things off here rather than
-- opting in, so a new member does not silently miss their first week.
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  group_activity boolean NOT NULL DEFAULT true,
  daily_verse boolean NOT NULL DEFAULT true,
  quiet_hours_start smallint CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end smallint CHECK (quiet_hours_end BETWEEN 0 AND 23),
  verse_time_zone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Readers manage their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Readers manage their own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Group reminder settings
-- ---------------------------------------------------------------------------

ALTER TABLE public.reading_groups
  ADD COLUMN IF NOT EXISTS daily_reminder_time time,
  ADD COLUMN IF NOT EXISTS daily_reminder_time_zone text,
  ADD COLUMN IF NOT EXISTS daily_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_on date;

-- ---------------------------------------------------------------------------
-- Owner reminders
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.send_group_reminder(
  p_group_id uuid,
  p_note text DEFAULT NULL,
  p_passage text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_title text;
  v_today jsonb;
  v_passage text;
  v_note text;
  v_body text;
  v_first jsonb;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT owner_id, title INTO v_owner, v_title
  FROM public.reading_groups WHERE id = p_group_id;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'That group does not exist'; END IF;
  IF v_owner <> v_uid THEN RAISE EXCEPTION 'Only the group owner can send a reminder'; END IF;

  -- The scripture the group is on today, taken from its plan. A group whose
  -- plan is empty or has run out falls back to a general nudge.
  SELECT g.plan -> 'days' -> (least(
           greatest(coalesce(p.current_day, 1), 1),
           greatest(jsonb_array_length(coalesce(g.plan -> 'days', '[]'::jsonb)), 1)
         ) - 1)
    INTO v_today
  FROM public.reading_groups g
  LEFT JOIN public.reading_group_progress p
    ON p.group_id = g.id AND p.user_id = v_uid
  WHERE g.id = p_group_id;

  -- The passage label is built by the app, which owns the canon (book number to
  -- name). The database has no book table, and adding one would duplicate data
  -- that already ships in the bundle and could drift from it.
  v_passage := nullif(btrim(coalesce(p_passage, '')), '');
  IF v_passage IS NULL THEN
    v_first := v_today -> 'passages' -> 0;
    IF v_first IS NOT NULL THEN
      v_passage := 'chapter ' || (v_first ->> 'startChapter');
    END IF;
  END IF;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  v_body := CASE
    WHEN v_note IS NOT NULL AND v_passage IS NOT NULL
      THEN v_note || ' — today: ' || v_passage
    WHEN v_note IS NOT NULL
      THEN v_note
    WHEN v_passage IS NOT NULL
      THEN 'Today: ' || v_passage
    ELSE 'Take a few minutes to read today''s Scripture.'
  END;

  SELECT count(*) INTO v_count
  FROM public.reading_group_members
  WHERE group_id = p_group_id AND user_id <> v_uid;

  PERFORM public.fan_out_group_notification(
    p_group_id,
    'reminder',
    v_title || ' — reminder to read',
    v_body,
    '/?section=study&group=' || p_group_id::text,
    NULL,
    v_uid
  );

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_group_reminder(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_group_reminder(uuid, text, text) TO authenticated;

-- Owner-only reminder schedule settings.
CREATE OR REPLACE FUNCTION public.set_group_reminder(
  p_group_id uuid,
  p_enabled boolean,
  p_time time DEFAULT NULL,
  p_time_zone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reading_groups WHERE id = p_group_id AND owner_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Only the group owner can change reminder settings';
  END IF;

  IF p_enabled AND p_time IS NULL THEN
    RAISE EXCEPTION 'Choose a reminder time';
  END IF;

  UPDATE public.reading_groups
  SET daily_reminder_enabled = p_enabled,
      daily_reminder_time = CASE WHEN p_enabled THEN p_time ELSE NULL END,
      daily_reminder_time_zone = CASE WHEN p_enabled THEN coalesce(p_time_zone, 'UTC') ELSE NULL END
  WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_group_reminder(uuid, boolean, time, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_group_reminder(uuid, boolean, time, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Member roster
-- ---------------------------------------------------------------------------

-- Names, start dates, and progress in one call, so the card can show people
-- rather than UUIDs. SECURITY DEFINER because it reads auth.users for display
-- names, but it only ever returns members of a group the caller belongs to.
CREATE OR REPLACE FUNCTION public.group_member_overview(p_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  role text,
  joined_at timestamptz,
  started_at timestamptz,
  current_day integer,
  days_completed integer,
  plan_days integer,
  last_active_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.user_id,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(u.email, '@', 1),
      'A reader'
    ) AS display_name,
    m.role,
    m.joined_at,
    p.updated_at AS started_at,
    coalesce(p.current_day, 0) AS current_day,
    coalesce(array_length(p.completed_days, 1), 0) AS days_completed,
    coalesce((g.plan ->> 'durationDays')::int, 0) AS plan_days,
    p.updated_at AS last_active_at
  FROM public.reading_group_members m
  JOIN public.reading_groups g ON g.id = m.group_id
  LEFT JOIN public.reading_group_progress p
    ON p.group_id = m.group_id AND p.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.group_id = p_group_id
    AND public.is_reading_group_member(p_group_id, auth.uid())
  ORDER BY (m.role = 'owner') DESC, m.joined_at;
$$;

REVOKE ALL ON FUNCTION public.group_member_overview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_member_overview(uuid) TO authenticated;

-- Seed the verse rotation. Text is from the bundled BSB so the push and the
-- reader show the same wording. The full list is applied in production; this
-- keeps a fresh environment from rotating through an empty table.
INSERT INTO public.daily_verses (reference, book, chapter, verse_start, verse_end, text)
VALUES
  ('Psalm 23:1-4', 'Psalm', 23, 1, 4, 'A Psalm of David. The LORD is my shepherd; I shall not want. He makes me lie down in green pastures; He leads me beside quiet waters. He restores my soul; He guides me in the paths of righteousness for the sake of His name. Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me.'),
  ('Isaiah 40:28-31', 'Isaiah', 40, 28, 31, 'Do you not know? Have you not heard? The LORD is the everlasting God, the Creator of the ends of the earth. He will not grow tired or weary; His understanding is beyond searching out. He gives power to the faint and increases the strength of the weak. Even youths grow tired and weary, and young men stumble and fall. But those who wait upon the LORD will renew their strength; they will mount up with wings like eagles; they will run and not grow weary, they will walk and not faint.'),
  ('Jeremiah 29:11-13', 'Jeremiah', 29, 11, 13, 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, to give you a future and a hope. Then you will call upon Me and come and pray to Me, and I will listen to you. You will seek Me and find Me when you search for Me with all your heart.'),
  ('Philippians 4:6-7', 'Philippians', 4, 6, 7, 'Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.'),
  ('Proverbs 3:5-6', 'Proverbs', 3, 5, 6, 'Trust in the LORD with all your heart, and lean not on your own understanding; in all your ways acknowledge Him, and He will make your paths straight.'),
  ('Matthew 11:28-30', 'Matthew', 11, 28, 30, 'Come to Me, all you who are weary and burdened, and I will give you rest. Take My yoke upon you and learn from Me, for I am gentle and humble in heart, and you will find rest for your souls. For My yoke is easy and My burden is light.'),
  ('Romans 8:38-39', 'Romans', 8, 38, 39, 'For I am convinced that neither death nor life, neither angels nor principalities, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.'),
  ('Lamentations 3:22-24', 'Lamentations', 3, 22, 24, 'Because of the loving devotion of the LORD we are not consumed, for His mercies never fail. They are new every morning; great is Your faithfulness! The LORD is my portion, says my soul, therefore I will hope in Him.'),
  ('Psalm 46:1-3', 'Psalm', 46, 1, 3, 'God is our refuge and strength, an ever-present help in times of trouble. Therefore we will not fear, though the earth is transformed and the mountains are toppled into the depths of the seas, though their waters roar and foam and the mountains quake in the surge.'),
  ('John 14:1-3', 'John', 14, 1, 3, 'Do not let your hearts be troubled. You believe in God; believe in Me as well. In My Father''s house are many rooms. If it were not so, would I have told you that I am going there to prepare a place for you? And if I go and prepare a place for you, I will come back and welcome you into My presence, so that you also may be where I am.'),
  ('Joshua 1:8-9', 'Joshua', 1, 8, 9, 'This Book of the Law must not depart from your mouth; meditate on it day and night, so that you may be careful to do everything written in it. For then you will prosper and succeed in all you do. Have I not commanded you to be strong and courageous? Do not be afraid; do not be discouraged, for the LORD your God is with you wherever you go.'),
  ('1 Peter 5:6-7', '1 Peter', 5, 6, 7, 'Humble yourselves, therefore, under God''s mighty hand, so that in due time He may exalt you. Cast all your anxiety on Him, because He cares for you.'),
  ('Psalm 121:1-4', 'Psalm', 121, 1, 4, 'I lift up my eyes to the hills. From where does my help come? My help comes from the LORD, the Maker of heaven and earth. He will not allow your foot to slip; your Protector will not slumber. Behold, the Protector of Israel will neither slumber nor sleep.'),
  ('Isaiah 41:10', 'Isaiah', 41, 10, NULL, 'Do not fear, for I am with you; do not be afraid, for I am your God. I will strengthen you; I will surely help you; I will uphold you with My righteous right hand.'),
  ('Romans 15:13', 'Romans', 15, 13, NULL, 'Now may the God of hope fill you with all joy and peace as you believe in Him, so that you may overflow with hope by the power of the Holy Spirit.'),
  ('Psalm 34:17-18', 'Psalm', 34, 17, 18, 'The righteous cry out, and the LORD hears; He delivers them from all their troubles. The LORD is near to the brokenhearted; He saves the contrite in spirit.'),
  ('2 Corinthians 12:9-10', '2 Corinthians', 12, 9, 10, 'But He said to me, My grace is sufficient for you, for My power is perfected in weakness. Therefore I will boast all the more gladly in my weaknesses, so that the power of Christ may rest on me. That is why, for the sake of Christ, I delight in weaknesses, in insults, in hardships, in persecutions, in difficulties. For when I am weak, then I am strong.'),
  ('Hebrews 11:1-3', 'Hebrews', 11, 1, 3, 'Now faith is the assurance of what we hope for and the certainty of what we do not see. This is why the ancients were commended. By faith we understand that the universe was formed at God''s command, so that what is seen was not made out of what was visible.'),
  ('Matthew 6:33-34', 'Matthew', 6, 33, 34, 'But seek first the kingdom of God and His righteousness, and all these things will be added unto you. Therefore do not worry about tomorrow, for tomorrow will worry about itself. Today has enough trouble of its own.'),
  ('Colossians 3:14-15', 'Colossians', 3, 14, 15, 'And over all these virtues put on love, which is the bond of perfect unity. Let the peace of Christ rule in your hearts, for to this you were called as members of one body. And be thankful.'),
  ('Psalm 103:1-5', 'Psalm', 103, 1, 5, 'Bless the LORD, O my soul; all that is within me, bless His holy name. Bless the LORD, O my soul, and do not forget all His kind deeds — He who forgives all your iniquities and heals all your diseases, who redeems your life from the Pit and crowns you with loving devotion and compassion, who satisfies you with good things, so that your youth is renewed like the eagle''s.'),
  ('Micah 6:8', 'Micah', 6, 8, NULL, 'He has shown you, O man, what is good. And what does the LORD require of you but to act justly, to love mercy, and to walk humbly with your God?'),
  ('John 15:4-5', 'John', 15, 4, 5, 'Remain in Me, and I will remain in you. Just as no branch can bear fruit by itself unless it remains in the vine, neither can you bear fruit unless you remain in Me. I am the vine and you are the branches. The one who remains in Me, and I in him, will bear much fruit. For apart from Me you can do nothing.'),
  ('Galatians 5:22-23', 'Galatians', 5, 22, 23, 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control. Against such things there is no law.'),
  ('1 Corinthians 13:4-7', '1 Corinthians', 13, 4, 7, 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It is not rude, it is not self-seeking, it is not easily angered, it keeps no account of wrongs. Love takes no pleasure in evil, but rejoices in the truth. It bears all things, believes all things, hopes all things, endures all things.'),
  ('Psalm 27:1', 'Psalm', 27, 1, NULL, 'The LORD is my light and my salvation— whom shall I fear? The LORD is the stronghold of my life— whom shall I dread?'),
  ('Isaiah 43:1-2', 'Isaiah', 43, 1, 2, 'But now, this is what the LORD says— He who created you, O Jacob, and He who formed you, O Israel: Do not fear, for I have redeemed you; I have called you by your name; you are Mine! When you pass through the waters, I will be with you; and when you go through the rivers, they will not overwhelm you. When you walk through the fire, you will not be scorched; the flames will not set you ablaze.'),
  ('Philippians 1:6', 'Philippians', 1, 6, NULL, 'being confident of this, that He who began a good work in you will carry it on to completion until the day of Christ Jesus.'),
  ('2 Timothy 3:16-17', '2 Timothy', 3, 16, 17, 'All Scripture is God-breathed and is useful for instruction, for conviction, for correction, and for training in righteousness, so that the man of God may be complete, fully equipped for every good work.'),
  ('Psalm 139:13-14', 'Psalm', 139, 13, 14, 'For You formed my inmost being; You knit me together in my mother''s womb. I praise You, for I am fearfully and wonderfully made. Marvelous are Your works, and I know this very well.'),
  ('Ephesians 2:8-10', 'Ephesians', 2, 8, 10, 'For it is by grace you have been saved through faith, and this not from yourselves; it is the gift of God, not by works, so that no one can boast. For we are God''s workmanship, created in Christ Jesus to do good works, which God prepared in advance as our way of life.'),
  ('James 1:5', 'James', 1, 5, NULL, 'Now if any of you lacks wisdom, he should ask God, who gives generously to all without finding fault, and it will be given to him.'),
  ('Psalm 16:11', 'Psalm', 16, 11, NULL, 'You have made known to me the path of life; You will fill me with joy in Your presence, with eternal pleasures at Your right hand.'),
  ('Nahum 1:7', 'Nahum', 1, 7, NULL, 'The LORD is good, a stronghold in the day of distress; He cares for those who trust in Him.'),
  ('Isaiah 26:3-4', 'Isaiah', 26, 3, 4, 'You will keep in perfect peace the steadfast of mind, because he trusts in You. Trust in the LORD forever, because GOD the LORD is the Rock eternal.'),
  ('Psalm 119:105', 'Psalm', 119, 105, NULL, 'Your word is a lamp to my feet and a light to my path.'),
  ('1 John 1:8-9', '1 John', 1, 8, 9, 'If we say we have no sin, we deceive ourselves, and the truth is not in us. If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.'),
  ('Romans 12:1-2', 'Romans', 12, 1, 2, 'Therefore I urge you, brothers, on account of God''s mercy, to offer your bodies as living sacrifices, holy and pleasing to God, which is your spiritual service of worship. Do not be conformed to this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what is the good, pleasing, and perfect will of God.'),
  ('Psalm 62:1-2', 'Psalm', 62, 1, 2, 'In God alone my soul finds rest; my salvation comes from Him. He alone is my rock and my salvation. He is my fortress; I will never be shaken.'),
  ('Zephaniah 3:17', 'Zephaniah', 3, 17, NULL, 'The LORD your God is among you; He is mighty to save. He will rejoice over you with gladness; He will quiet you with His love; He will rejoice over you with singing.'),
  ('John 3:16-17', 'John', 3, 16, 17, 'For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life. For God did not send His Son into the world to condemn the world, but to save the world through Him.'),
  ('Psalm 51:10-11', 'Psalm', 51, 10, 11, 'Create in me a clean heart, O God, and renew a right spirit within me. Cast me not away from Your presence; take not Your Holy Spirit from me.'),
  ('Hebrews 4:15-16', 'Hebrews', 4, 15, 16, 'For we do not have a high priest who is unable to sympathize with our weaknesses, but we have one who was tempted in every way that we are, yet was without sin. Let us then approach the throne of grace with confidence, so that we may receive mercy and find grace to help us in our time of need.'),
  ('Psalm 130:5-6', 'Psalm', 130, 5, 6, 'I wait for the LORD; my soul does wait, and in His word I put my hope. My soul waits for the Lord more than watchmen wait for the morning— more than watchmen wait for the morning.'),
  ('1 Thessalonians 5:16-18', '1 Thessalonians', 5, 16, 18, 'Rejoice at all times. Pray without ceasing. Give thanks in every circumstance, for this is God''s will for you in Christ Jesus.'),
  ('Psalm 42:11', 'Psalm', 42, 11, NULL, 'Why are you downcast, O my soul? Why the unease within me? Put your hope in God, for I will yet praise Him, my Savior and my God.'),
  ('Deuteronomy 31:6', 'Deuteronomy', 31, 6, NULL, 'Be strong and courageous; do not be afraid or terrified of them, for it is the LORD your God who goes with you; He will never leave you nor forsake you.'),
  ('Psalm 143:8', 'Psalm', 143, 8, NULL, 'Let me hear Your loving devotion in the morning, for I have put my trust in You. Teach me the way I should walk, for to You I lift up my soul.'),
  ('Matthew 5:14-16', 'Matthew', 5, 14, 16, 'You are the light of the world. A city on a hill cannot be hidden. Neither do people light a lamp and put it under a basket. Instead, they set it on a stand, and it gives light to everyone in the house. In the same way, let your light shine before men, that they may see your good deeds and glorify your Father in heaven.'),
  ('Psalm 37:4-5', 'Psalm', 37, 4, 5, 'Delight yourself in the LORD, and He will give you the desires of your heart. Commit your way to the LORD; trust in Him, and He will do it.'),
  ('Romans 5:3-5', 'Romans', 5, 3, 5, 'Not only that, but we also rejoice in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope. And hope does not disappoint us, because God has poured out His love into our hearts through the Holy Spirit, whom He has given us.'),
  ('Isaiah 30:15', 'Isaiah', 30, 15, NULL, 'For the Lord GOD, the Holy One of Israel, has said: By repentance and rest you would be saved; your strength would lie in quiet confidence — but you were not willing.'),
  ('Psalm 91:1-2', 'Psalm', 91, 1, 2, 'He who dwells in the shelter of the Most High will abide in the shadow of the Almighty. I will say to the LORD, You are my refuge and my fortress, my God, in whom I trust.'),
  ('2 Corinthians 5:17', '2 Corinthians', 5, 17, NULL, 'Therefore if anyone is in Christ, he is a new creation. The old has passed away. Behold, the new has come!'),
  ('Psalm 145:18-19', 'Psalm', 145, 18, 19, 'The LORD is near to all who call on Him, to all who call out to Him in truth. He fulfills the desires of those who fear Him; He hears their cry and saves them.'),
  ('1 Peter 2:9', '1 Peter', 2, 9, NULL, 'But you are a chosen people, a royal priesthood, a holy nation, a people for God''s own possession, to proclaim the virtues of Him who called you out of darkness into His marvelous light.'),
  ('John 8:31-32', 'John', 8, 31, 32, 'So He said to the Jews who had believed Him, If you continue in My word, you are truly My disciples. Then you will know the truth, and the truth will set you free.')
ON CONFLICT (reference) DO NOTHING;
