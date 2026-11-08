const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
const supabaseApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const REMOTE_PUSH_ACTIVE_KEY = "selah_remote_push_active_v1";
const INSTALLATION_ID_KEY = "selah_push_installation_id_v1";

const isPushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

function getInstallationId() {
  let installationId = localStorage.getItem(INSTALLATION_ID_KEY);
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem(INSTALLATION_ID_KEY, installationId);
  }
  return installationId;
}

function decodeApplicationServerKey(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function invokePushFunction(body: Record<string, unknown>) {
  if (!supabaseUrl || !supabaseApiKey) throw new Error("Cloud push reminders are not configured for this app.");
  const response = await fetch(`${supabaseUrl}/functions/v1/push-reminders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Push reminder request failed.");
  return data;
}

export async function enableRemotePushReminder(reminderTime: string) {
  if (!isPushSupported()) throw new Error("This device does not support web push notifications.");
  if (Notification.permission !== "granted") throw new Error("Allow notifications for Selah to enable device push reminders.");

  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await invokePushFunction({ action: "public-key" }) as { publicKey?: string };
  if (!publicKey) throw new Error("The push notification service is not configured yet.");

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeApplicationServerKey(publicKey),
    });
  }

  const result = await invokePushFunction({
    action: "subscribe",
    installationId: getInstallationId(),
    subscription: subscription.toJSON(),
    reminderTime,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  if (result.ok !== true) throw new Error("Selah could not save this device's push subscription.");
  localStorage.setItem(REMOTE_PUSH_ACTIVE_KEY, "true");
}

export async function updateRemotePushReminder(reminderTime: string) {
  if (localStorage.getItem(REMOTE_PUSH_ACTIVE_KEY) !== "true") return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    localStorage.removeItem(REMOTE_PUSH_ACTIVE_KEY);
    throw new Error("This device's push subscription is no longer active. Turn notifications off and on again to reconnect it.");
  }
  const result = await invokePushFunction({
    action: "subscribe",
    installationId: getInstallationId(),
    subscription: subscription.toJSON(),
    reminderTime,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  if (result.ok !== true) throw new Error("Selah could not update this device's reminder time.");
}

export async function disableRemotePushReminder() {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      try {
        await invokePushFunction({
          action: "unsubscribe",
          installationId: getInstallationId(),
          endpoint: subscription.endpoint,
        });
      } finally {
        await subscription.unsubscribe().catch(() => false);
      }
    }
  } finally {
    if (typeof window !== "undefined") localStorage.removeItem(REMOTE_PUSH_ACTIVE_KEY);
  }
}
