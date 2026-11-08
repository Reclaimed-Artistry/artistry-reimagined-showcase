import { useEffect } from "react";
import { toast } from "sonner";
import { getBookMeta } from "@/data/canonicalBooks";
import { useBibleApp } from "@/context/useBibleApp";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const openReader = () => window.dispatchEvent(new CustomEvent("selah:open-reader"));

export const ReadingReminderScheduler: React.FC = () => {
  const { prefs, bookNumber, chapter } = useBibleApp();

  useEffect(() => {
    if (!prefs.dailyStudyReminderEnabled) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.dailyStudyReminderTime)) return;

    let notifiedDate = "";
    const checkReminder = () => {
      const now = new Date();
      const today = dateKey(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [targetHour, targetMinute] = prefs.dailyStudyReminderTime.split(":").map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      let lastSent = "";
      try {
        lastSent = localStorage.getItem("selah_reading_reminder_sent") || "";
      } catch {
        // Keep an in-memory guard for private browsing modes that block local storage.
      }
      if (currentMinutes < targetMinutes || lastSent === today || notifiedDate === today) return;

      // Write the daily marker before displaying so multiple checks/tabs don't repeat the reminder.
      notifiedDate = today;
      try {
        localStorage.setItem("selah_reading_reminder_sent", today);
      } catch {
        // The reminder still works for the current app session when storage is unavailable.
      }
      const place = `${getBookMeta(bookNumber).name} ${chapter}`;
      const title = "A quiet moment with Scripture";
      const body = `Read a short passage or continue where you left off at ${place}.`;

      const showInAppReminder = () => toast(title, {
        description: body,
        duration: 12000,
        action: { label: "Continue reading", onClick: openReader },
      });
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const options: NotificationOptions = {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: `selah-reading-reminder-${today}`,
          data: { url: "/?section=reader" },
        };
        const showPageNotification = () => {
          try {
            const notification = new Notification(title, options);
            notification.onclick = () => {
              window.focus();
              openReader();
              notification.close();
            };
          } catch {
            showInAppReminder();
          }
        };
        if ("serviceWorker" in navigator) {
          void navigator.serviceWorker.getRegistration()
            .then((registration) => {
              if (!registration) throw new Error("No service worker is registered.");
              return registration.showNotification(title, options);
            })
            .catch(showPageNotification);
        } else {
          showPageNotification();
        }
        return;
      }

      showInAppReminder();
    };

    checkReminder();
    const interval = window.setInterval(checkReminder, 30_000);
    document.addEventListener("visibilitychange", checkReminder);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkReminder);
    };
  }, [prefs.dailyStudyReminderEnabled, prefs.dailyStudyReminderTime, bookNumber, chapter]);

  return null;
};
