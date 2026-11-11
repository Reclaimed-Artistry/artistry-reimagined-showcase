import React, { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, Flame, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { loadVerseOfTheDay, type DailyVerse } from "@/lib/notificationPrefs";
import {
  activityPassageLabel,
  lastReadLabel,
  loadActivitySummary,
  loadGroupActivity,
  recordActivity,
  type GroupActivity,
  type MemberStreak,
} from "@/lib/groupActivity";

/**
 * "What is the group reading today, and who has shown up?"
 *
 * The card leads with the day's passage and a single button, because the two
 * questions a member actually has are "what am I reading" and "am I behind".
 * The streak is the answer to the second one, framed as a run to keep rather
 * than a debt to repay.
 */

/** Flame glyph whose size grows with the streak, capped so it stays tidy. */
const StreakFlame: React.FC<{ streak: number }> = ({ streak }) => {
  if (streak <= 0) return <Flame className="h-4 w-4 text-muted-foreground/40" />;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-600"
      title={`${streak} day streak`}
      aria-label={`${streak} day streak`}
    >
      {Array.from({ length: Math.min(streak, 4) }).map((_, index) => (
        <Flame
          key={index}
          className={index === Math.min(streak, 4) - 1 ? "h-4 w-4" : "h-3 w-3 opacity-50"}
          fill="currentColor"
        />
      ))}
      <span className="ml-0.5 text-xs font-bold tabular-nums">{streak}</span>
    </span>
  );
};

export const GroupActivityCard: React.FC<{
  groupId: string;
  groupTitle: string;
  currentUserId: string;
  /** Called after the reader records activity, so the parent can resync. */
  onRecorded?: () => void;
}> = ({ groupId, groupTitle, currentUserId, onRecorded }) => {
  const [activity, setActivity] = useState<GroupActivity | null>(null);
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [members, setMembers] = useState<MemberStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([loadGroupActivity(groupId), loadActivitySummary(groupId), loadVerseOfTheDay()])
      .then(([nextActivity, nextMembers, nextVerse]) => {
        if (cancelled) return;
        setActivity(nextActivity);
        setMembers(nextMembers);
        setVerse(nextVerse);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load today’s activity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => refresh(), [refresh]);

  const me = members.find((member) => member.userId === currentUserId);
  const hasReadToday = Boolean(me?.readToday);
  const passageLabel = activity ? activityPassageLabel(activity.passages) : "";
  const activeToday = members.filter((member) => member.readToday).length;
  const everyoneIn = members.length > 0 && activeToday === members.length;
  const todayIso = activity?.activityDate ?? new Date().toISOString().slice(0, 10);

  const handleStart = async () => {
    if (!activity) return;
    setRecording(true);
    try {
      await recordActivity(groupId, activity.planDay);
      toast.success(
        me && me.streak > 0
          ? `Day ${me.streak + 1} of your streak. Keep it going.`
          : "You're in. The streak starts here.",
      );
      refresh();
      onRecorded?.();
    } catch (recordError: unknown) {
      toast.error(recordError instanceof Error ? recordError.message : "Could not save that.");
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] to-transparent">
      {/* What the group is reading today. */}
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/15 p-1.5 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Today’s activity
                {activity && activity.totalDays > 0 ? ` · Day ${activity.planDay} of ${activity.totalDays}` : ""}
              </p>
              <p className="text-sm font-semibold leading-tight">{groupTitle}</p>
            </div>
          </div>
          {activity && (
            <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold">
              <Users className="h-3 w-3 text-muted-foreground" />
              {activeToday}/{members.length} today
            </span>
          )}
        </div>

        {loading && !activity ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading today’s reading…
          </p>
        ) : error ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        ) : !activity ? (
          <p className="mt-3 text-xs text-muted-foreground">
            This group has no shared plan yet. Add one to see a daily reading here.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-snug">{activity.title}</p>
            {passageLabel && (
              <p className="mt-1 font-mono text-[11px] text-primary">{passageLabel}</p>
            )}
            {activity.note && (
              <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {activity.note}
              </p>
            )}

            {/*
              The same verse the rest of Selah shows today. It is identical for
              every member because it is chosen by date, not per group — the
              group reading is a separate selection and belongs above it.
            */}
            {verse && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-card/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Verse of the day
                </p>
                <p className="mt-1 text-xs font-semibold">{verse.reference}</p>
                <p className="mt-0.5 line-clamp-3 text-[11px] leading-4 text-muted-foreground">
                  {verse.text}
                </p>
              </div>
            )}

            {/* Start / done. */}
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={recording || hasReadToday}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition disabled:cursor-default ${
                hasReadToday
                  ? "bg-emerald-600/15 text-emerald-700"
                  : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              }`}
            >
              {recording ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasReadToday ? (
                <Check className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              {recording
                ? "Saving…"
                : hasReadToday
                  ? "You’re in for today — open the passage"
                  : me && me.streak > 0
                    ? `Keep your ${me.streak}-day streak — I read today`
                    : "Start today’s reading"}
            </button>
            {everyoneIn && (
              <p className="mt-2 text-center text-[11px] font-semibold text-emerald-700">
                Everyone has read today. 🎉
              </p>
            )}
          </>
        )}
      </div>

      {/* Who has shown up. */}
      {members.length > 0 && (
        <div className="border-t border-primary/15 bg-card/60 px-4 py-3">
          <ul className="space-y-1.5">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      member.readToday ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`}
                  />
                  <span className={`truncate ${member.isMe ? "font-bold" : "font-medium"}`}>
                    {member.isMe ? "You" : member.displayName}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {member.readToday ? "today" : lastReadLabel(member, todayIso)}
                  </span>
                  <StreakFlame streak={member.streak} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
