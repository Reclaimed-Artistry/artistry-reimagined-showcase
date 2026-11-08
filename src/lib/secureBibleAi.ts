import { getBookMeta } from "@/data/canonicalBooks";
import { supabase } from "@/lib/cloudWorkspace";
import type { AiContextPayload } from "@/lib/aiBibleCompanion";

export async function requestSecureBibleAnswer(
  prompt: string,
  context: AiContextPayload,
  referencedPassage?: { label: string; text: string; contextText?: string } | null
): Promise<{ answer: string | null; error?: string }> {
  if (!supabase) return { answer: null, error: "Secure AI sign-in is not configured in this deployment." };
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { answer: null, error: "Sign in to your Selah account before using secure AI." };

  const currentBook = getBookMeta(context.bookNumber).name;
  const verses = context.chapterData?.verses || [];
  const selected = context.selectedVerses.length
    ? verses.filter((verse) => context.selectedVerses.includes(verse.verse))
    : verses.slice(0, 24);
  const verseContext = selected.map((verse) => `${currentBook} ${context.chapter}:${verse.verse} — ${verse.text}`).join("\n");
  const referenced = referencedPassage
    ? `\n\nAdditional cited passage (${referencedPassage.label}):\n${referencedPassage.text}${referencedPassage.contextText ? `\nNearby verses:\n${referencedPassage.contextText}` : ""}`
    : "";

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        prompt,
        history: context.conversationHistory || [],
        context: `${context.versionMeta.shortName} (${context.versionMeta.name})\n${verseContext}${referenced}`.slice(0, 9_000),
      }),
    });
    const payload = await response.json().catch(() => ({})) as { answer?: unknown; error?: unknown };
    if (!response.ok) return { answer: null, error: typeof payload.error === "string" ? payload.error : "Secure AI is temporarily unavailable." };
    return typeof payload.answer === "string" && payload.answer.trim()
      ? { answer: payload.answer.trim() }
      : { answer: null, error: "Secure AI returned an empty response." };
  } catch {
    return { answer: null, error: "Could not reach secure AI. Check your connection and try again." };
  }
}
