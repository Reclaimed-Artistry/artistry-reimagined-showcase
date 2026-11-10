import React, { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, BookOpen, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PREFERENCES,
  loadNotificationPreferences,
  loadVerseOfTheDay,
  saveNotificationPreferences,
  type DailyVerse,
  type NotificationPreferences,
} from "@/lib/notificationPrefs";
import {
  disableGroupNotifications,
  enableGroupNotifications,
  groupNotificationPermission,
  notificationsSupported,
} from "@/lib/groupPush";
import { localTimeZone } from "@/lib/groupJourney";

/**
 * One place to turn notifications on and choose what arrives.
 *
 * Two different permissions are involved and they are easy to confuse:
 *
 * - **Device permission** — may this browser or phone show a notification at
 *   all? Until this is granted nothing can be delivered, whatever the settings
 *   below say.
 * - **Account preferences** — of the things we are allowed to send, which do you
 *   want? These follow the reader across devices.
 *
 * The screen shows both, in that order, because a reader who turns "Verse of the
 * day" on while the device is still blocked will never see a verse and will
 * assume the switch is broken.
 */
export const NotificationSettings: React.FC<{
  userId: string;
}> = ({ userId }) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [requesting, setRequesting] = useState(false);
  const [verse, setVerse] = useState<DailyVerse | null>(null);

  const [supported] = useState(() => {
    try {
      return notificationsSupported();
    } catch {
      return false;
    }
  });

  const refreshPermission = useCallback(async () => {
    if (!supported) {
      setPermission("unsupported");
      return;
    }
    try {
      setPermission(await groupNotificationPermission());
    } catch {
      setPermission("unsupported");
    }
  }, [supported]);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  useEffect(() => {
    let cancelled = false;
    void loadNotificationPreferences(userId)
      .then(async (next) => {
        if (cancelled) return;
        setPrefs(next);
        setLoaded(true);
        // Write the row back when the reader has never opened this screen: the
        // scheduler needs a time zone, and their absence means every verse
        // would be timed against UTC rather than their own clock.
        if (next.verseTimeZone === localTimeZone()) {
          try {
            await saveNotificationPreferences(userId, next);
          } catch {
            /* Not fatal: the defaults still apply without a stored row. */
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    void loadVerseOfTheDay()
      .then((next) => {
        if (!cancelled) setVerse(next);
      })
      .catch(() => {
        /* The verse preview is a nicety; the settings still work without it. */
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const result = await enableGroupNotifications();
      await refreshPermission();
      if (result.status === "granted") {
        toast.success("Notifications are on for this device.");
      } else if (result.status === "denied") {
        toast.error("Notifications are blocked. Allow them for Selah in your device settings.");
      } else if (result.status === "unsupported") {
        toast.error(result.reason);
      } else {
        toast.error(result.reason);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not turn notifications on.");
    } finally {
      setRequesting(false);
    }
  };

  const handleDisable = async () => {
    setRequesting(true);
    try {
      await disableGroupNotifications();
      toast.success("Notifications are off for this device.");
    } catch {
      toast.error("Could not turn notifications off.");
    } finally {
      setRequesting(false);
    }
  };

  const updatePrefs = async (patch: Partial<NotificationPreferences>) => {
    const next = { ...prefs, ...patch, verseTimeZone: prefs.verseTimeZone || localTimeZone() };
    setPrefs(next);
    setSaving(true);
    try {
      await saveNotificationPreferences(userId, next);
    } catch {
      toast.error("Could not save that setting.");
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  const granted = permission === "granted";
  const blocked = permission === "denied";

  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/12 p-2 text-primary">
          <BellRing className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Notifications</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Group activity, a verse every morning and evening, and three gentle nudges to keep reading.
          </p>
        </div>
      </div>

      {/* 1. Device permission. */}
      <div className="mt-4 rounded-xl border border-border/70 bg-card p-3">
        {!supported ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
            This browser cannot show notifications. On iPhone or iPad, add Selah to your Home
            Screen first, then open it from there.
          </p>
        ) : granted ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-700">Notifications are on for this device</p>
            <button
              type="button"
              onClick={() => void handleDisable()}
              disabled={requesting}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent disabled:opacity-50"
            >
              Turn off on this device
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {blocked
                ? "Notifications are blocked for Selah. Allow them in your browser or phone settings, then come back."
                : "Turn on notifications to hear about your group and receive the daily verse."}
            </p>
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={requesting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
              {requesting ? "Turning on…" : "Turn on notifications"}
            </button>
          </div>
        )}
      </div>

      {/* 2. What arrives. */}
      <fieldset className="mt-3 space-y-2" disabled={!loaded || saving}>
        <legend className="sr-only">What to notify me about</legend>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold">Group activity</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
              Questions, answers, progress, and reminders from your group owner.
            </span>
          </span>
          <input
            type="checkbox"
            checked={prefs.groupActivity}
            onChange={(event) => void updatePrefs({ groupActivity: event.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold">Continue where you stopped</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-muted-foreground">
              <BookOpen className="h-3 w-3 text-primary" /> 8:00 am
              <span aria-hidden>·</span> 1:00 pm
              <span aria-hidden>·</span> 7:00 pm
            </span>
          </span>
          <input
            type="checkbox"
            checked={prefs.readingReminder}
            onChange={(event) => void updatePrefs({ readingReminder: event.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold">Verse of the day</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-muted-foreground">
              <Sun className="h-3 w-3 text-amber-500" /> 6:00 am
              <span aria-hidden>·</span>
              <Moon className="h-3 w-3 text-indigo-500" /> 9:00 pm
              <span className="text-[10px]">({prefs.verseTimeZone})</span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={prefs.dailyVerse}
            onChange={(event) => void updatePrefs({ dailyVerse: event.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
          />
        </label>
      </fieldset>

      {verse && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
            Today’s verse
          </p>
          <p className="mt-1 text-xs font-semibold">{verse.reference}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
            {verse.text}
          </p>
        </div>
      )}

      {saving && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
};
