interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface PaystackVerifyPayload {
  status?: boolean;
  data?: {
    status?: string;
    amount?: number;
    currency?: string;
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({ error: "Support payments are not available yet." });
    return;
  }

  const referenceValue = req.query?.reference;
  const reference = Array.isArray(referenceValue) ? referenceValue[0] : referenceValue;
  if (!reference || !/^selah_[a-f0-9-]{36}$/i.test(reference)) {
    res.status(400).json({ error: "A valid payment reference is required." });
    return;
  }

  try {
    const upstream = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const payload = (await upstream.json()) as PaystackVerifyPayload;

    if (!upstream.ok || !payload.status || !payload.data) {
      res.status(502).json({ error: "We could not confirm this payment yet. Please check again shortly." });
      return;
    }

    const paid = payload.data.status === "success" && payload.data.currency === "NGN";
    res.status(200).json({
      paid,
      amount: paid && typeof payload.data.amount === "number" ? payload.data.amount / 100 : undefined,
    });
  } catch {
    res.status(502).json({ error: "Unable to verify this payment right now. Please try again shortly." });
  }
}
