import {
  CANONICAL_BOOKS,
  formatReference,
  getBookMeta,
  parseScriptureReference,
} from "@/data/canonicalBooks";
import {
  CURATED_CROSS_REFERENCES,
  ORIGINAL_WORD_LEXICON,
  SERMON_FRAMEWORKS,
  TOPICAL_LIFE_GUIDES,
} from "@/data/scholarlyKnowledge";
import {
  getInstalledFullBible,
  searchInstalledBible,
} from "./bibleProviders";
import type {
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
  | "quiz"
  | "sermon";

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
  clarifyingQuestion?: string | null;
  suggestions?: string[];
  source?: "knowledge";
  timestamp: number;
}

export interface AiContextPayload {
  bookNumber: number;
  chapter: number;
  selectedVerses: number[];
  chapterData: NormalizedChapter | null;
  versionMeta: BibleVersionMeta;
  availableOfflineVersions?: BibleVersionMeta[];
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

const SEARCH_STOP_WORDS = new Set([
  ...STOP_WORDS,
  "bible", "verse", "verses", "scripture", "passage", "about", "mean", "means",
  "meaning", "explain", "tell", "where", "does", "say", "says", "chapter", "help",
  "read", "what", "which", "who", "when", "why", "how", "can", "could", "would",
  "should", "please", "show", "find", "give", "me", "the", "a", "an", "is", "are",
]);

interface RankedVerseEvidence {
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  versionShortName: string;
  score: number;
}

function normalizeWords(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !SEARCH_STOP_WORDS.has(word));
}

