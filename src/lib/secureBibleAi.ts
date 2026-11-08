import { formatReference, getBookMeta, parseScriptureReference } from "@/data/canonicalBooks";
import { supabase } from "@/lib/cloudWorkspace";
import type { AiContextPayload } from "@/lib/aiBibleCompanion";

interface SecureAnswerPayload {
  answer: string | null;
  error?: string;
  clarifyingQuestion?: string | null;
  suggestions?: string[];
  references?: string[];
}

function strings(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

export async function requestSecureBibleAnswer(
  prompt: string,
  context: AiContextPayload,
  referencedPassage?: { label: string; text: string; contextText?: string } | null
): Promise<SecureAnswerPayload> {
  if (!supabase) return { answer: null, error: "Online Selah AI sign-in is not configured in this deployment." };
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { answer: null, error: "Sign in to use online Selah AI." };

  const currentBook = getBookMeta(context.bookNumber).name;
  const verses = context.chapterData?.verses || [];
  const selected = context.selectedVerses.length
    ? verses.filter((verse) => context.selectedVerses.includes(verse.verse))
    : [];
  const minSelected = selected.length ? Math.min(...selected.map((verse) => verse.verse)) : 1;
  const maxSelected = selected.length ? Math.max(...selected.map((verse) => verse.verse)) : Number.MAX_SAFE_INTEGER;
  const relevantVerses = selected.length
    ? verses.filter((verse) => verse.verse >= minSelected - 2 && verse.verse <= maxSelected + 2)
    : verses;

  // Send the whole chapter when possible; long chapters are clipped to stay within a safe request size.
  const verseLines: string[] = [];
  let passageLength = 0;
  for (const verse of relevantVerses) {
    const line = `${currentBook} ${context.chapter}:${verse.verse} — ${verse.text}`;
    if (passageLength + line.length > 7_000) break;
    verseLines.push(line);
    passageLength += line.length + 1;
  }
  const readingReference = selected.length
    ? formatReference(context.bookNumber, context.chapter, minSelected, maxSelected)
    : `${currentBook} ${context.chapter}`;
  const verseContext = verseLines.join("\n");
  const referenced = referencedPassage
    ? `\n\nAdditional passage (${referencedPassage.label}):\n${referencedPassage.text}${referencedPassage.contextText ? `\nNearby verses:\n${referencedPassage.contextText}` : ""}`
    : "";
  const studyContext = `${context.versionMeta.shortName} (${context.versionMeta.name})\nCurrent reading: ${readingReference}\n${verseContext}${referenced}`.slice(0, 11_500);

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
        context: studyContext,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    let payload: Record<string, unknown>;
    try {
      payload = await response.json() as Record<string, unknown>;
    } catch {
      return {
        answer: null,
        error: `Selah’s AI endpoint returned an unexpected response (HTTP ${response.status}). Please refresh the app and try again.`,
      };
    }
    if (!response.ok) {
      return {
        answer: null,
        error: typeof payload.error === "string" ? payload.error : `Online Selah AI returned an error (HTTP ${response.status}).`,
      };
    }

    const references = strings(payload.references, 5, 80).flatMap((reference) => {
      const parsed = parseScriptureReference(reference);
      if (!parsed) return [];
      return [formatReference(parsed.bookNumber, parsed.chapter, parsed.verse, parsed.verseEnd)];
    });
    return {
      answer: typeof payload.answer === "string" && payload.answer.trim() ? payload.answer.trim() : null,
      clarifyingQuestion: typeof payload.clarifyingQuestion === "string" ? payload.clarifyingQuestion.trim() : null,
      suggestions: strings(payload.suggestions, 3, 180),
      references: [...new Set(references)],
    };
  } catch {
    return { answer: null, error: "Could not reach online Selah AI. Check your connection and try again." };
  }
}
