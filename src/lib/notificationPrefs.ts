import { supabase } from "./cloudWorkspace";

/**
 * What a reader wants to be notified about.
 *
 * Defaults are on. A new member who never opens this screen should still hear
 * about their group, so the table stores opt-outs rather than opt-ins: an absent
 * row means "both on".
 */

export interface NotificationPreferences {
  groupActivity: boolean;
  dailyVerse: boolean;
  /** The "continue where you stopped" nudge, three times a day. */
  readingReminder: boolean;
  verseTimeZone: string;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  groupActivity: true,
  dailyVerse: true,
  readingReminder: true,
  verseTimeZone: localZone(),
};

function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function loadNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  if (!supabase) return { ...DEFAULT_PREFERENCES, verseTimeZone: localZone() };
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("group_activity,daily_verse,reading_reminder,verse_time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const row = data as {
    group_activity?: boolean;
    daily_verse?: boolean;
    reading_reminder?: boolean;
    verse_time_zone?: string | null;
  } | null;

  return {
    groupActivity: row?.group_activity ?? true,
    dailyVerse: row?.daily_verse ?? true,
    readingReminder: row?.reading_reminder ?? true,
    // A reader who has never set one gets their device zone, which is what the
    // 06:00 and 21:00 slots are measured against.
    verseTimeZone: row?.verse_time_zone || localZone(),
  };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  if (!supabase) throw new Error("Cloud sync is not configured.");
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      group_activity: preferences.groupActivity,
      daily_verse: preferences.dailyVerse,
      reading_reminder: preferences.readingReminder,
      verse_time_zone: preferences.verseTimeZone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export interface DailyVerse {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  text: string;
  morningNote: string | null;
  eveningNote: string | null;
}

interface VerseRow {
  reference: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  text: string;
  morning_note: string | null;
  evening_note: string | null;
}

/** Today's verse, or null before the list has been seeded. */
export async function loadVerseOfTheDay(): Promise<DailyVerse | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("verse_of_the_day");
  if (error) throw new Error(error.message);
  // The function returns a set; PostgREST hands back an array of one.
  const row = (Array.isArray(data) ? data[0] : data) as VerseRow | undefined;
  if (!row) return null;
  return {
    reference: row.reference,
    book: row.book,
    chapter: row.chapter,
    verseStart: row.verse_start,
    verseEnd: row.verse_end,
    text: row.text,
    morningNote: row.morning_note,
    eveningNote: row.evening_note,
  };
}
