const HELLOAO_CATALOG_URL = "https://bible.helloao.org/api/available_translations.json";

interface ApiRequest {
  method?: string;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface HelloAoCatalogPayload {
  translations?: unknown[];
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Let Vercel's edge cache share the provider response across devices while
  // allowing stale data to be served briefly if the upstream is unavailable.
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  try {
    const upstream = await fetch(HELLOAO_CATALOG_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: "The translation catalog provider is unavailable" });
      return;
    }

    const payload = (await upstream.json()) as HelloAoCatalogPayload;
    if (!payload || !Array.isArray(payload.translations) || payload.translations.length === 0) {
      res.status(502).json({ error: "The provider returned an invalid translation catalog" });
      return;
    }

    res.status(200).json(payload);
  } catch {
    res.status(502).json({ error: "Unable to load the translation catalog" });
  }
}
