import { supabase } from "./cloudWorkspace";
import { BOOK_BY_NUMBER } from "@/data/canonicalBooks";

/**
 * Today's activity for a group, and the streaks around it.
 *
 * Kept separate from `groupJourney` because these are two different questions:
 * that one is "how far through the plan is everyone", this one is "what are we
 * reading today and who has shown up".
 */

export interface GroupActivity {
  activityDate: string;
  planDay: number;
  title: string;
  passages: Array<{ bookNumber: number; startChapter: number; endChapter: number }>;
  note: string | null;
  groupStart: string;
  totalDays: number;
}

export interface MemberStreak {
  userId: string;
  displayName: string;
  streak: number;
  readToday: boolean;
  readDays: number;
  lastReadOn: string | null;
  isMe: boolean;
}

export async function loadGroupActivity(groupId: string): Promise<GroupActivity | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("group_current_activity", { p_group_id: groupId });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        activity_date: string;
        plan_day: number;
        title: string;
        passages: GroupActivity["passages"];
        note: string | null;
        group_start: string;
        total_days: number;
      }
    | undefined;
  if (!row) return null;
  return {
    activityDate: row.activity_date,
    planDay: row.plan_day,
    title: row.title,
    passages: Array.isArray(row.passages) ? row.passages : [],
    note: row.note,
    groupStart: row.group_start,
    totalDays: row.total_days,
  };
}

export async function loadActivitySummary(groupId: string): Promise<MemberStreak[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("group_activity_summary", { p_group_id: groupId });
  if (error) throw new Error(error.message);
  return ((data || []) as Array<{
    user_id: string;
    display_name: string;
    streak: number;
    read_today: boolean;
    read_days: number;
    last_read_on: string | null;
    is_me: boolean;
  }>).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    streak: row.streak,
    readToday: row.read_today,
    readDays: row.read_days,
    lastReadOn: row.last_read_on,
    isMe: row.is_me,
  }));
}

/** Marks today as read. Returns the member's new total of active days. */
export async function recordActivity(
  groupId: string,
  planDay: number,
  note?: string,
): Promise<number> {
  if (!supabase) throw new Error("Cloud sync is not configured.");
  const { data, error } = await supabase.rpc("record_group_activity", {
    p_group_id: groupId,
    p_date: null,
    p_plan_day: planDay,
    p_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

/** "Genesis 1–3, Psalm 23" for the activity card. */
export function activityPassageLabel(passages: GroupActivity["passages"]): string {
  return passages
    .map((passage) => {
      const name = BOOK_BY_NUMBER.get(passage.bookNumber)?.name;
      if (!name) return "";
      return passage.endChapter > passage.startChapter
        ? `${name} ${passage.startChapter}–${passage.endChapter}`
        : `${name} ${passage.startChapter}`;
    })
    .filter(Boolean)
    .join(" · ");
}

/**
 * The group's shared streak: consecutive days on which at least one member read.
 *
 * Deliberately "someone showed up" rather than "everyone did" — one missed day
 * should not reset a group of ten, and the number exists to encourage, not to
 * enforce. A member's own streak already encodes consecutive days, so the
 * shared run that includes today is the longest of those still alive today.
 */
export function groupStreak(members: MemberStreak[]): number {
  const runs = members.filter((member) => member.readToday).map((member) => member.streak);
  return runs.length === 0 ? 0 : Math.max(...runs);
}

/** "today", "yesterday", "3 days ago". */
export function lastReadLabel(member: MemberStreak, todayIso: string): string {
  if (!member.lastReadOn) return "Has not read yet";
  const days = Math.max(
    0,
    Math.round(
      (new Date(todayIso).getTime() - new Date(member.lastReadOn).getTime()) / 86_400_000,
    ),
  );
  if (days === 0) return "Read today";
  if (days === 1) return "Read yesterday";
  return `Last read ${days} days ago`;
}
