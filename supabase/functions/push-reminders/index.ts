import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

/**
 * Selah push delivery.
 *
 * One cron tick calls this with `action: "send-due"` every minute. Each tick
 * queues whatever the schedule says is due and then delivers the queue:
 *
 * 1. **Queueing** — `run_notification_schedulers()` writes the verse of the day,
 *    the three continue-reading nudges, and owner reminders into
 *    `group_notifications`, each keyed so a re-run is a no-op.
 * 2. **Delivery** — queued rows go to web push subscriptions, and to Android
 *    (FCM) or iOS (APNs) tokens when credentials are configured. A notice is
 *    addressed to an account or, for a device that never signed in, to the
 *    installation itself.
 *
 * Native delivery is optional by design. Without FCM_SERVICE_ACCOUNT_JSON or
 * APNS_* secrets the function simply skips those tokens and records why on the
 * row, so the web path keeps working while credentials are being set up.
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;
const cronSecret = Deno.env.get("SELAH_PUSH_CRON_SECRET")!;

const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";
const apnsKeyId = Deno.env.get("APNS_KEY_ID") ?? "";
const apnsTeamId = Deno.env.get("APNS_TEAM_ID") ?? "";
const apnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY") ?? "";
const apnsTopic = Deno.env.get("APNS_TOPIC") ?? "app.selahbible.multiversion";
const apnsHost = Deno.env.get("APNS_ENVIRONMENT") === "sandbox"
  ? "https://api.sandbox.push.apple.com"
  : "https://api.push.apple.com";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const allowedOrigin = (origin: string) =>
  origin === "https://selah-bible-alpha.vercel.app" ||
  origin === "https://selah-bible-victorgodwininyang-gmailcoms-projects.vercel.app" ||
  (origin.startsWith("https://selah-bible-") && origin.endsWith(".vercel.app")) ||
  origin === "http://localhost:8080" ||
  origin === "http://127.0.0.1:8080";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigin(origin) ? origin : "https://selah-bible-alpha.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: Record<string, unknown>, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });

function validTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- base64url --
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// --------------------------------------------------------------------- FCM ---
type ServiceAccount = { client_email: string; private_key: string; project_id: string };

let cachedFcmToken: { token: string; expiresAt: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  if (!fcmServiceAccountJson) return null;
  try {
    const parsed = JSON.parse(fcmServiceAccountJson) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** OAuth2 access token for FCM HTTP v1, cached until shortly before it expires. */
async function fcmAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcmToken && cachedFcmToken.expiresAt > now + 60) return cachedFcmToken.token;

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`FCM token exchange failed (${response.status})`);
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("FCM token exchange returned no access token");

  cachedFcmToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  };
  return cachedFcmToken.token;
}

/** Returns true when delivered, false when the token is permanently dead. */
async function sendFcm(
  account: ServiceAccount,
  deviceToken: string,
  notice: { title: string; body: string; url: string; tag: string },
): Promise<boolean> {
  const accessToken = await fcmAccessToken(account);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: notice.title, body: notice.body },
          data: { url: notice.url, tag: notice.tag },
          android: {
            priority: "high",
            notification: { channel_id: "selah_group", tag: notice.tag },
          },
        },
      }),
    },
  );
  if (response.ok) return true;

  const detail = await response.text();
  if (response.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(detail)) {
    await supabase.from("device_push_tokens").delete().eq("token", deviceToken);
    return false;
  }
  throw new Error(`FCM ${response.status}: ${detail.slice(0, 200)}`);
}

// -------------------------------------------------------------------- APNs ---
let cachedApnsToken: { token: string; expiresAt: number } | null = null;

async function apnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsToken && cachedApnsToken.expiresAt > now + 60) return cachedApnsToken.token;

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: apnsKeyId })));
  const claims = base64url(new TextEncoder().encode(JSON.stringify({ iss: apnsTeamId, iat: now })));
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(apnsPrivateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  // WebCrypto returns raw r||s, which is exactly JOSE's ES256 format.
  const token = `${signingInput}.${base64url(new Uint8Array(signature))}`;
  // Apple rejects tokens older than an hour; refresh well before that.
  cachedApnsToken = { token, expiresAt: now + 2400 };
  return token;
}

