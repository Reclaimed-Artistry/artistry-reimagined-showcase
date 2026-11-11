import React, { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notificationPrefs";
import {
  disableGroupNotifications,
  enableGroupNotifications,
  groupNotificationPermission,
  notificationsSupported,
} from "@/lib/groupPush";
import { localTimeZone } from "@/lib/groupJourney";

/**
 * Turn notifications on or off for this device. Nothing else.
 *
 * There used to be a switch per kind of notification (group activity, the verse
 * of the day, the reading nudges) and a preview of today's verse. That is noise:
 * every reader wants all of it, and being asked to tick three boxes to receive
 * the thing you just asked for made a simple action look like paperwork. The
 * preferences still exist and still default to on — the wait is on the device,
 * not on the arrangement — so a reader who permits notifications starts getting
 * everything without deciding anything.
 *
 * The account row is still written on first visit, silently, because the
 * scheduler needs a time zone and falling back to UTC would send a Lagos reader
 * their verse at the wrong hour.
 */
export const NotificationSettings: React.FC<{
  userId: string;
}> = ({ userId }) => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [requesting, setRequesting] = useState(false);

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

  // Make sure this reader has a preferences row so the scheduler knows their
  // clock. Silent and unremarkable: the answers are all the defaults.
  useEffect(() => {
    let cancelled = false;
    void loadNotificationPreferences(userId)
      .then(async (prefs) => {
        if (cancelled || prefs.verseTimeZone !== localTimeZone()) return;
        try {
          await saveNotificationPreferences(userId, prefs);
        } catch {
          /* Not fatal: the defaults still apply without a stored row. */
        }
      })
      .catch(() => {
        /* Nothing to show either way. */
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
            A verse every morning and evening, three gentle nudges to keep reading, and news from
            your group.
          </p>
        </div>
      </div>

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
                : "Turn them on and that is the whole setup — nothing else to choose."}
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
    </div>
  );
};
