import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Database,
  Feather,
  BellRing,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatReference, getBookMeta } from "@/data/canonicalBooks";
import { getDevotionalForDate } from "@/data/dailyReflections";
import { getChapterContent } from "@/lib/bibleProviders";
import { useBibleApp } from "@/context/useBibleApp";
import type { AppSection } from "@/types/bible";
import { Switch } from "@/components/ui/switch";
import { disableRemotePushReminder, enableRemotePushReminder, REMOTE_PUSH_ACTIVE_KEY, updateRemotePushReminder } from "@/lib/webPushReminders";

type HomeDashboardProps = {
  onSelectSection: (section: AppSection) => void;
  onOpenCompanion: () => void;
};

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const HOME_LINKS: {
  section: AppSection | "companion";
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { section: "reader", title: "Read", description: "Open the Bible and continue your reading.", icon: <BookOpen className="h-5 w-5" />, color: "text-blue-600 bg-blue-500/10" },
  { section: "versions", title: "Vault", description: "Browse, compare, and manage Bible editions.", icon: <Database className="h-5 w-5" />, color: "text-violet-600 bg-violet-500/10" },
  { section: "study", title: "Study", description: "Search Scripture, notes, memory, and progress.", icon: <Search className="h-5 w-5" />, color: "text-emerald-600 bg-emerald-500/10" },
  { section: "companion", title: "Selah Bible Companion", description: "Explore Scripture with local study tools.", icon: <Sparkles className="h-5 w-5" />, color: "text-amber-600 bg-amber-500/10" },
  { section: "kids", title: "Kids’ Stories", description: "Read Bible stories together, from all 66 books.", icon: <BookHeart className="h-5 w-5" />, color: "text-rose-600 bg-rose-500/10" },
  { section: "plans", title: "Reading Plans", description: "Choose a plan and build a steady rhythm.", icon: <CalendarDays className="h-5 w-5" />, color: "text-cyan-600 bg-cyan-500/10" },
  { section: "reflection", title: "Reflect", description: "Make space for prayer and daily reflection.", icon: <Feather className="h-5 w-5" />, color: "text-fuchsia-600 bg-fuchsia-500/10" },
  { section: "about", title: "About Selah", description: "Learn how the Bible app works.", icon: <CircleHelp className="h-5 w-5" />, color: "text-slate-600 bg-slate-500/10" },
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onSelectSection, onOpenCompanion }) => {
  const {
    activeVersion,
    bookNumber,
    chapter,
    navigateTo,
    prefs,
    updatePrefs,
  } = useBibleApp();
  const dateKey = todayKey();
  const devotional = useMemo(() => getDevotionalForDate(dateKey), [dateKey]);
  const devotionalReference = formatReference(
    devotional.bookNumber,
    devotional.chapter,
    devotional.verse,
    devotional.verseEnd,
  );
  const [verseText, setVerseText] = useState(devotional.fallbackText);
  const [notificationPermission, setNotificationPermission] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [remotePushActive, setRemotePushActive] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(REMOTE_PUSH_ACTIVE_KEY) === "true",
  );
  const lastBook = getBookMeta(bookNumber);

  useEffect(() => {
    let cancelled = false;
    setVerseText(devotional.fallbackText);
    void getChapterContent(activeVersion, devotional.bookNumber, devotional.chapter)
      .then(({ chapterData }) => {
        if (cancelled) return;
        const end = devotional.verseEnd || devotional.verse;
        const text = chapterData.verses
          .filter((verse) => verse.verse >= devotional.verse && verse.verse <= end)
          .map((verse) => verse.text)
          .join(" ");
        if (text) setVerseText(text);
      })
      .catch(() => {
        // Keep the curated passage text available if this edition cannot be loaded offline.
      });
    return () => {
      cancelled = true;
    };
  }, [activeVersion, devotional]);

  const setReminderEnabled = async (enabled: boolean) => {
    if (!enabled) {
      try {
        await disableRemotePushReminder();
      } catch {
        toast.info("Reminder turned off on this device", {
          description: "If this device is offline, its saved push subscription will expire automatically when the service next contacts it.",
        });
      } finally {
        setRemotePushActive(false);
        updatePrefs({ dailyStudyReminderEnabled: false });
      }
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;
      if (permission === "default") {
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = "denied";
        }
      }
      setNotificationPermission(permission);
      if (permission === "granted") {
        try {
          await enableRemotePushReminder(prefs.dailyStudyReminderTime);
          setRemotePushActive(true);
          toast.success("Device push reminders enabled", {
            description: "Selah can now send your daily reminder to this device, even when the app is closed.",
          });
        } catch (error) {
          setRemotePushActive(false);
          toast.info("Local reminder saved", {
            description: error instanceof Error
              ? `${error.message} The reminder will still appear while Selah is open.`
              : "Remote push could not be configured. The reminder will still appear while Selah is open.",
          });
        }
      } else {
        toast.info("In-app reminder saved", {
          description: "Notifications are blocked in device settings. Selah can still remind you while it is open.",
        });
      }
    } else {
      setNotificationPermission("unsupported");
      setRemotePushActive(false);
      toast.info("In-app reminder saved", {
        description: "This device does not support push notifications. Selah can still remind you while it is open.",
      });
    }
    updatePrefs({ dailyStudyReminderEnabled: true });
  };

  const handleReminderTimeChange = (reminderTime: string) => {
    updatePrefs({ dailyStudyReminderTime: reminderTime });
    if (remotePushActive) {
      void updateRemotePushReminder(reminderTime).catch((error: unknown) => {
        localStorage.removeItem(REMOTE_PUSH_ACTIVE_KEY);
        setRemotePushActive(false);
        toast.error(error instanceof Error ? error.message : "Could not update your push reminder time.");
      });
    }
  };

  const handleReadVerse = () => {
    navigateTo(devotional.bookNumber, devotional.chapter, devotional.verse, devotional.verseEnd);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 pb-32 pt-7 sm:px-8 sm:pt-10">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_.8fr]">
        <article className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Verse of the day
            </div>
            <blockquote className="mt-5 max-w-3xl font-scripture text-sm leading-6 text-foreground">
              “{verseText}”
            </blockquote>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-sm font-bold text-primary">{devotionalReference}</span>
              <button
                type="button"
                onClick={handleReadVerse}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Read this passage <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-7">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Pick up where you left off
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">{lastBook.name} {chapter}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your reading place is saved on this device, ready whenever you return.</p>
          </div>
          <button
            type="button"
            onClick={() => onSelectSection("reader")}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/15"
          >
            Continue reading <ArrowRight className="h-4 w-4" />
          </button>
        </article>
      </section>

      <section aria-labelledby="home-menu-heading">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Your Selah space</p>
          <h2 id="home-menu-heading" className="mt-1 font-display text-2xl font-bold">Where would you like to go?</h2>
        </div>
        <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
          {HOME_LINKS.filter((link) => link.section !== "companion" || prefs.showBibleCompanion).map((link) => (
            <button
              key={link.section}
              type="button"
              onClick={() => link.section === "companion" ? onOpenCompanion() : onSelectSection(link.section)}
              className="flex h-full min-h-36 flex-col items-start gap-2.5 rounded-2xl border border-border/80 bg-card p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:p-4"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${link.color}`}>{link.icon}</span>
              <span className="min-w-0">
                <span className="block min-h-10 line-clamp-2 text-sm font-semibold leading-5">{link.title}</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">{link.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="reading-reminder-heading" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><BellRing className="h-5 w-5" /></span>
          <div>
            <h2 id="reading-reminder-heading" className="font-semibold">A gentle daily reading reminder</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              {prefs.dailyStudyReminderEnabled
                ? remotePushActive
                  ? "Device push is on. Selah will send this reminder to your notification panel at the chosen time, even when the app is closed, as long as this device is online and notifications remain allowed."
                  : "Your local reminder is on. It can notify you while Selah is open or running in the background; turn on device notifications below to receive reminders while it is closed."
                : "Choose a time for a quiet nudge to read Scripture. Enable device notifications to receive the reminder even while Selah is closed."}
            </p>
            <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              Reminder time
              <input
                type="time"
                aria-label="Daily reading reminder time"
                value={prefs.dailyStudyReminderTime}
                onChange={(event) => handleReminderTimeChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              />
            </label>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {remotePushActive
                ? "Device notification permission is granted and the daily push subscription is active."
                : notificationPermission === "granted"
                ? "Device notifications are allowed. Turn this reminder on to register daily push delivery."
                : notificationPermission === "denied"
                ? "Notifications are blocked in device settings; an in-app reminder will still appear while Selah is open."
                : notificationPermission === "unsupported"
                ? "This device does not support web push; an in-app reminder will still appear while Selah is open."
                : "Turning on the reminder will ask whether Selah may send device notifications."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-semibold">{prefs.dailyStudyReminderEnabled ? "On" : "Off"}</span>
          <Switch
            aria-label="Enable daily reading reminder"
            checked={prefs.dailyStudyReminderEnabled}
            onCheckedChange={(enabled) => void setReminderEnabled(enabled)}
          />
        </div>
      </section>
    </div>
  );
};
