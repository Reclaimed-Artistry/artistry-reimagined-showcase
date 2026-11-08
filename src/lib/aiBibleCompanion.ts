import {
  CANONICAL_BOOKS,
  formatReference,
  getBookMeta,
  parseScriptureReference,
} from "@/data/canonicalBooks";
import {
  CURATED_CROSS_REFERENCES,
  ORIGINAL_WORD_LEXICON,
  TOPICAL_LIFE_GUIDES,
} from "@/data/scholarlyKnowledge";
import {
  getInstalledFullBible,
  lookupOriginalLexiconOnline,
  searchInstalledBible,
} from "./bibleProviders";
import { requestSecureBibleAnswer } from "@/lib/secureBibleAi";
import type {
  AiConnectionSettings,
  BibleVersionMeta,
  NormalizedChapter,
} from "@/types/bible";

export type AiQuickAction =
  | "explain"
  | "walkthrough"
  | "context"
  | "word_study"
  | "cross_refs"
  | "prayer"
  | "quiz";

export interface AiCitationLink {
  label: string;
  bookNumber: number;
  chapter: number;
  verse?: number;
}

export interface AiQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AiCompanionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AiCitationLink[];
  quiz?: AiQuizQuestion[];
  timestamp: number;
}

export interface AiContextPayload {
  bookNumber: number;
  chapter: number;
  selectedVerses: number[];
  chapterData: NormalizedChapter | null;
  versionMeta: BibleVersionMeta;
  aiSettings: AiConnectionSettings;
  userPrompt?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

const STOP_WORDS = new Set([
  "the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his",
  "from", "they", "unto", "shall", "will", "thy", "thee", "thou", "him", "her",
  "all", "were", "when", "there", "their", "been", "one", "into", "out", "who",
  "what", "which", "said", "lord", "god", "upon", "them", "then", "also", "came",
  "your", "are", "was", "had", "has", "hath", "let", "may", "now", "even", "every",
]);

function extractKeyThemesFromVerses(texts: string[]): string[] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    const words = t
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const w of words) {
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function simplifyArchaicPhrasing(text: string): string {
  return text
    .replace(/\bunto\b/gi, "to")
    .replace(/\bspake\b/gi, "spoke")
    .replace(/\bsaith\b/gi, "says")
    .replace(/\bhath\b/gi, "has")
    .replace(/\bdoth\b/gi, "does")
    .replace(/\bthou art\b/gi, "you are")
    .replace(/\bthou shalt\b/gi, "you will")
    .replace(/\bthee\b/gi, "you")
    .replace(/\bthy\b/gi, "your")
    .replace(/\bthine\b/gi, "yours")
    .replace(/\bye\b/gi, "you all")
    .replace(/\bverily,?\s*verily\b/gi, "truly, with full certainty")
    .replace(/\bverily\b/gi, "truly")
    .replace(/\bbehold\b/gi, "look closely")
    .replace(/\blovingkindness\b/gi, "unfailing covenant love");
}

function buildQuizFromChapter(
  bookName: string,
  chapter: number,
  verses: { verse: number; text: string }[]
): AiQuizQuestion[] {
  if (verses.length < 4) return [];
  const quiz: AiQuizQuestion[] = [];

  // Question 1: Cloze key word from an impactful verse
  const targetIndices = [
    0,
    Math.floor(verses.length / 2),
    verses.length - 1,
  ];

  const distractorsPool = [
    "wilderness", "covenant", "sanctuary", "inheritance", "compassion",
    "righteousness", "deliverance", "wisdom", "shepherd", "glory",
    "steadfast", "kingdom", "harvest", "peace", "strength",
  ];

  for (const idx of targetIndices) {
    const v = verses[idx];
    if (!v) continue;
    const words = v.text
      .replace(/[^a-zA-Z\s'-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()));
    if (words.length === 0) continue;
    const answer = words[Math.floor(words.length / 2)];
    const blanked = v.text.replace(
      new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
      "______"
    );
    const wrong = distractorsPool
      .filter((d) => d.toLowerCase() !== answer.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [...wrong, answer].sort((a, b) => a.localeCompare(b));
    const correctIndex = options.indexOf(answer);

    quiz.push({
      question: `In ${bookName} ${chapter}:${v.verse}, which word completes this line?\n“${blanked.slice(0, 175)}${blanked.length > 175 ? "…" : ""}”`,
      options,
      correctIndex,
      explanation: `${bookName} ${chapter}:${v.verse} reads: “${v.text}”`,
    });
  }

  return quiz.slice(0, 3);
}

function extractScriptureReference(text: string): string | null {
  const bookNames = CANONICAL_BOOKS.flatMap((book) =>
    Array.from(new Set([book.name, book.shortName, book.usfm, ...book.aliases]))
      // Very short abbreviations are ambiguous in ordinary questions ("is 2..." -> Isaiah 2).
      .filter((name) => name.length >= 3 || name.toLowerCase() === "ps")
      .map((name) => ({ name, bookNumber: book.bookNumber }))
  ).sort((a, b) => b.name.length - a.name.length);

  for (const { name, bookNumber } of bookNames) {
    // Canonical book names contain no regex metacharacters; make multi-word names flexible.
    const escapedName = name.replace(/\s+/g, "\\s+");
    const match = text.match(
      new RegExp(String.raw`\b${escapedName}\.?\s+\d+(?::\d+(?:\s*[-–]\s*\d+)?)?\b`, "i")
    );
    if (match && parseScriptureReference(match[0])?.bookNumber === bookNumber) {
      return match[0].replace(/\s*[-–]\s*/g, "-");
    }
  }
  return null;
}

async function loadReferenceText(
  reference: string,
  ctx: AiContextPayload
): Promise<{ label: string; text: string; contextText?: string } | null> {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return null;

  try {
    const bible = await getInstalledFullBible(ctx.versionMeta);
    const targetBook = bible?.books.find((item) => item.bookNumber === parsed.bookNumber);
    const targetChapter = targetBook?.chapters.find((item) => item.chapter === parsed.chapter);
    if (!targetChapter) return null;

    const startVerse = parsed.verse ?? 1;
    const endVerse = parsed.verseEnd ?? (parsed.verse ? startVerse : Number.MAX_SAFE_INTEGER);
    const selected = targetChapter.verses.filter(
      (verse) => verse.verse >= startVerse && verse.verse <= endVerse
    ).slice(0, parsed.verse ? undefined : 24);
    if (!selected.length) return null;

    const selectedNumbers = new Set(selected.map((verse) => verse.verse));
    const neighboringVerses = targetChapter.verses.filter(
      (verse) =>
        !selectedNumbers.has(verse.verse) &&
        (verse.verse === selected[0].verse - 1 || verse.verse === selected[selected.length - 1].verse + 1)
    );
    const contextText = neighboringVerses
      .map((verse) => `[${verse.verse}] ${verse.text}`)
      .join("\n");

    return {
      label: parsed.verse
        ? formatReference(parsed.bookNumber, parsed.chapter, selected[0].verse, selected[selected.length - 1].verse)
        : formatReference(parsed.bookNumber, parsed.chapter),
      text: selected.map((verse) => `[${verse.verse}] ${verse.text}`).join("\n"),
      contextText: contextText || undefined,
    };
  } catch {
    // A verse may not be available in a streaming-only version; keep the answer path usable.
    return null;
  }
}

async function callCustomLlmIfConfigured(
  prompt: string,
  ctx: AiContextPayload,
  referencePassage?: { label: string; text: string; contextText?: string } | null
): Promise<string | null> {
  const { aiSettings, chapterData, bookNumber, chapter, selectedVerses, versionMeta } = ctx;
  if (aiSettings.mode !== "custom_llm" || !aiSettings.apiKey.trim()) {
    return null;
  }

  const book = getBookMeta(bookNumber);
  const targetVerses =
    selectedVerses.length > 0
      ? chapterData?.verses.filter((v) => selectedVerses.includes(v.verse)) || []
      : chapterData?.verses.slice(0, 20) || [];
  const passageSnippet = targetVerses
    .map((v) => `[${v.verse}] ${v.text}`)
    .join("\n");
  const referencedText = referencePassage
    ? `\n\nQuestion's referenced passage (${referencePassage.label}, ${versionMeta.shortName}):\n${referencePassage.text}${referencePassage.contextText ? `\nNearby verses:\n${referencePassage.contextText}` : ""}`
    : "";
  const systemPrompt = `You are Selah AI, a warm, scholarly, faithful, and clear Bible reading companion embedded inside Selah Multi-Version Bible.
Current open passage: ${book.name} ${chapter} (${versionMeta.shortName} — ${versionMeta.name}).
Selected verses: ${selectedVerses.length > 0 ? selectedVerses.join(", ") : "Whole chapter"}.
Current passage text:\n${passageSnippet || "The current chapter text is still loading."}${referencedText}

Answer the reader's actual question directly, in clear language. Ground claims in the supplied Scripture, identify verse references, distinguish the text from interpretive views, and say when the provided context is insufficient. Keep responses focused and use brief headings or bullets only when useful.`;

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 12_000);
  try {
    const endpoint =
      aiSettings.endpointUrl.trim() || "https://api.openai.com/v1/chat/completions";
    const history = (ctx.conversationHistory || []).slice(-6).map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1_200),
    }));
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiSettings.apiKey.trim()}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: aiSettings.model.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: prompt },
        ],
        temperature: 0.35,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content;
    return typeof answer === "string" && answer.trim() ? answer.trim() : null;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function generateAiBibleResponse(
  actionOrPrompt: AiQuickAction | string,
  ctx: AiContextPayload
): Promise<Omit<AiCompanionMessage, "id" | "role" | "timestamp">> {
  const book = getBookMeta(ctx.bookNumber);
  const verses = ctx.chapterData?.verses || [];
  const selectedSorted = [...ctx.selectedVerses].sort((a, b) => a - b);
  const focusVerses =
    selectedSorted.length > 0
      ? verses.filter((v) => selectedSorted.includes(v.verse))
      : verses.slice(0, Math.min(6, verses.length));

  const refLabel =
    selectedSorted.length > 0
      ? formatReference(
          ctx.bookNumber,
          ctx.chapter,
          selectedSorted[0],
          selectedSorted[selectedSorted.length - 1]
        )
      : `${book.name} ${ctx.chapter}`;

  const effectivePrompt = ctx.userPrompt?.trim() || actionOrPrompt;
  const reference = typeof actionOrPrompt === "string" ? extractScriptureReference(actionOrPrompt) : null;
  const referencePassage = reference ? await loadReferenceText(reference, ctx) : null;

  // Use the authenticated server proxy when selected; provider credentials never enter the browser.
  if (actionOrPrompt !== "quiz" && (ctx.aiSettings.mode === "server_llm" || ctx.aiSettings.mode === "hybrid")) {
    const result = await requestSecureBibleAnswer(effectivePrompt, ctx, referencePassage);
    if (result.answer) {
      return {
        content: result.answer,
        citations: [{
          label: refLabel,
          bookNumber: ctx.bookNumber,
          chapter: ctx.chapter,
          ...(selectedSorted.length > 0 ? { verse: selectedSorted[0] } : {}),
        }],
      };
    }
    if (ctx.aiSettings.mode === "server_llm") {
      return { content: `### Secure AI unavailable\n${result.error || "Try again shortly, or use built-in study tools."}` };
    }
    // Hybrid mode quietly falls back to the local study engine when online AI isn't configured.
  }

  // Try the optional user-configured LLM only when explicitly selected.
  // A bounded request time keeps a slow provider from making the panel feel stuck.
  if (actionOrPrompt !== "quiz" && ctx.aiSettings.mode === "custom_llm" && ctx.aiSettings.apiKey) {
    const llmReply = await callCustomLlmIfConfigured(effectivePrompt, ctx, referencePassage);
    if (llmReply) {
      return { content: llmReply };
    }
  }

  // 1. WALKTHROUGH
  if (actionOrPrompt === "walkthrough") {
    if (verses.length === 0) {
      return { content: `### ${book.name} ${ctx.chapter} is still loading\nI could not access the chapter text yet. Please try the walkthrough again in a moment, or ask a question about a topic or Bible reference.` };
    }
    const total = verses.length;
    const third = Math.max(1, Math.ceil(total / 3));
    const opening = verses.slice(0, third);
    const middle = verses.slice(third, third * 2);
    const closing = verses.slice(third * 2);
    const keyThemes = extractKeyThemesFromVerses(verses.map((v) => v.text));

    const openPreview = opening[0]?.text.slice(0, 120) || "";
    const midPreview = middle[0]?.text.slice(0, 120) || "";
    const closePreview = closing[closing.length - 1]?.text.slice(0, 120) || "";

    return {
      content: `### Reading Guide: ${book.name} ${ctx.chapter} (${ctx.versionMeta.shortName})

**Where we are in Scripture:** *${book.name}* (${book.category} • ${book.author}) centers on **${book.theme}**.

**How this chapter unfolds (${total} verses):**
1. **Opening Movement (vv. 1–${opening[opening.length - 1]?.verse || 1}):** Sets the stage — *“${openPreview}${openPreview.length >= 120 ? "…" : ""}”*
${
  middle.length > 0
    ? `2. **Core Turning Point (vv. ${middle[0].verse}–${middle[middle.length - 1].verse}):** Deepens the tension or teaching — *“${midPreview}${midPreview.length >= 120 ? "…" : ""}”*`
    : ""
}
${
  closing.length > 0
    ? `3. **Resolution & Takeaway (vv. ${closing[0].verse}–${closing[closing.length - 1].verse}):** Brings the chapter home — *“${closePreview}${closePreview.length >= 120 ? "…" : ""}”*`
    : ""
}

**Key Motifs in This Chapter:** ${keyThemes.length > 0 ? keyThemes.join(" • ") : book.theme}

**How to read it well:** Read once slowly from start to finish to catch the flow, then tap any verse that arrests your attention to compare translations or journal a reflection.`,
      citations: [
        parseScriptureReference(book.keyVerseRef)
          ? {
              label: `Book Key Verse: ${book.keyVerseRef}`,
              bookNumber: book.bookNumber,
              chapter: parseScriptureReference(book.keyVerseRef)!.chapter,
              verse: parseScriptureReference(book.keyVerseRef)!.verse,
            }
          : { label: `${book.name} 1`, bookNumber: book.bookNumber, chapter: 1 },
      ],
    };
  }

  // 2. EXPLAIN SIMPLY
  if (actionOrPrompt === "explain") {
    const combinedText = focusVerses.map((v) => v.text).join(" ");
    const plainReading = simplifyArchaicPhrasing(combinedText);
    const firstVerseNum = focusVerses[0]?.verse || 1;
    const prevVerse = verses.find((v) => v.verse === firstVerseNum - 1);
    const nextVerse = verses.find(
      (v) => v.verse === (focusVerses[focusVerses.length - 1]?.verse || 1) + 1
    );

    const matchedWords = ORIGINAL_WORD_LEXICON.filter((w) =>
      w.englishTriggers.some((tr) => combinedText.toLowerCase().includes(tr))
    ).slice(0, 2);

    return {
      content: `### Plain-Language Reading of ${refLabel}

**In clear everyday phrasing:**
> ${plainReading || "Select a verse in the reader to unpack its meaning."}

**Immediate Flow in ${book.name} ${ctx.chapter}:**
${prevVerse ? `- **Just before (v. ${prevVerse.verse}):** *“${prevVerse.text.slice(0, 110)}${prevVerse.text.length > 110 ? "…" : ""}”*` : "- Opens at the very beginning of this chapter."}
${nextVerse ? `- **Right after (v. ${nextVerse.verse}):** *“${nextVerse.text.slice(0, 110)}${nextVerse.text.length > 110 ? "…" : ""}”*` : "- Brings this chapter's thought to its closing cadence."}

**Why this matters:** Within *${book.name}*'s overarching message (*${book.theme}*), ${refLabel} anchors our attention not merely on external information, but on trusting and responding to God's character.${
        matchedWords.length > 0
          ? `\n\n**Rich Theological Thread:** Notice **${matchedWords
              .map((m) => `${m.transliteration} (${m.literalGloss})`)
              .join("; ")}**—${matchedWords[0].richMeaning}`
          : ""
      }

**Practice Today:** Read ${refLabel} aloud once in your own voice, emphasizing a different word each time, and ask: *“What would change in my next two hours if I took this promise at face value?”*`,
    };
  }

  // 3. HISTORICAL & LITERARY CONTEXT
  if (actionOrPrompt === "context") {
    const keyParsed = parseScriptureReference(book.keyVerseRef);
    return {
      content: `### Historical & Literary Context: ${book.name}

- **Testament & Genre:** ${book.testament === "OT" ? "Old Testament" : "New Testament"} • *${book.category}*
- **Traditional Author:** ${book.author}
- **Historical Window:** ${book.dateWritten}
- **Total Scope:** ${book.chapters} chapter${book.chapters === 1 ? "" : "s"} (currently reading Chapter ${ctx.chapter})
- **Central Theme:** *${book.theme}*

**Book Overview:**
${book.overview}

**Reading Lens for ${book.category}:**
${
  book.category === "Poetry & Wisdom"
    ? "Hebrew poetry rhymes *ideas* (parallelism) rather than sounds—watch how the second line echoes, contrasts, or intensifies the first line."
    : book.category === "Gospels & Acts"
    ? "Pay close attention to the questions Jesus asks, the outsiders He welcomes, and how Old Testament expectations find surprising fulfillment in Him."
    : book.category.includes("Epistles")
    ? "Letters were written to real local congregations—notice how gospel identity ('what God has done in Christ') always comes before ethical imperatives ('how we therefore live')."
    : book.category.includes("Prophets")
    ? "Prophets served as covenant prosecuting attorneys and poets of hope—exposing injustice and idolatry while pointing forward to Messianic restoration."
    : "In biblical narrative, watch how God weaves faithful covenant purpose even through flawed human choices."
}`,
      citations: keyParsed
        ? [
            {
              label: `Jump to Key Verse (${book.keyVerseRef})`,
              bookNumber: keyParsed.bookNumber,
              chapter: keyParsed.chapter,
              verse: keyParsed.verse,
            },
          ]
        : undefined,
    };
  }

  // 4. WORD STUDY & ORIGINAL HEBREW/GREEK
  if (actionOrPrompt === "word_study") {
    const combinedText = focusVerses.map((v) => v.text).join(" ");
    const matchedLexicon = ORIGINAL_WORD_LEXICON.filter((w) =>
      w.englishTriggers.some((tr) => combinedText.toLowerCase().includes(tr))
    );

    // Also pick a meaningful keyword to query live BDB/Thayer lexicon if online!
    const topWords = extractKeyThemesFromVerses([combinedText]);
    const liveQueryWord = topWords[0]?.toLowerCase() || (ctx.bookNumber <= 39 ? "peace" : "grace");
    const liveDefs = await lookupOriginalLexiconOnline(liveQueryWord);

    const lexiconBlocks =
      matchedLexicon.length > 0
        ? matchedLexicon
            .slice(0, 3)
            .map(
              (w) =>
                `- **${w.original} — *${w.transliteration}*** (\`${w.strongs}\` • ${w.language}): *${w.literalGloss}*\n  ${w.richMeaning}`
            )
            .join("\n\n")
        : `- **${ctx.bookNumber <= 39 ? "Hebrew (Tanakh) Roots" : "Koine Greek (NT) Roots"}:** ${book.name} was originally composed in ${
            ctx.bookNumber <= 39 ? "Biblical Hebrew (with select Aramaic sections)" : "everyday Koine Greek"
          }, designed to be heard aloud in community.`;

    const liveBlocks =
      liveDefs.length > 0
        ? `\n\n**BDB / Thayer Lexicon Lookup (*“${liveQueryWord}”*):**\n` +
          liveDefs
            .slice(0, 2)
            .map(
              (d) =>
                `- **${d.lexeme || d.topic}** (*${d.transliteration || d.topic}*): ${d.short_definition}`
            )
            .join("\n")
        : "";

    return {
      content: `### Original Language Word Study (${refLabel})

${lexiconBlocks}${liveBlocks}

**Tip:** Open **Compare Versions** on ${refLabel} to see how word-for-word translations (like KJV, NASB, ESV, YLT) and dynamic translations (like NLT, BSB, NIV) render these nuances!`,
    };
  }

  // 5. CROSS REFERENCES
  if (actionOrPrompt === "cross_refs") {
    const curated = CURATED_CROSS_REFERENCES[`${ctx.bookNumber}:${ctx.chapter}`] || [];
    const citations: AiCitationLink[] = [];
    const lines: string[] = [];

    for (const item of curated) {
      const parsed = parseScriptureReference(item.ref);
      lines.push(`- **${item.ref}** — ${item.note}`);
      if (parsed) {
        citations.push({
          label: item.ref,
          bookNumber: parsed.bookNumber,
          chapter: parsed.chapter,
          verse: parsed.verse,
        });
      }
    }

    // Also search the installed Bible for thematic echoes!
    const keyTerms = extractKeyThemesFromVerses(focusVerses.map((v) => v.text));
    if (keyTerms.length > 0) {
      try {
        const searchRes = await searchInstalledBible(
          ctx.versionMeta,
          keyTerms.slice(0, 2).join(" "),
          { limit: 8 }
        );
        for (const hit of searchRes.results) {
          if (hit.bookNumber === ctx.bookNumber && hit.chapter === ctx.chapter) continue;
          if (citations.length >= 6) break;
          const rLabel = `${hit.bookName} ${hit.chapter}:${hit.verse}`;
          lines.push(`- **${rLabel}** — *“${hit.text.slice(0, 115)}${hit.text.length > 115 ? "…" : ""}”*`);
          citations.push({
            label: rLabel,
            bookNumber: hit.bookNumber,
            chapter: hit.chapter,
            verse: hit.verse,
          });
        }
      } catch {
        // Ignore if streaming-only version
      }
    }

    return {
      content: `### Scripture Interprets Scripture: Echoes of ${refLabel}

${
  lines.length > 0
    ? lines.join("\n")
    : `Explore the book's anchor passage **${book.keyVerseRef}** alongside Psalms and the Gospels to trace this theme across both Testaments.`
}

Tap any reference pill below to jump straight to that passage:`,
      citations: citations.slice(0, 6),
    };
  }

  // 6. PRAYER & LECTIO DIVINA
  if (actionOrPrompt === "prayer") {
    const anchorLine =
      focusVerses[0]?.text || `Your Word in ${book.name} ${ctx.chapter}`;
    return {
      content: `### Guided Prayer & *Lectio Divina* (${refLabel})

**1. Stillness (*Silencio*):** Take one slow breath and release the hurry of the last hour.

**2. Savor the Word (*Lectio*):**
> *“${anchorLine}”*

**3. Personal Prayer (*Oratio*):**
*“Living God, thank You for speaking through ${refLabel}. Where my heart is distracted or self-reliant today, anchor me in the truth of these words. Shape my speech, my patience, and my decisions around Your faithfulness. Help me walk out this passage not just as words on a screen, but in love toward the people I meet today. Amen.”*

**4. Carry One Question Today:** *Who in my life today needs to experience the grace or wisdom reflected in ${refLabel}?*`,
    };
  }

  // 7. INTERACTIVE CHAPTER QUIZ
  if (actionOrPrompt === "quiz") {
    const quiz = buildQuizFromChapter(book.name, ctx.chapter, verses);
    return {
      content: `### Interactive Reading Check: ${book.name} ${ctx.chapter}
Test what stood out from your reading of **${book.name} ${ctx.chapter}** below:`,
      quiz,
    };
  }

  // 8. FREE-FORM USER QUESTION!
  const qLower = actionOrPrompt.toLowerCase().trim();

  // Resolve explicit references to actual verse text when the selected version is installed.
  if (reference) {
    const parsedRef = parseScriptureReference(reference);
    if (parsedRef) {
      const targetBook = getBookMeta(parsedRef.bookNumber);
      const label = referencePassage?.label || formatReference(
        parsedRef.bookNumber,
        parsedRef.chapter,
        parsedRef.verse,
        parsedRef.verseEnd
      );
      const quotedPassage = referencePassage?.text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      const passageBlock = referencePassage
        ? `\n\n**Passage text (${ctx.versionMeta.shortName}):**\n${quotedPassage}`
        : "\n\nI could not load that verse from the selected translation. If it is not installed, switch to a bundled or downloaded version and try again.";
      const contextBlock = referencePassage?.contextText
        ? `\n\n**Nearby context (${ctx.versionMeta.shortName}):**\n${referencePassage.contextText
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")}`
        : "";
      return {
        content: `### Exploring ${label}

${passageBlock}${contextBlock}

**Book context:** *${targetBook.name}* (${targetBook.author}, ${targetBook.dateWritten}) centers on **${targetBook.theme}**. ${targetBook.overview}

Use the nearby verses to see how the thought develops before drawing a conclusion. Ask a follow-up about a phrase or interpretation, or tap the citation to open it in the reader.`,
        citations: [
          {
            label: `Open ${label}`,
            bookNumber: parsedRef.bookNumber,
            chapter: parsedRef.chapter,
            verse: parsedRef.verse,
          },
        ],
      };
    }
  }

  // Check topical / emotional life questions!
  const matchedTopic = TOPICAL_LIFE_GUIDES.find(
    (t) =>
      qLower.includes(t.id) ||
      qLower.includes(t.label.toLowerCase()) ||
      (t.id === "anxiety" && /anxious|worry|worried|afraid|fear|stress|overwhelm|panic/.test(qLower)) ||
      (t.id === "grief" && /sad|grief|loss|hurt|broken|lonely|cry|mourn/.test(qLower)) ||
      (t.id === "wisdom" && /decis|guide|direction|confused|choice|wisdom/.test(qLower)) ||
      (t.id === "forgiveness" && /forgiv|guilt|shame|sin|mercy|grace/.test(qLower)) ||
      (t.id === "strength" && /tired|weary|exhaust|burnout|weak|strength/.test(qLower)) ||
      (t.id === "purpose" && /purpose|identity|calling|meaning|future/.test(qLower))
  );

  if (matchedTopic) {
    const citations: AiCitationLink[] = [];
    const bullets = matchedTopic.passages.map((p) => {
      const parsed = parseScriptureReference(p.ref);
      if (parsed) {
        citations.push({
          label: p.ref,
          bookNumber: parsed.bookNumber,
          chapter: parsed.chapter,
          verse: parsed.verse,
        });
      }
      return `- **${p.ref}** — ${p.note}`;
    });

    return {
      content: `### ${matchedTopic.emoji} ${matchedTopic.label}
${matchedTopic.summary}

Here are key passages across Scripture to read and reflect on right now:
${bullets.join("\n")}

Tap any passage below to open it immediately in your reader:`,
      citations,
    };
  }

  // Search the installed Bible for keywords in the user's question!
  const searchWords = qLower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !STOP_WORDS.has(w) &&
        !["bible", "verse", "verses", "about", "mean", "means", "explain", "tell", "where", "does", "say", "says", "chapter", "help", "read"].includes(w)
    );

  if (searchWords.length > 0) {
    try {
      let searchRes = await searchInstalledBible(
        ctx.versionMeta,
        searchWords.slice(0, 2).join(" "),
        { limit: 5 }
      );
      let searchedTerms = searchWords.slice(0, 2).join(" ");
      if (searchRes.results.length === 0 && searchWords.length > 1) {
        searchedTerms = searchWords[0];
        searchRes = await searchInstalledBible(ctx.versionMeta, searchedTerms, { limit: 5 });
      }
      if (searchRes.results.length > 0) {
        const citations: AiCitationLink[] = searchRes.results.map((r) => ({
          label: `${r.bookName} ${r.chapter}:${r.verse}`,
          bookNumber: r.bookNumber,
          chapter: r.chapter,
          verse: r.verse,
        }));
        const lines = searchRes.results
          .map(
            (r) =>
              `- **${r.bookName} ${r.chapter}:${r.verse}** (${ctx.versionMeta.shortName}): *“${r.text}”*`
          )
          .join("\n");
        return {
          content: `### Scripture Passages Matching *“${searchedTerms}”*
Found **${searchRes.totalMatches.toLocaleString()}** matching verse${searchRes.totalMatches === 1 ? "" : "s"} in **${ctx.versionMeta.name}**:

${lines}

Click any verse pill below to jump directly to its full chapter context:`,
          citations,
        };
      }
    } catch {
      // Fall through to current chapter contextual answer
    }
  }

  // Contextual response anchored in current open chapter
  const sampleText = focusVerses.map((v) => `[v.${v.verse}] ${v.text}`).join(" ");
  return {
    content: `### Reflecting on ${refLabel} (${ctx.versionMeta.shortName})

You're currently in **${book.name} ${ctx.chapter}**, written by **${book.author}** (*${book.dateWritten}*), where the central thread is **${book.theme}**.

> ${simplifyArchaicPhrasing(sampleText.slice(0, 320))}${sampleText.length > 320 ? "…" : ""}

**Ways I can help you read deeper right now:**
- Tap **Explain Simply** above to unpack selected verses in clear modern phrasing
- Tap **Original Greek/Hebrew** to inspect root words & BDB/Thayer lexicon entries
- Ask about any topic (e.g. *“verses about peace”*, *“forgiveness”*, *“hope”*) or any reference (e.g. *“Romans 8:28”*)!`,
  };
}
