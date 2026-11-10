import React, { useCallback, useEffect, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Loader2, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  activityLabel,
  loadGroupReminder,
  loadGroupRoster,
  memberPercent,
  saveGroupReminder,
  sendGroupReminder,
  startedLabel,
  localTimeZone,
  type GroupMemberProgress,
  type GroupReminderSettings,
} from "@/lib/groupJourney";

/**
 * Who is on the journey, and how far along.
 *
 * The group card used to render "Reader 3f8a2" because it only had progress
 * rows, which carry a user id and nothing else. This shows people by name, when
 * they started, where they are today, and when they last read — the things that
 * make a group feel like one.
 *
 * Owners also get the reminder controls here, next to the roster, because a
 * nudge only makes sense in the context of who has fallen behind.
 */

/** A single member's row. */
const MemberRow: React.FC<{
  member: GroupMemberProgress;
  isSelf: boolean;
}> = ({ member, isSelf }) => {
  const percent = memberPercent(member);
  const started = Boolean(member.startedAt);

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          started ? "bg-primary/12 text-primary" : "bg-secondary text-muted-foreground"
        }`}
      >
        {started ? member.displayName.slice(0, 1).toUpperCase() : <UserRound className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-semibold">
            {isSelf ? "You" : member.displayName}
          </span>
          {member.role === "owner" && (
            <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Owner
            </span>
          )}
        </div>

        {started ? (
          <>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {member.daysCompleted}/{member.planDays || "?"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Day {member.currentDay} · {startedLabel(member)} · {activityLabel(member)}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {startedLabel(member)} · {activityLabel(member)}
          </p>
        )}
      </div>

      {member.planDays > 0 && member.daysCompleted >= member.planDays && (
        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-label="Plan complete" />
      )}
    </li>
  );
};

export const GroupJourney: React.FC<{
  groupId: string;
  groupTitle: string;
  currentUserId: string;
  isOwner: boolean;
  planDays: number;
  todayPassage: string;
  /** Bumped by the parent when progress is published, to refetch the roster. */
  refreshKey?: number;
}> = ({ groupId, groupTitle, currentUserId, isOwner, planDays, todayPassage, refreshKey = 0 }) => {
  const [roster, setRoster] = useState<GroupMemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reminder, setReminder] = useState<GroupReminderSettings>({
    enabled: false,
    time: null,
    timeZone: null,
  });
  const [reminderLoaded, setReminderLoaded] = useState(false);
  const [reminderTime, setReminderTime] = useState("07:00");
  const [savingReminder, setSavingReminder] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    void loadGroupRoster(groupId)
      .then((rows) => {
        if (cancelled) return;
        setRoster(rows);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load the group.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => refresh(), [refresh, refreshKey]);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    void loadGroupReminder(groupId)
      .then((settings) => {
        if (cancelled) return;
        setReminder(settings);
        if (settings.time) setReminderTime(settings.time);
        setReminderLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setReminderLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, isOwner]);

  const handleRemind = async () => {
    setSending(true);
    try {
      const count = await sendGroupReminder(groupId, note, todayPassage);
      toast.success(
        count === 0
          ? "Reminder saved, but there is nobody else in this group yet."
          : count === 1
            ? "Reminder sent to 1 member."
            : `Reminder sent to ${count} members.`,
      );
      setNote("");
    } catch (sendError: unknown) {
      toast.error(sendError instanceof Error ? sendError.message : "Could not send the reminder.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleSchedule = async (enabled: boolean) => {
    setSavingReminder(true);
    try {
      await saveGroupReminder(groupId, enabled, reminderTime, localTimeZone());
      setReminder({ enabled, time: enabled ? reminderTime : null, timeZone: localTimeZone() });
      toast.success(
        enabled
          ? `Everyone gets a nudge at ${reminderTime} each day.`
          : "Daily reminder turned off. You can still send one whenever you like.",
      );
    } catch (saveError: unknown) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save the reminder.");
    } finally {
      setSavingReminder(false);
    }
  };

  const handleTimeChange = async (value: string) => {
    setReminderTime(value);
    if (!reminder.enabled) return;
    // Saving on change keeps the schedule honest without a second Save button.
    setSavingReminder(true);
    try {
      await saveGroupReminder(groupId, true, value, localTimeZone());
      setReminder((current) => ({ ...current, time: value }));
    } catch {
      toast.error("Could not update the reminder time.");
    } finally {
      setSavingReminder(false);
    }
  };

  const startedCount = roster.filter((member) => member.startedAt).length;

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">The journey</h4>
        <span className="text-[11px] text-muted-foreground">
          {startedCount} of {roster.length} {roster.length === 1 ? "member has" : "members have"} started
          {planDays > 0 ? ` · ${planDays}-day plan` : ""}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {loading && roster.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the group…
        </p>
      ) : roster.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nobody else has joined yet. Share the invite code to start the journey together.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {roster.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              isSelf={member.userId === currentUserId}
            />
          ))}
        </ul>
      )}

      {isOwner && (
        <div className="mt-4 space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs font-semibold">Remind everyone to read</p>
          </div>

          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="Add a note (optional) — e.g. “Let’s finish this week strong.”"
            aria-label="Reminder note"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
          />

          {todayPassage && (
            <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              Today’s reading: <strong className="font-semibold">{todayPassage}</strong>
            </p>
          )}

          <button
            type="button"
            onClick={handleRemind}
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            {sending ? "Sending…" : `Send to all ${roster.length > 1 ? `${roster.length - 1} members` : "members"}`}
          </button>

          <div className="border-t border-primary/15 pt-3">
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[11px] font-semibold">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Also remind daily at
              </span>
              <input
                type="checkbox"
                checked={reminder.enabled}
                disabled={!reminderLoaded || savingReminder}
                onChange={(event) => void handleToggleSchedule(event.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                aria-label="Send a daily reminder to the group"
              />
            </label>

            {reminder.enabled && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="time"
                  value={reminderTime}
                  disabled={savingReminder}
                  onChange={(event) => void handleTimeChange(event.target.value)}
                  aria-label="Daily reminder time"
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  {localTimeZone()}
                  {savingReminder ? " · saving…" : ""}
                </span>
              </div>
            )}

            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              Reminders reach members who turned notifications on. {groupTitle} members can opt out
              in their own notification settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
