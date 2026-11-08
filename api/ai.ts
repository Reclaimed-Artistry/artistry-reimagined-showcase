import type { IncomingMessage, ServerResponse } from "node:http";

type RequestBody = {
  prompt?: unknown;
  history?: unknown;
  context?: unknown;
};
type ApiRequest = IncomingMessage & { body?: RequestBody };
type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const ALLOWED_ORIGINS = new Set([
  "https://selah-bible-alpha.vercel.app",
  "http://localhost:5173",
]);

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin) ||
    /^https:\/\/selah-bible-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  res.setHeader("Vary", "Origin");
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (origin && !isAllowedOrigin(origin)) return res.status(403).json({ error: "Origin not allowed" });

  const providerKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!providerKey || !supabaseUrl || !supabasePublishableKey) {
    return res.status(503).json({ error: "Secure AI is not configured yet. Use offline study or ask the Selah administrator to configure it." });
  }

  const authorization = req.headers.authorization;
  const bearer = typeof authorization === "string" ? authorization.match(/^Bearer\s+(.+)$/i)?.[1] : null;
  if (!bearer) return res.status(401).json({ error: "Sign in to use secure AI." });

  try {
    const userResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: supabasePublishableKey, Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!userResponse.ok) return res.status(401).json({ error: "Your session expired. Sign in again." });

    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim().slice(0, 6_000) : "";
    if (!prompt) return res.status(400).json({ error: "A question is required." });

    const history = Array.isArray(req.body?.history)
      ? (req.body.history as unknown[]).slice(-8).flatMap((entry): ChatMessage[] => {
          if (!entry || typeof entry !== "object") return [];
          const item = entry as Record<string, unknown>;
          if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
          return [{ role: item.role, content: item.content.slice(0, 1_000) }];
        })
      : [];
    const context = typeof req.body?.context === "string" ? req.body.context.slice(0, 9_000) : "";
    const upstream = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `You are Selah, a careful Bible study companion. Answer the user's exact question directly, ground claims in the supplied translation and references, distinguish textual facts from interpretive traditions, and say when context is limited. Keep answers focused.\n\nSupplied Scripture context:\n${context || "No passage text was supplied."}`,
          },
          ...history,
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!upstream.ok) {
      const providerMessage = (await upstream.text()).slice(0, 500);
      return res.status(502).json({ error: `AI provider returned ${upstream.status}: ${providerMessage}` });
    }
    const payload = await upstream.json() as { choices?: { message?: { content?: unknown } }[] };
    const answer = payload.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return res.status(502).json({ error: "AI provider returned an empty answer." });
    return res.status(200).json({ answer: answer.trim() });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Secure AI timed out; try again or continue with offline study."
      : "Secure AI is temporarily unavailable; try again shortly.";
    return res.status(504).json({ error: message });
  }
}
