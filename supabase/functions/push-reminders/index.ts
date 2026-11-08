import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;
const cronSecret = Deno.env.get("SELAH_PUSH_CRON_SECRET")!;
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
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  if (body.action === "send-due") {
    if (!cronSecret || request.headers.get("x-selah-push-cron-secret") !== cronSecret) {
      return json({ error: "Unauthorized scheduler request" }, 401, origin);
    }

    const { data: reminders, error } = await supabase.rpc("claim_due_push_reminders");
    if (error) return json({ error: "Could not claim scheduled reminders" }, 500, origin);

    webpush.setVapidDetails(vapidSubject, publicKey, privateKey);
    let sent = 0;
    let removed = 0;
    for (const reminder of reminders || []) {
      const subscription = {
        endpoint: reminder.endpoint,
        keys: { p256dh: reminder.p256dh, auth: reminder.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: "A quiet moment with Scripture",
          body: "Your daily reading reminder is ready. Open Selah to continue where you left off.",
          url: "https://selah-bible-alpha.vercel.app/?section=reader",
          tag: `selah-reading-reminder-${reminder.last_sent_local_date}`,
        }), { TTL: 3600 });
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("device_push_reminders").delete().eq("id", reminder.id);
          removed += 1;
        } else {
          // Let the next scheduler tick retry transient delivery errors.
          await supabase.from("device_push_reminders").update({ last_sent_local_date: null }).eq("id", reminder.id);
        }
      }
    }
    return json({ ok: true, sent, removed }, 200, origin);
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

    const { error } = await supabase.from("device_push_reminders").upsert({
      installation_id: installationId,
      endpoint,
      p256dh,
      auth,
      reminder_time: reminderTime,
      time_zone: timeZone,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) return json({ error: "Could not save push subscription" }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Unknown action" }, 400, origin);
});