async function rankLocalBibleEvidence(
  question: string,
  ctx: AiContextPayload,
  limit = 5,
): Promise<RankedVerseEvidence[]> {
  const terms = [...new Set(normalizeWords(question))].slice(0, 8);
  if (terms.length === 0) return [];

  try {
    const versions = [
      ctx.versionMeta,
      ...(ctx.availableOfflineVersions || []).filter((version) => version.id !== ctx.versionMeta.id),
    ];
    const ranked: RankedVerseEvidence[] = [];
    const phrase = terms.length > 1 ? terms.slice(0, 3).join(" ") : "";

    for (const version of versions) {
      let bible: Awaited<ReturnType<typeof getInstalledFullBible>>;
      try {
        bible = await getInstalledFullBible(version);
      } catch {
        continue;
      }
      if (!bible) continue;

      for (const item of bible.books) {
        const canonical = getBookMeta(item.bookNumber);
        for (const chapter of item.chapters) {
          for (const verse of chapter.verses) {
            const normalized = verse.text
              .toLocaleLowerCase()
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "");
            const words = new Set(normalizeWords(verse.text));
            const matched = terms.filter((term) => words.has(term));
            if (matched.length === 0) continue;

            let score = matched.length * 3 + matched.length / terms.length;
            if (phrase && normalized.includes(phrase)) score += 5;
            if (version.id === ctx.versionMeta.id) score += 1.5;
            if (version.id === ctx.versionMeta.id && item.bookNumber === ctx.bookNumber && chapter.chapter === ctx.chapter) score += 1.5;
            if (version.id === ctx.versionMeta.id && ctx.selectedVerses.includes(verse.verse) && item.bookNumber === ctx.bookNumber && chapter.chapter === ctx.chapter) score += 1;
            ranked.push({
              bookNumber: item.bookNumber,
              bookName: canonical.name,
              chapter: chapter.chapter,
              verse: verse.verse,
              text: verse.text,
              versionShortName: version.shortName,
              score,
            });
          }
        }
      }
    }

    // Use the visible chapter as evidence when the selected edition streams chapters but is not fully downloaded.
    const selectedVersionIsFullyLocal = ctx.versionMeta.provider === "bundled" ||
      Boolean(ctx.availableOfflineVersions?.some((version) => version.id === ctx.versionMeta.id));
    if (!selectedVersionIsFullyLocal) {
      for (const verse of ctx.chapterData?.verses || []) {
        const words = new Set(normalizeWords(verse.text));
        const matched = terms.filter((term) => words.has(term));
        if (matched.length === 0) continue;
        ranked.push({
          bookNumber: ctx.bookNumber,
          bookName: getBookMeta(ctx.bookNumber).name,
          chapter: ctx.chapter,
          verse: verse.verse,
          text: verse.text,
          versionShortName: ctx.versionMeta.shortName,
          score: matched.length * 3 + matched.length / terms.length + 2,
        });
      }
    }

    const unique: RankedVerseEvidence[] = [];
    const seen = new Set<string>();
    for (const hit of ranked.sort((a, b) => b.score - a.score || a.bookNumber - b.bookNumber || a.chapter - b.chapter || a.verse - b.verse)) {
      const key = `${hit.versionShortName}:${hit.bookNumber}:${hit.chapter}:${hit.verse}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(hit);
      if (unique.length >= limit) break;
    }
    return unique;
  } catch {
    return [];
  }
}

const TOPIC_ALIASES: Record<string, string[]> = {
  anxiety: ["anxious", "worry", "worried", "afraid", "fear", "stress", "overwhelmed", "panic"],
  grief: ["sad", "grief", "loss", "hurt", "brokenhearted", "lonely", "cry", "mourn"],
  wisdom: ["decision", "decide", "guidance", "direction", "confused", "choice", "discernment"],
  forgiveness: ["forgive", "forgiveness", "guilt", "shame", "sin", "mercy", "grace", "repent"],
  strength: ["tired", "weary", "exhausted", "burnout", "weak", "strength", "endurance", "rest"],
  purpose: ["purpose", "identity", "calling", "meaning", "future", "gift"],
  love: ["love", "loved", "loving", "relationship", "kindness", "charity"],
  faith: ["faith", "believe", "belief", "trust"],
  hope: ["hope", "encouragement", "discouraged", "despair", "waiting"],
  prayer: ["prayer", "pray", "praying", "talk to god"],
  salvation: ["salvation", "saved", "redeemed", "grace", "eternal life"],
  "holy-spirit": ["holy spirit", "spirit of god", "fruit of the spirit", "comforter"],
  temptation: ["temptation", "tempted", "addiction", "resist", "self-control"],
  anger: ["anger", "angry", "resentment", "reconcile", "conflict"],
  family: ["family", "marriage", "husband", "wife", "parent", "child", "relationship"],
  suffering: ["suffering", "pain", "tragedy", "why do bad things", "lament", "affliction"],
  courage: ["bravery", "boldness", "fearless", "overcome fear"],
  integrity: ["honesty", "truthfulness", "character", "trustworthy"],
  gratitude: ["thanksgiving", "thankful", "grateful", "thankfulness"],
  justice: ["injustice", "oppression", "the poor", "fairness"],
  humility: ["humble", "pride", "servanthood"],
  leadership: ["leader", "pastor", "church leaders", "servant leadership"],
  perseverance: ["endurance", "persevere", "keep going", "persevering"],
  stewardship: ["generosity", "giving", "creation care", "environment", "climate", "climate change", "earth care", "money", "resources"],
  technology: ["social media", "internet", "artificial intelligence", "digital life", "screen time", "smartphone"],
  work: ["vocation", "career", "job", "workplace", "employment"],
  worship: ["praise", "worship music", "church service", "singing"],
  patience: ["self-control", "self control", "gentleness", "waiting patiently"],
  doubt: ["questions", "skepticism", "unbelief", "questioning faith"],
  reconciliation: ["repair a relationship", "make peace", "reconcile", "restoration"],
  healing: ["illness", "sickness", "health", "recovery", "physical healing"],
  evangelism: ["mission", "outreach", "sharing faith", "witness", "sharing the gospel"],
};

function findTopicalGuide(question: string) {
  const normalized = ` ${question.toLocaleLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim()} `;
  return TOPICAL_LIFE_GUIDES
    .map((topic) => {
      const directMatches = [topic.id.replace(/-/g, " "), topic.label.toLocaleLowerCase()];
      const synonyms = TOPIC_ALIASES[topic.id] || [];
      const score = directMatches.reduce((total, alias) => total + (normalized.includes(` ${alias} `) ? 3 : 0), 0) +
        synonyms.reduce((total, alias) => total + (normalized.includes(` ${alias} `) ? 1 : 0), 0);
      return { topic, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.topic;
}

function isSermonRequest(question: string, action: AiQuickAction | string): boolean {
  if (action === "sermon") return true;
  return /\b(?:prepare|write|draft|create|build|make|give me|help me with)\b.{0,60}\b(?:sermon|homily|preaching message|sermon outline)\b/i.test(question) ||
    /\b(?:sermon|homily|preaching outline)\s+(?:on|about|for|from)\b/i.test(question);
}

function extractSermonTopic(question: string, reference: string | null): string {
  let topic = question.trim();
  const sermonPhrase = topic.match(/\b(?:sermon|homily|preaching message|message)\b.*?\b(?:on|about|concerning|from|based on)\s+(.+)$/i);
  if (sermonPhrase?.[1]) topic = sermonPhrase[1];
  else {
    topic = topic
      .replace(/^(?:please\s+)?(?:can|could|would) you\s+/i, "")
      .replace(/^(?:help me|i need|i want|prepare|write|draft|create|build|make|give me)\s+/i, "")
      .replace(/\b(?:a|an|the)\s+(?:short\s+|brief\s+|bible-based\s+|biblical\s+)?(?:sermon|homily|preaching message|sermon outline|message)\b/i, " ");
  }

  if (reference) topic = topic.replace(reference, " ");
  topic = topic
    .replace(/\b(?:for|lasting|of)\s+\d+\s*(?:minutes?|mins?)\b.*$/i, "")
    .replace(/\b(?:for|to)\s+(?:this\s+)?(?:sunday|a sunday service|church service|the congregation|youth|teens|students|children|young adults|leaders|families)\b.*$/i, "")
    .replace(/\b(?:using|from|based on)\s*$/i, "")
    .replace(/\b(?:with|including)\s+(?:an?\s+)?(?:outline|introduction|conclusion|prayer|discussion questions)\b.*$/i, "")
    .replace(/^[\s:—-]*(?:on|about|concerning|regarding|from|based on)\s+/i, "")
    .replace(/[?!.;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!topic && reference) return `the message of ${reference}`;
  if (!topic || /^(?:any topic|any subject|anything|a topic|the bible|scripture)$/i.test(topic)) {
    return "faithfulness to God";
  }
  return topic.slice(0, 100);
}

function passageExcerpt(passage: { text: string } | null): string {
  if (!passage?.text) return "";
  const lines = passage.text.split("\n");
  const excerpt = lines.slice(0, 4).join("\n");
  return lines.length > 4 ? `${excerpt}\n[Read the full passage in context.]` : excerpt;
}

async function buildSermonDraft(
  topic: string,
  ctx: AiContextPayload,
  activeReference: string | null,
  activePassage: { label: string; text: string; contextText?: string } | null,
  guide: (typeof TOPICAL_LIFE_GUIDES)[number] | undefined,
  fallbackReference: string
): Promise<Omit<AiCompanionMessage, "id" | "role" | "timestamp">> {
  const framework = guide ? SERMON_FRAMEWORKS[guide.id] : undefined;
  const topicTerms = [...new Set(normalizeWords(topic))];
  const rankedEvidence = await rankLocalBibleEvidence(topic, ctx, 10);
  const minimumMatchedTerms = topicTerms.length <= 1 ? topicTerms.length : Math.max(2, Math.ceil(topicTerms.length * 0.55));
  const evidence = rankedEvidence.filter((hit) => {
    const verseWords = new Set(normalizeWords(hit.text));
    return topicTerms.filter((term) => verseWords.has(term)).length >= minimumMatchedTerms;
  });
  const evidenceReferences = evidence.filter((hit, index, hits) =>
    hits.findIndex((other) => other.bookNumber === hit.bookNumber && other.chapter === hit.chapter && other.verse === hit.verse) === index
  ).map((hit) => ({
    ref: `${hit.bookName} ${hit.chapter}:${hit.verse}`,
    note: `Relevant wording in the locally installed ${hit.versionShortName} text`,
    text: hit.text,
  }));
  const primaryReference = activeReference || guide?.passages[0]?.ref || evidenceReferences[0]?.ref || fallbackReference;
  const frameworkReferences = (framework?.points || [])
    .map((point) => extractScriptureReference(point.exposition))
    .filter((ref): ref is string => Boolean(ref));
  const candidates = [
    { ref: primaryReference, note: "Primary preaching text" },
    ...(guide?.passages || []),
    ...frameworkReferences.map((ref) => ({ ref, note: "A supporting text in the sermon framework" })),
    ...evidenceReferences,
  ];
  const passages: { ref: string; note: string; text: string }[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const parsed = parseScriptureReference(candidate.ref);
    if (!parsed) continue;
    const key = `${parsed.bookNumber}:${parsed.chapter}:${parsed.verse || 1}:${parsed.verseEnd || parsed.verse || 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const loaded = candidate.ref === activeReference && activePassage
      ? activePassage
      : await loadReferenceText(candidate.ref, ctx);
    const searched = evidenceReferences.find((item) => item.ref === candidate.ref);
    passages.push({
      ref: loaded?.label || candidate.ref,
      note: candidate.note,
      text: loaded?.text || (searched ? `[${parsed.verse || 1}] ${searched.text}` : ""),
    });
    if (passages.length >= 4) break;
  }

  const citations = passages.flatMap((passage) => {
    const parsed = parseScriptureReference(passage.ref);
    return parsed ? [{
      label: passage.ref,
      bookNumber: parsed.bookNumber,
      chapter: parsed.chapter,
      verse: parsed.verse,
    }] : [];
  });
  const displayTopic = guide?.label || topic;
  const hasRelevantAnchor = Boolean(activeReference || guide || evidenceReferences.length > 0);
  const bigIdea = framework?.bigIdea || (hasRelevantAnchor
    ? `The selected passages invite us to bring ${topic} under the wisdom of Scripture and respond with faithful love for God and neighbor.`
    : `A responsible biblical response to ${topic} begins by listening closely to Scripture and distinguishing what a text says directly from a modern application.`);
  const purpose = framework?.purpose ||
    `Help listeners examine ${topic} through Scripture, read each text in context, and choose a thoughtful next step.`;
  const topicMatchNote = !hasRelevantAnchor
    ? `**Topic match note:** I could not find a close topical match in the Bible texts installed on this device. This draft uses **${fallbackReference}** from your current reading as a starting point; it does not claim that this passage directly addresses **${topic}**. Add a Bible reference or a key biblical term for a more focused draft.\n\n`
    : "";
  const points = framework?.points || [
    {
      title: `Listen carefully to what Scripture says about ${topic}`,
      exposition: `Begin with the primary text, notice who is speaking and to whom, and explain the passage before drawing a lesson from it. ${passages[0]?.note || "Read the surrounding chapter to establish the setting."}`,
      application: "Invite listeners to name what the text affirms, questions, or calls them to do; avoid making the passage say more than it does.",
    },
    {
      title: `Let the wider biblical witness deepen the theme`,
      exposition: passages[1]
        ? `${passages[1].ref} adds another biblical perspective. Compare its setting and emphasis with the primary text rather than treating every verse as interchangeable.`
        : `Search the surrounding chapter and the wider biblical story for context, repeated themes, and any tensions the text preserves.`,
      application: "Ask what this second passage adds or corrects, and make room for questions and differing experiences in the congregation.",
    },
    {
      title: `Respond with a concrete act of faithful love`,
      exposition: passages[2]
        ? `${passages[2].ref} offers a further witness to the topic. Keep the response connected to what these passages teach, not to a promise they do not make.`
        : `Bring the message toward a response that follows from the primary text and honors the people who will hear it.`,
      application: "Offer one practical invitation for the coming week, with support and safeguards appropriate to the situation.",
    },
  ];
  const primary = passages[0];
  const opening = `We have gathered around the question of **${displayTopic}**. Rather than reaching for a quick slogan, let us listen closely to the biblical text, notice its setting, and ask how its truth can shape our life together.`;
  const outline = points.map((point, index) => {
    const associatedPassage = passages[Math.min(index, passages.length - 1)];
    const excerpt = passageExcerpt(associatedPassage || null);
    return `**${index + 1}. ${point.title}**${associatedPassage ? ` (${associatedPassage.ref})` : ""}\n${point.exposition}\n\n*Preaching application:* ${point.application}${excerpt ? `\n\n> ${excerpt.split("\n").join("\n> ")}` : ""}`;
  }).join("\n\n");
  const additionalReferences = passages.length > 0
    ? passages.map((passage) => `- **${passage.ref}** — ${passage.note}`).join("\n")
    : `- **${fallbackReference}** — Read this passage in its full chapter context and select a primary text before preaching.`;

  return {
    content: `### Sermon draft: ${displayTopic}\n\n**Topic:** ${topic}\n**Primary text:** ${primary?.ref || fallbackReference} (${ctx.versionMeta.shortName})\n**Big idea:** ${bigIdea}\n**Purpose:** ${purpose}\n\n${topicMatchNote}**Introduction**\n${opening}\n\n**Sermon outline and exposition**\n\n${outline}\n\n**Conclusion**\nThe invitation is not to leave with a slogan, but to carry the truth of these passages into a concrete act of faith, hope, justice, mercy, or love this week. Re-state the big idea, allow a moment for reflection, and close with a prayer suited to the congregation's needs.\n\n**Bible portions to read and reference**\n${additionalReferences}\n\n*Preparation note:* Read each full passage and its surrounding chapter before preaching. These are locally curated study notes and a sermon draft; check interpretation against context and your church tradition, and adapt examples for your congregation.`,
    citations,
    suggestions: [
      `Explain ${primary?.ref || fallbackReference} in simple words`,
      `Show cross-references for ${primary?.ref || fallbackReference}`,
      `What does the Bible say about ${topic}?`,
    ],
    source: "knowledge",
  };
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
  const qLower = effectivePrompt.toLocaleLowerCase().trim();
  const previousUserPrompt = [...(ctx.conversationHistory || [])]
    .reverse()
    .find((message) => message.role === "user")?.content || "";
  const isFollowUp = /^(tell me more|go deeper|why\??|how so\??|explain that|what about that|and how|can you expand)/i.test(qLower);
  const retrievalQuestion = isFollowUp && previousUserPrompt
    ? `${previousUserPrompt} ${effectivePrompt}`
    : effectivePrompt;
  const reference = extractScriptureReference(effectivePrompt);
  const referencePassage = reference ? await loadReferenceText(reference, ctx) : null;
  const isWalkthrough = actionOrPrompt === "walkthrough" || /walk me through|chapter overview|chapter summary|what happens in this chapter/.test(qLower);
  const isExplain = actionOrPrompt === "explain" || /\b(explain|in simple words|plain language|what does .* mean|meaning of)\b/.test(qLower);
  const isContext = actionOrPrompt === "context" || /historical context|background of|who wrote|when was .* written/.test(qLower);
  const asksLexiconQuestion = /meaning of|define|what is the word|what does .* mean/.test(qLower) && ORIGINAL_WORD_LEXICON.some((word) => qLower.includes(word.id) || word.englishTriggers.some((trigger) => qLower.includes(trigger)));
  const isWordStudy = actionOrPrompt === "word_study" || /original language|greek|hebrew|word study|strong.?s number/.test(qLower) || asksLexiconQuestion;
  const isCrossRefs = actionOrPrompt === "cross_refs" || /cross.?references|related passages|other verses about|connected passages/.test(qLower);
  const isPrayer = actionOrPrompt === "prayer" || /\b(prayer|pray with me|help me pray)\b/.test(qLower);
  const isQuiz = actionOrPrompt === "quiz" || /\b(quiz me|test me on|make .* quiz)\b/.test(qLower);
  const isSermon = isSermonRequest(effectivePrompt, actionOrPrompt);

  if (isSermon) {
    const sermonTopic = extractSermonTopic(effectivePrompt, reference);
    const sermonGuide = findTopicalGuide(sermonTopic) || findTopicalGuide(retrievalQuestion);
    return buildSermonDraft(sermonTopic, ctx, reference, referencePassage, sermonGuide, refLabel);
  }

  // 1. WALKTHROUGH
  if (isWalkthrough) {
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
      suggestions: [
        `Explain ${book.name} ${ctx.chapter} in simple words`,
        `Show cross-references for ${book.name} ${ctx.chapter}`,
        `What is the historical background of ${book.name}?`,
      ],
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
  if (isExplain) {
    const referenceBook = reference && parseScriptureReference(reference)
      ? getBookMeta(parseScriptureReference(reference)!.bookNumber)
      : book;
    const explainLabel = referencePassage?.label || refLabel;
    const referenceVerses = referencePassage?.text
      .split("\n")
      .map((line) => line.replace(/^\[\d+\]\s*/, ""))
      .join(" ");
    const combinedText = referenceVerses || focusVerses.map((v) => v.text).join(" ");
    const plainReading = simplifyArchaicPhrasing(combinedText);
    const referenceParsed = reference ? parseScriptureReference(reference) : null;
    const referenceIsCurrentChapter = referenceParsed?.bookNumber === ctx.bookNumber && referenceParsed.chapter === ctx.chapter;
    const firstVerseNum = referenceIsCurrentChapter && referenceParsed?.verse
      ? referenceParsed.verse
      : focusVerses[0]?.verse || 1;
    const prevVerse = referenceIsCurrentChapter ? verses.find((v) => v.verse === firstVerseNum - 1) : undefined;
    const lastFocusedVerse = referenceIsCurrentChapter && referenceParsed?.verseEnd
      ? referenceParsed.verseEnd
      : focusVerses[focusVerses.length - 1]?.verse || 1;
    const nextVerse = referenceIsCurrentChapter ? verses.find((v) => v.verse === lastFocusedVerse + 1) : undefined;

    const matchedWords = ORIGINAL_WORD_LEXICON.filter((w) =>
      w.englishTriggers.some((tr) => combinedText.toLowerCase().includes(tr))
    ).slice(0, 2);

    return {
      content: `### Plain-Language Reading of ${explainLabel}

**In clear everyday phrasing:**
> ${plainReading || "Select a verse in the reader to unpack its meaning."}

**Immediate Flow in ${referenceBook.name} ${referenceParsed?.chapter || ctx.chapter}:**
${prevVerse ? `- **Just before (v. ${prevVerse.verse}):** *“${prevVerse.text.slice(0, 110)}${prevVerse.text.length > 110 ? "…" : ""}”*` : "- Opens at the very beginning of this chapter."}
${nextVerse ? `- **Right after (v. ${nextVerse.verse}):** *“${nextVerse.text.slice(0, 110)}${nextVerse.text.length > 110 ? "…" : ""}”*` : "- Brings this chapter's thought to its closing cadence."}

**Why this matters:** Within *${referenceBook.name}*'s overarching message (*${referenceBook.theme}*), ${explainLabel} anchors our attention not merely on external information, but on trusting and responding to God's character.${
        matchedWords.length > 0
          ? `\n\n**Rich Theological Thread:** Notice **${matchedWords
              .map((m) => `${m.transliteration} (${m.literalGloss})`)
              .join("; ")}**—${matchedWords[0].richMeaning}`
          : ""
      }

**Practice Today:** Read ${explainLabel} aloud once in your own voice, emphasizing a different word each time, and ask: *“What would change in my next two hours if I took this promise at face value?”*`,
      citations: referenceParsed
        ? [{ label: `Open ${explainLabel}`, bookNumber: referenceParsed.bookNumber, chapter: referenceParsed.chapter, verse: referenceParsed.verse }]
        : undefined,
      suggestions: [
        `Show cross-references for ${explainLabel}`,
        `What is the historical background of ${referenceBook.name}?`,
        `Help me pray about ${referenceBook.theme}`,
      ],
    };
  }

  // 3. HISTORICAL & LITERARY CONTEXT
  if (isContext) {
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
      suggestions: [
        `Walk me through ${book.name} ${ctx.chapter}`,
        `Show cross-references for ${book.name} ${ctx.chapter}`,
        `Explain ${book.name} ${ctx.chapter} in simple words`,
      ],
    };
  }

  // 4. WORD STUDY & ORIGINAL HEBREW/GREEK
  if (isWordStudy) {
    const combinedText = focusVerses.map((v) => v.text).join(" ");
    const matchedLexicon = ORIGINAL_WORD_LEXICON.filter((w) =>
      w.englishTriggers.some((tr) => combinedText.toLowerCase().includes(tr)) ||
      qLower.includes(w.id) ||
      qLower.includes(w.transliteration.toLocaleLowerCase().split(" ")[0]) ||
      w.englishTriggers.some((tr) => qLower.includes(tr))
    );

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

    return {
      content: `### Original Language Word Study (${refLabel})

${lexiconBlocks}

**About this local reference:** Selah shows curated Hebrew and Greek entries that match the selected passage; it does not claim to parse every original-language form. Compare installed translations of ${refLabel} for additional wording differences!`,
      suggestions: [
        `Show cross-references for ${refLabel}`,
        `What does ${refLabel} say about ${matchedLexicon[0]?.englishTriggers[0] || "this word"}?`,
      ],
    };
  }

  // 5. CROSS REFERENCES
  if (isCrossRefs) {
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
      suggestions: [
        `Explain ${refLabel} in simple words`,
        `What does the Bible say about ${keyTerms[0]?.toLocaleLowerCase() || book.theme}?`,
      ],
    };
  }

  // 6. PRAYER & LECTIO DIVINA
  if (isPrayer) {
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
      suggestions: [
        `Show cross-references for ${refLabel}`,
        `Explain ${refLabel} in simple words`,
      ],
    };
  }

  // 7. INTERACTIVE CHAPTER QUIZ
  if (isQuiz) {
    const quiz = buildQuizFromChapter(book.name, ctx.chapter, verses);
    return {
      content: `### Interactive Reading Check: ${book.name} ${ctx.chapter}
Test what stood out from your reading of **${book.name} ${ctx.chapter}** below:`,
      quiz,
    };
  }

  // 8. FREE-FORM USER QUESTION!

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

  // Curated local guides cover common themes; every listed passage links into the reader.
  const matchedTopic = findTopicalGuide(retrievalQuestion);
  if (matchedTopic) {
    const citations: AiCitationLink[] = [];
    const passageLines = await Promise.all(matchedTopic.passages.slice(0, 5).map(async (passage) => {
      const parsed = parseScriptureReference(passage.ref);
      if (parsed) {
        citations.push({
          label: passage.ref,
          bookNumber: parsed.bookNumber,
          chapter: parsed.chapter,
          verse: parsed.verse,
        });
      }
      const localPassage = await loadReferenceText(passage.ref, ctx);
      const verseText = localPassage?.text
        ? `\n  ${localPassage.text.split("\n").map((line) => `> ${line}`).join("\n  ")}`
        : "";
      return `- **${passage.ref}** — ${passage.note}${verseText}`;
    }));

    return {
      content: `### ${matchedTopic.emoji} ${matchedTopic.label}\n\n${matchedTopic.summary}\n\n**Passages to explore in ${ctx.versionMeta.shortName}:**\n${passageLines.join("\n")}\n\nThese are curated reading paths, not a substitute for reading each passage in its chapter context. Tap a citation to open it.`,
      citations,
      clarifyingQuestion: /\b(my|i am|i feel|i'm|me)\b/.test(qLower)
        ? "Would you prefer a few passages to read, a short prayer, or practical reflection questions?"
        : undefined,
      suggestions: [
        `Show cross-references for ${matchedTopic.label.toLocaleLowerCase()}`,
        `Help me pray about ${matchedTopic.label.toLocaleLowerCase()}`,
        `Walk me through ${book.name} ${ctx.chapter}`,
      ],
      source: "knowledge",
    };
  }

  // Retrieve evidence from the currently selected full Bible edition, ranking verse matches locally.
  const evidence = await rankLocalBibleEvidence(retrievalQuestion, ctx);
  if (evidence.length > 0) {
    const citationByReference = new Map<string, AiCitationLink>();
    for (const hit of evidence) {
      const key = `${hit.bookNumber}:${hit.chapter}:${hit.verse}`;
      citationByReference.set(key, {
        label: `${hit.bookName} ${hit.chapter}:${hit.verse}`,
        bookNumber: hit.bookNumber,
        chapter: hit.chapter,
        verse: hit.verse,
      });
    }
    const citations = [...citationByReference.values()];
    const evidenceLines = evidence
      .map((hit) => `- **${hit.bookName} ${hit.chapter}:${hit.verse}** (${hit.versionShortName}): *“${hit.text}”*`)
      .join("\n");
    const lead = getBookMeta(evidence[0].bookNumber);
    const followUpReference = `${evidence[0].bookName} ${evidence[0].chapter}:${evidence[0].verse}`;

    return {
      content: `### Bible Knowledge Search\n\nI searched Bible editions installed on this device, including **${ctx.versionMeta.name}**. These are the closest verse matches to the main words in your question: \n\n${evidenceLines}\n\n**Context note:** ${lead.name} is traditionally attributed to ${lead.author} and is centered on *${lead.theme}*. Search matches help locate relevant wording; read the surrounding chapter before treating a verse as a complete answer.`,
      citations,
      clarifyingQuestion: isFollowUp
        ? undefined
        : "Are you asking about the meaning of one of these verses, the history behind it, or how it connects to another passage?",
      suggestions: [
        `Explain ${followUpReference} in simple words`,
        `Show cross-references for ${followUpReference}`,
        `What is the historical background of ${lead.name}?`,
      ],
      source: "knowledge",
    };
  }

  // If the question is broad or not represented in the installed text, ask for a useful anchor.
  const sampleText = focusVerses.map((v) => `[v.${v.verse}] ${v.text}`).join(" ");
  return {
    content: `### Let’s find the right passage\n\nI couldn’t find a close match in the locally available **${ctx.versionMeta.name}** text for *“${effectivePrompt}”*. Selah’s built-in centre can search the full installed Bible, explain a cited passage, show curated topic guides, compare translations available in the reader, and offer selected Hebrew/Greek word notes.\n\nTry including a Bible reference (for example, **Romans 8:28**), one or two key words, or tell me what part of the answer you want to explore.\n\n**Current reading:** ${refLabel} — *“${simplifyArchaicPhrasing(sampleText.slice(0, 220))}${sampleText.length > 220 ? "…" : ""}”*`,
    clarifyingQuestion: "Which Bible passage, person, or topic should I look up?",
    suggestions: [
      `Walk me through ${book.name} ${ctx.chapter}`,
      `Show cross-references for ${refLabel}`,
      "What does the Bible say about hope?",
    ],
    source: "knowledge",
  };
}
