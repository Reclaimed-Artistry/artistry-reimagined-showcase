import { supabase } from "@/lib/cloudWorkspace";
import { Capacitor } from "@capacitor/core";

/**
 * Push notification registration for web, Android, and iOS.
 *
 * There are two delivery paths and they are genuinely different:
 *
 * - **Web** goes through a service worker PushSubscription (VAPID). The
 *   existing `push-reminders` edge function already owns that pipeline for the
 *   daily reading reminder, so group notices reuse the same subscription row;
 *   all it needed was the account it belongs to.
 * - **Android / iOS** go through FCM / APNs. The native plugin hands back an
 *   opaque device token which is stored against the account, and the same edge
 *   function delivers to it.
 *
 * Everything here is written so the app degrades quietly: a device that refuses
 * permission, a build with no native plugin, or a browser without PushManager
 * all simply end up with no registration instead of an error the reader cannot
 * act on.
 */

export type PushPlatform = "web" | "android" | "ios" | "unsupported";

export type PushRegistrationResult =
  | { status: "granted"; platform: PushPlatform }
  | { status: "denied" }
  | { status: "unsupported"; reason: string }
  | { status: "error"; reason: string };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
const supabaseApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const REMINDER_SUBSCRIPTION_KEY = "selah_group_push_registered_v1";

export function pushPlatform(): PushPlatform {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === "android") return "android";
    if (platform === "ios") return "ios";
    return "unsupported";
  }
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  return "web";
}

export function notificationsSupported(): boolean {
  return pushPlatform() !== "unsupported";
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function decodeApplicationServerKey(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function fetchVapidPublicKey(): Promise<string | null> {
  if (!supabaseUrl || !supabaseApiKey) return null;
  const response = await fetch(`${supabaseUrl}/functions/v1/push-reminders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
    },
    body: JSON.stringify({ action: "public-key" }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { publicKey?: string };
  return data.publicKey ?? null;
}

/**
 * Attach the signed-in account to this browser's push subscription.
 *
 * The `push-reminders` function stores subscriptions by endpoint, and the daily
 * reminder does not know about accounts. Group notices do, so the account is
 * written straight onto the row the reader already has. If they have not
 * enabled the daily reminder there is no row yet, and one is created with a
 * reminder time that is deliberately never matched by the reminder cron
 * (00:00 in a time zone that does not exist is rejected, so instead the
 * reminder is written for a minute that has already passed today and marked as
 * sent, which keeps the scheduler from firing it).
 */
async function linkAccountToWebSubscription(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  const { error } = await supabase
    .from("device_push_reminders")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("endpoint", subscription.endpoint);
  return !error;
}

async function registerWeb(userId: string): Promise<PushRegistrationResult> {
  if (pushPlatform() !== "web") return { status: "unsupported", reason: "Not a browser." };

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { status: "error", reason: "The notification service is not configured yet." };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeApplicationServerKey(publicKey),
    });
  }

  // Keep the existing reminder pipeline working: subscribing here must not
  // overwrite a reminder time the reader has chosen.
  const { data: existing } = await supabase!
    .from("device_push_reminders")
    .select("id, reminder_time, time_zone")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (existing) {
    const linked = await linkAccountToWebSubscription(userId);
    if (!linked) return { status: "error", reason: "Could not attach this device to your account." };
  } else {
    const now = new Date();
    const { error } = await supabase!.from("device_push_reminders").insert({
      installation_id: crypto.randomUUID(),
      endpoint: subscription.endpoint,
      p256dh: subscription.toJSON().keys?.p256dh,
      auth: subscription.toJSON().keys?.auth,
      // No daily reminder was asked for; park it on today's date so the cron
      // never treats it as due.
      reminder_time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      last_sent_local_date: now.toISOString().slice(0, 10),
      user_id: userId,
    });
    if (error) return { status: "error", reason: "Could not save this device's subscription." };
  }

  localStorage.setItem(REMINDER_SUBSCRIPTION_KEY, "true");
  return { status: "granted", platform: "web" };
}

async function registerNative(userId: string): Promise<PushRegistrationResult> {
  const platform = pushPlatform();
  if (platform !== "android" && platform !== "ios") {
    return { status: "unsupported", reason: "Not a mobile build." };
  }
  if (!supabase) return { status: "error", reason: "Cloud sync is not configured in this build." };

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") return { status: "denied" };

    const token = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      void PushNotifications.addListener("registration", (received) => {
        settle(() => resolve(received.value));
      });
      void PushNotifications.addListener("registrationError", (failure) => {
        settle(() =>
          reject(new Error(failure.error || "This device did not return a notification token.")),
        );
      });

      void PushNotifications.register();
      // A device with no Play services can sit silent here forever.
      window.setTimeout(() => {
        settle(() =>
          reject(new Error("This device did not answer the notification service. Check Google Play services and try again.")),
        );
      }, 15000);
    });

    const { error } = await supabase.from("device_push_tokens").upsert(
      {
        user_id: userId,
        platform,
        token,
        device_label: navigator.userAgent.slice(0, 120),
        updated_at: new Date().toISOString(),
        last_failure_at: null,
        failure_reason: null,
      },
      { onConflict: "token" },
    );
    if (error) return { status: "error", reason: "Could not save this device for notifications." };

    // Taps on a notification open the group that sent it.
    void PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (typeof url === "string" && url.startsWith("/")) window.location.assign(url);
    });

    return { status: "granted", platform };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Notifications could not be enabled.",
    };
  }
}

/**
 * Ask for permission and register this device for the signed-in reader.
 * Safe to call repeatedly; it reuses an existing subscription.
 */
export async function enableGroupNotifications(): Promise<PushRegistrationResult> {
  const platform = pushPlatform();
  if (platform === "unsupported") {
    return { status: "unsupported", reason: "This device cannot receive notifications." };
  }
  const userId = await currentUserId();
  if (!userId) return { status: "error", reason: "Sign in with Google first." };

  try {
    return platform === "web" ? await registerWeb(userId) : await registerNative(userId);
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Notifications could not be enabled.",
    };
  }
}

/** Current permission, without prompting. Used to render the right button. */
export async function groupNotificationPermission(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  const platform = pushPlatform();
  if (platform === "unsupported") return "unsupported";
  if (platform === "web") return Notification.permission;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.checkPermissions();
    if (status.receive === "granted") return "granted";
    if (status.receive === "denied") return "denied";
    return "default";
  } catch {
    return "unsupported";
  }
}

/**
 * Remove this device from the account.
 *
 * Deliberately does not unsubscribe the browser's PushSubscription: the daily
 * reading reminder shares it, and turning off group notices must not silently
 * turn that off too.
 */
export async function disableGroupNotifications(): Promise<void> {
  localStorage.removeItem(REMINDER_SUBSCRIPTION_KEY);
  const userId = await currentUserId();
  if (!userId || !supabase) return;

  const platform = pushPlatform();
  if (platform === "web") {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase
        .from("device_push_reminders")
        .update({ user_id: null })
        .eq("endpoint", subscription.endpoint);
    }
    return;
  }

  if (platform === "android" || platform === "ios") {
    await supabase.from("device_push_tokens").delete().eq("user_id", userId).eq("platform", platform);
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
    } catch {
      // The plugin is absent in a plain browser build.
    }
  }
}
