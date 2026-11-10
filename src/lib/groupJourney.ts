import { supabase } from "./cloudWorkspace";

/**
 * The reading journey, as the group sees it.
 *
 * Members can see each other's progress — that is the point of a reading group —
 * so this reads a roster function rather than filtering per-user rows in the
 * client. `group_member_overview` is SECURITY DEFINER and re-checks membership
 * itself, so it cannot be used to enumerate a group you are not in.
 */

export interface GroupMemberProgress {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  joinedAt: string;
  /** When they first opened the plan. Null means they have not started. */
  startedAt: string | null;
  currentDay: number;
  daysCompleted: number;
  planDays: number;
  lastActiveAt: string | null;
}

interface MemberOverviewRow {
  user_id: string;
  display_name: string;
  role: string;
  joined_at: string;
  started_at: string | null;
  current_day: number;
  days_completed: number;
  plan_days: number;
  last_active_at: string | null;
}

export async function loadGroupRoster(groupId: string): Promise<GroupMemberProgress[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("group_member_overview", { p_group_id: groupId });
  if (error) throw new Error(error.message);
  return ((data || []) as MemberOverviewRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role === "owner" ? "owner" : "member",
    joinedAt: row.joined_at,
    startedAt: row.started_at,
    currentDay: row.current_day,
    daysCompleted: row.days_completed,
    planDays: row.plan_days,
    lastActiveAt: row.last_active_at,
  }));
}

/** Percent complete, clamped so a stale plan cannot show 120%. */
export function memberPercent(member: GroupMemberProgress): number {
  if (!member.planDays || member.planDays <= 0) return 0;
  return Math.min(100, Math.round((member.daysCompleted / member.planDays) * 100));
}

/** "Started 3 days ago", "Not started yet". */
export function startedLabel(member: GroupMemberProgress): string {
  if (!member.startedAt) return "Not started yet";
  return `Started ${relativeDay(member.startedAt)}`;
}

/** "Active today", "Last read 4 days ago". */
export function activityLabel(member: GroupMemberProgress): string {
  if (!member.lastActiveAt) return "No activity yet";
  const days = daysAgo(member.lastActiveAt);
  if (days <= 0) return "Active today";
  if (days === 1) return "Active yesterday";
  return `Last read ${days} days ago`;
}

function daysAgo(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  return Math.max(0, days);
}

function relativeDay(iso: string): string {
  const days = daysAgo(iso);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}

/**
 * The reading for a given day of a plan, labelled the way the app shows it.
 *
 * The database has no book table, so the passage label has to be built here
 * where the canon lives. `CANNON_BY_NUMBER` is imported lazily by the caller to
 * keep this module free of data imports.
 */
export function describePassage(
  passages: ReadonlyArray<{ bookNumber: number; startChapter: number; endChapter: number }>,
  bookName: (bookNumber: number) => string,
): string {
  if (passages.length === 0) return "";
  return passages
    .map((passage) => {
      const name = bookName(passage.bookNumber);
      if (!name) return "";
      return passage.endChapter > passage.startChapter
        ? `${name} ${passage.startChapter}–${passage.endChapter}`
        : `${name} ${passage.startChapter}`;
    })
    .filter(Boolean)
    .join(", ");
}

/** Sends the owner's reminder. Returns how many members were notified. */
export async function sendGroupReminder(
  groupId: string,
  note: string,
  passage: string,
): Promise<number> {
  if (!supabase) throw new Error("Cloud sync is not configured.");
  const { data, error } = await supabase.rpc("send_group_reminder", {
    p_group_id: groupId,
    p_note: note.trim() || null,
    p_passage: passage.trim() || null,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

export interface GroupReminderSettings {
  enabled: boolean;
  time: string | null;
  timeZone: string | null;
}

export async function loadGroupReminder(groupId: string): Promise<GroupReminderSettings> {
  if (!supabase) return { enabled: false, time: null, timeZone: null };
  const { data, error } = await supabase
    .from("reading_groups")
    .select("daily_reminder_enabled,daily_reminder_time,daily_reminder_time_zone")
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as {
    daily_reminder_enabled?: boolean;
    daily_reminder_time?: string | null;
    daily_reminder_time_zone?: string | null;
  } | null;
  return {
    enabled: Boolean(row?.daily_reminder_enabled),
    // Postgres returns `HH:MM:SS`; an <input type="time"> wants `HH:MM`.
    time: row?.daily_reminder_time ? row.daily_reminder_time.slice(0, 5) : null,
    timeZone: row?.daily_reminder_time_zone ?? null,
  };
}

export async function saveGroupReminder(
  groupId: string,
  enabled: boolean,
  time: string,
  timeZone: string,
): Promise<void> {
  if (!supabase) throw new Error("Cloud sync is not configured.");
  const { error } = await supabase.rpc("set_group_reminder", {
    p_group_id: groupId,
    p_enabled: enabled,
    p_time: enabled ? time : null,
    p_time_zone: timeZone,
  });
  if (error) throw new Error(error.message);
}

/** The device's time zone, falling back to UTC where the API is unavailable. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