async function sendApns(
  deviceToken: string,
  notice: { title: string; body: string; url: string; tag: string },
): Promise<boolean> {
  const jwt = await apnsJwt();
  const response = await fetch(`${apnsHost}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": apnsTopic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-collapse-id": notice.tag.slice(0, 64),
    },
    body: JSON.stringify({
      aps: {
        alert: { title: notice.title, body: notice.body },
        sound: "default",
        badge: 1,
      },
      url: notice.url,
      tag: notice.tag,
    }),
  });
  if (response.ok) return true;

  const detail = await response.text();
  if (response.status === 410 || /BadDeviceToken|Unregistered/.test(detail)) {
    await supabase.from("device_push_tokens").delete().eq("token", deviceToken);
    return false;
  }
  throw new Error(`APNs ${response.status}: ${detail.slice(0, 200)}`);
}

// --------------------------------------------------------- group delivery ---
type PendingNotice = {
  id: string;
  /** Set when the notice belongs to an account; null for an unlinked device. */
  recipient_id: string | null;
  /** Set when the notice is addressed to one installation with no account. */
  device_id: string | null;
  // Null for the daily verse, which is addressed to a person, not a group.
  group_id: string | null;
  kind: string;
  slot: string | null;
  title: string;
  body: string;
  url: string;
};

/**
 * Notification tag.
 *
 * Android and the Notifications API both collapse notices that share a tag. A
 * verse has no group, so tagging it with one would make every verse on a device
 * overwrite the previous one; the slot keeps morning and evening separate while
 * still replacing yesterday's unread verse of the same slot.
 */
function noticeTag(notice: PendingNotice): string {
  if (notice.group_id) return `selah-group-${notice.group_id}`;
  // One tag per kind and slot, so the morning verse is not replaced by the
  // afternoon reading nudge, but yesterday's evening verse *is* replaced by
  // today's rather than stacking up.
  return `selah-${notice.kind}-${notice.slot || "daily"}`;
}

/** Deliver queued group notices to every registered device of each recipient. */
async function deliverGroupNotifications(limit = 100) {
  const { data: claimed, error } = await supabase.rpc("claim_undelivered_group_notifications", {
    p_limit: limit,
  });
  if (error) throw new Error("Could not claim queued notifications");

  const notices = (claimed || []) as PendingNotice[];
  if (notices.length === 0) return { attempted: 0, sent: 0, failed: 0, nativeSkipped: 0 };

  webpush.setVapidDetails(vapidSubject, publicKey, privateKey);
  const account = serviceAccount();
  const apnsReady = Boolean(apnsKeyId && apnsTeamId && apnsPrivateKey);

  // Group every notice by the thing that receives it: an account, or a single
  // installation when that device has never linked an account.
  type Target = { userId: string | null; deviceId: string | null; notices: PendingNotice[] };
  const targets = new Map<string, Target>();
  for (const notice of notices) {
    const key = notice.device_id ? `device:${notice.device_id}` : `user:${notice.recipient_id}`;
    const entry = targets.get(key) ?? {
      userId: notice.device_id ? null : notice.recipient_id,
      deviceId: notice.device_id,
      notices: [],
    };
    entry.notices.push(notice);
    targets.set(key, entry);
  }

  let sent = 0;
  let failed = 0;
  let nativeSkipped = 0;

  for (const target of targets.values()) {
    const recipientId = target.userId;
    const recipientNotices = target.notices;
    const unread = recipientNotices.length;

    // Web push: one notice per subscription, newest first per group.
    const subscriptionsQuery = supabase
      .from("device_push_reminders")
      .select("id, endpoint, p256dh, auth");
    const { data: subscriptions } = await (target.deviceId
      ? subscriptionsQuery.eq("id", target.deviceId)
      : subscriptionsQuery.eq("user_id", recipientId!));

    for (const notice of recipientNotices) {
      const tag = noticeTag(notice);
      const payload = JSON.stringify({
        title: notice.title,
        body: notice.body,
        url: notice.url,
        groupId: notice.group_id,
        tag,
        unreadCount: unread,
      });

      for (const subscription of subscriptions || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 86400 },
          );
          sent += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // The endpoint is gone. Drop the subscription so it stops failing.
            await supabase.from("device_push_reminders").delete().eq("id", subscription.id);
          } else {
            failed += 1;
          }
        }
      }

      // Native delivery, when credentials exist.
      // Native tokens are registered against an account, so an unlinked
      // installation is reached through its web push subscription only.
      const { data: tokens } = recipientId
        ? await supabase.from("device_push_tokens").select("token, platform").eq("user_id", recipientId)
        : { data: [] as { token: string; platform: string }[] };

      if ((tokens || []).length > 0 && !account && !apnsReady) nativeSkipped += tokens!.length;

      for (const device of tokens || []) {
        try {
          if (device.platform === "android" && account) {
            const ok = await sendFcm(account, device.token, {
              title: notice.title,
              body: notice.body,
              url: notice.url,
              tag,
            });
            ok ? (sent += 1) : void 0;
          } else if (device.platform === "ios" && apnsReady) {
            const ok = await sendApns(device.token, {
              title: notice.title,
              body: notice.body,
              url: notice.url,
              tag,
            });
            ok ? (sent += 1) : void 0;
          }
        } catch (error) {
          failed += 1;
          await supabase
            .from("device_push_tokens")
            .update({
              last_failure_at: new Date().toISOString(),
              failure_reason: String((error as Error).message || error).slice(0, 200),
            })
            .eq("token", device.token);
        }
      }
    }
  }

  return { attempted: notices.length, sent, failed, nativeSkipped };
}

// ------------------------------------------------------------------ routes ---
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") {
    if (origin && !allowedOrigin(origin)) return new Response("Forbidden origin", { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (origin && !allowedOrigin(origin)) return json({ error: "Forbidden origin" }, 403, origin);
  if (request.method !== "POST") return json({ error: "POST required" }, 405, origin);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  if (body.action === "send-due" || body.action === "send-group") {
    if (!cronSecret || request.headers.get("x-selah-push-cron-secret") !== cronSecret) {
      return json({ error: "Unauthorized scheduler request" }, 401, origin);
    }

    webpush.setVapidDetails(vapidSubject, publicKey, privateKey);

    // Everything that goes out on a schedule is queued here: the verse at 06:00
    // and 21:00 local, the three reading nudges, and owner reminders. This runs
    // inside the one every-minute tick rather than in separate cron jobs, and it
    // is idempotent -- delivery_key makes a re-run a no-op.
    //
    // The old single reminder at the reader's chosen time used to be sent
    // separately just above. It is retired: it and the three nudges would both
    // fire, which is four pushes where the reader asked for three.
    let scheduled: unknown = null;
    try {
      const { data, error: scheduleError } = await supabase.rpc("run_notification_schedulers");
      if (scheduleError) throw scheduleError;
      scheduled = data;
    } catch (error) {
      // Never block delivery of what is already queued because queueing failed.
      scheduled = { error: String((error as Error).message || error) };
    }

    // Group notifications.
    let group = { attempted: 0, sent: 0, failed: 0, nativeSkipped: 0 };
    try {
      group = await deliverGroupNotifications();
    } catch (error) {
      return json(
        { ok: false, error: "Group delivery failed", detail: String((error as Error).message || error) },
        500,
        origin,
      );
    }

    return json(
      {
        ok: true,
        scheduled,
        group,
      },
      200,
      origin,
    );
  }

  if (!origin || !allowedOrigin(origin)) return json({ error: "Browser origin required" }, 403, origin);
  if (!request.headers.get("apikey")) return json({ error: "API key required" }, 401, origin);
  if (body.action === "public-key") return json({ publicKey }, 200, origin);

  const installationId = typeof body.installationId === "string" ? body.installationId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(installationId)) {
    return json({ error: "Invalid installation id" }, 400, origin);
  }

  if (body.action === "unsubscribe") {
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint.startsWith("https://") || endpoint.length > 4096) {
      return json({ error: "Invalid push endpoint" }, 400, origin);
    }
    const { error } = await supabase.from("device_push_reminders")
      .delete().eq("endpoint", endpoint).eq("installation_id", installationId);
    if (error) return json({ error: "Could not remove push subscription" }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  if (body.action === "subscribe") {
    const subscription = body.subscription as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    } | null;
    const endpoint = typeof subscription?.endpoint === "string" ? subscription.endpoint : "";
    const p256dh = typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh : "";
    const auth = typeof subscription?.keys?.auth === "string" ? subscription.keys.auth : "";
    const reminderTime = typeof body.reminderTime === "string" ? body.reminderTime : "";
    const timeZone = typeof body.timeZone === "string" ? body.timeZone : "";
    if (!endpoint.startsWith("https://") || endpoint.length > 4096 || !p256dh || !auth ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime) || !validTimeZone(timeZone)) {
      return json({ error: "Invalid subscription or reminder settings" }, 400, origin);
    }

    // Keep the account link if the row already has one: a reader who changes
    // their reminder time must not lose group notifications.
    const { data: existing } = await supabase
      .from("device_push_reminders")
      .select("user_id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    const { error } = await supabase.from("device_push_reminders").upsert({
      installation_id: installationId,
      endpoint,
      p256dh,
      auth,
      reminder_time: reminderTime,
      time_zone: timeZone,
      updated_at: new Date().toISOString(),
      ...(existing?.user_id ? { user_id: existing.user_id } : {}),
    }, { onConflict: "endpoint" });
    if (error) return json({ error: "Could not save push subscription" }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Unknown action" }, 400, origin);
});
