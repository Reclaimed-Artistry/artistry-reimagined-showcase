import { randomUUID } from "node:crypto";

interface ApiRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface PaystackInitializePayload {
  status?: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    reference?: string;
  };
}

const MINIMUM_DONATION_NAIRA = 100;
const MAXIMUM_DONATION_NAIRA = 1_000_000;
const PRODUCTION_ORIGIN = "https://selah-bible-alpha.vercel.app";

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({ error: "Support payments are not available yet. Please try again later." });
    return;
  }

  const body = req.body as { amount?: unknown; email?: unknown } | null;
  const amount = body?.amount;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < MINIMUM_DONATION_NAIRA ||
    amount > MAXIMUM_DONATION_NAIRA
  ) {
    res.status(400).json({ error: "Enter an amount between ₦100 and ₦1,000,000." });
    return;
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid email address for your Paystack receipt." });
    return;
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = productionHost
    ? `https://${productionHost.replace(/^https?:\/\//, "")}`
    : PRODUCTION_ORIGIN;
  const callbackUrl = new URL("/", origin);
  callbackUrl.searchParams.set("section", "about");
  callbackUrl.searchParams.set("support", "return");

  try {
    const upstream = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        currency: "NGN",
        reference: `selah_${randomUUID()}`,
        callback_url: callbackUrl.toString(),
        metadata: {
          purpose: "Voluntary support for Selah Bible",
          custom_fields: [
            {
              display_name: "Support purpose",
              variable_name: "support_purpose",
              value: "Help keep Selah growing and accessible",
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = (await upstream.json()) as PaystackInitializePayload;
    const authorizationUrl = payload?.data?.authorization_url;
    const reference = payload?.data?.reference;

    if (!upstream.ok || !payload.status || !authorizationUrl || !reference) {
      res.status(502).json({ error: "Paystack could not start checkout. Please try again shortly." });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ authorizationUrl });
  } catch {
    res.status(502).json({ error: "Unable to connect to Paystack. Please try again shortly." });
  }
}
