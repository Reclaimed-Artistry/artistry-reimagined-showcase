import { unzipSync, strFromU8 } from "fflate";
import {
  BOOK_BY_CDN_ABBREV,
  BOOK_BY_NUMBER,
  BOOK_BY_USFM,
  CANONICAL_BOOKS,
  getBookMeta,
} from "@/data/canonicalBooks";
import { detectHeuristicJesusSpeechRanges } from "@/data/scholarlyKnowledge";
import {
  cacheStreamedChapter,
  getCachedCatalog,
  getCachedStreamedChapter,
  getOfflineBible,
  saveCachedCatalog,
  saveOfflineBible,
} from "./offlineDb";
import type {
  BibleVersionMeta,
  NormalizedBible,
  NormalizedBook,
  NormalizedChapter,
  NormalizedFootnote,
  NormalizedHeading,
  NormalizedVerse,
  VersionDownloadProgress,
} from "@/types/bible";

const memoryBibleCache = new Map<string, NormalizedBible>();
const memoryChapterCache = new Map<string, NormalizedChapter>();

export const BUNDLED_VERSIONS: BibleVersionMeta[] = [
  {
    id: "bundled:en_bsb",
    shortName: "BSB",
    name: "Berean Standard Bible",
    language: "English",
    languageCode: "en",
    textDirection: "ltr",
    provider: "bundled",
    providerSlug: "en_bsb",
    estimatedSizeMB: 3.9,
    description:
      "Pre-installed complete 66-book modern English translation—clear, accurate, public domain, with studio audio & red-letter support.",
    regionTag: "English",
    hasStudioAudio: true,
    hasRedLetter: true,
    featured: true,
    licenseNotice: "Berean Standard Bible (BSB) — Public Domain (berean.bible)",
  },
  {
    id: "bundled:en_kjv",
    shortName: "KJV",
    name: "King James Version (1769)",
    language: "English",
    languageCode: "en",
    textDirection: "ltr",
    provider: "bundled",
    providerSlug: "en_kjv",
    estimatedSizeMB: 4.2,
    description:
      "Pre-installed complete 66-book classic Authorized King James Version—ready 100% offline with zero download needed.",
    regionTag: "English",
    hasRedLetter: true,
    featured: true,
    licenseNotice: "King James Version — Public Domain",
  },
];

// Copyrighted versions are listed with an official reader link, not copied into our app.
const OFFICIAL_EXTERNAL_VERSIONS: BibleVersionMeta[] = [
  {
    id: "external:pcm-pcmwbt",
    shortName: "PCM",
    name: "Nigerian Pidgin English Bible — 2012 Edition",
    language: "Nigerian Pidgin",
    languageCode: "pcm",
    textDirection: "ltr",
    provider: "external",
    providerSlug: "2516",
    estimatedSizeMB: 0,
    description:
      "Official online edition hosted by YouVersion. The text is copyrighted by Wycliffe Bible Translators, Inc., so it is opened at the publisher rather than copied or stored by Selah.",
    regionTag: "African & Nigerian",
    featured: true,
    licenseNotice: "© Wycliffe Bible Translators, Inc. — read the official edition online.",
    licenseUrl: "https://www.bible.com/versions/2516-pcm-holy-bible-nigerian-pidgin-english",
    sourceUrl: "https://www.bible.com/bible/2516/GEN.1.PCM",
  },
];

const FEATURED_SHORT_MAP: Record<string, { short: string; featured?: boolean; desc?: string }> = {
  en_niv: { short: "NIV", featured: true, desc: "New International Version — balanced thought-for-thought modern English." },
  en_nkjv: { short: "NKJV", featured: true, desc: "New King James Version — classic cadence updated for modern clarity." },
  en_esv: { short: "ESV", featured: true, desc: "English Standard Version — essentially literal literary precision." },
  en_nlt: { short: "NLT", featured: true, desc: "New Living Translation — warm, natural contemporary readability." },
  en_nasb: { short: "NASB", featured: true, desc: "New American Standard Bible — word-for-word study accuracy." },
  en_amp: { short: "AMP", featured: true, desc: "Amplified Bible — expands rich shades of Hebrew & Greek meaning." },
  en_csb: { short: "CSB", featured: true, desc: "Christian Standard Bible — optimal equivalence clarity & fidelity." },
  en_web: { short: "WEB", featured: true, desc: "World English Bible — open public-domain modern English translation." },
  en_asv: { short: "ASV", desc: "American Standard Version (1901) — revered classic study translation." },
  en_cev: { short: "CEV", desc: "Contemporary English Version — clear everyday speech." },
  en_gnt: { short: "GNT", desc: "Good News Translation — accessible plain-English edition." },
  en_leb: { short: "LEB", desc: "Lexham English Bible — transparent literal translation." },
  en_ylt98: { short: "YLT", desc: "Young's Literal Translation — preserves original verb tenses." },
  yo_oycb: { short: "OYCB", featured: true, desc: "Bibeli Mimo — Open Yoruba Contemporary Bible (Nigeria)." },
  ig_biuo: { short: "BIUO", featured: true, desc: "Baịbụlụ Nsọ — Igbo Bible (Nigeria)." },
  ha_bsrk: { short: "BSRK", featured: true, desc: "Littafi Mai Tsarki — Hausa Bible (Nigeria & West Africa)." },
  sw_sruv: { short: "SUV", featured: true, desc: "Biblia Takatifu — Swahili Union Version (East Africa)." },
  es_rvr1960: { short: "RVR60", featured: true, desc: "Reina-Valera 1960 — beloved classic Spanish Bible." },
  fr_apee: { short: "APEE", featured: true, desc: "La Bible de l'Épée — French Scripture edition." },
  pt_nvi: { short: "NVI-PT", featured: true, desc: "Nova Versão Internacional — Portuguese modern translation." },
  de_sch1951: { short: "SCH51", desc: "Schlachter 1951 — German classic faithful translation." },
  he_wlc: { short: "WLC", featured: true, desc: "Westminster Leningrad Codex — Original Biblical Hebrew Old Testament." },
  grc_grctr: { short: "TR-GRK", featured: true, desc: "Textus Receptus — Original Koine Greek New Testament." },
  grc_grcbrent: { short: "LXX", desc: "Brenton Septuagint — Ancient Greek Old Testament." },
  la_vulg: { short: "VULG", desc: "Biblia Sacra Vulgata — Latin Vulgate." },
  ar_kehm: { short: "KEHM", desc: "Ketab El Hayat — Arabic Scripture translation." },
};

const RTL_LANG_REGEX = /arabic|hebrew|persian|farsi|urdu|yiddish|syriac|kurdish|sorani/i;

function inferRegionTag(language: string): string {
  if (/english/i.test(language)) return "English";
  if (/yoruba|igbo|hausa|swahili|akan|luganda|oromo|shona|afrikaans|kinyarwanda|lingala|rundi|chichewa|tswana|ewe|kikuyu|ndebele|somali|amharic|zulu|xhosa/i.test(language)) {
    return "African & Nigerian";
  }
  if (/hebrew|greek|latin|aramaic|coptic|church slavonic/i.test(language)) {
    return "Original & Ancient";
  }
  if (/spanish|french|portuguese|german|italian|dutch|polish|russian|ukrainian|romanian|swedish|norwegian|finnish|czech|hungarian|greek|albanian|croatian|serbian|bulgarian/i.test(language)) {
    return "European";
  }
  return "Global & Asian";
}

function cleanBollsHtml(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<S>[^<]*<\/S>/gi, "")
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:i|em|b|strong|span|p|div|small|mark|u|font)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Loads the complete unified catalog of Bible versions:
 * 1) 2 Pre-installed Offline Bundled Bibles (BSB + KJV)
 * 2) 141 Global Open CDN Bibles (/bibles/cdn_catalog.json)
 * 3) 146 Bolls Open Archive Bibles (/bibles/bolls_catalog.json + live refresh)
 * 4) HelloAO Free Use Bible API translations (live fetch + cached in IndexedDB)
 */
export type CatalogSyncStatus = "loading" | "ready" | "error";

export async function loadUnifiedCatalog(
  onRemoteUpdate?: (allVersions: BibleVersionMeta[]) => void,
  onRemoteStatus?: (status: CatalogSyncStatus) => void
): Promise<BibleVersionMeta[]> {
  const map = new Map<string, BibleVersionMeta>();
  for (const v of BUNDLED_VERSIONS) {
    map.set(v.id, v);
  }
  for (const v of OFFICIAL_EXTERNAL_VERSIONS) {
    map.set(v.id, v);
  }

  // 1. Load local CDN catalog (/bibles/cdn_catalog.json)
  try {
    const res = await fetch("/bibles/cdn_catalog.json");
    if (res.ok) {
      const cdnLangs: { language: string; versions: { name: string; abbreviation: string }[] }[] =
        await res.json();
      for (const group of cdnLangs) {
        const lang = group.language;
        for (const ver of group.versions) {
          // Skip exact duplicates of bundled KJV/BSB so there's no confusion, or offer them clearly
          if (ver.abbreviation === "en_kjv" || ver.abbreviation === "en_bsb") continue;
          const feat = FEATURED_SHORT_MAP[ver.abbreviation];
          const rawShort =
            feat?.short ||
            ver.abbreviation
              .replace(/^[a-z]{2,3}_/i, "")
              .toUpperCase()
              .slice(0, 8);
          const id = `cdn:${ver.abbreviation}`;
          map.set(id, {
            id,
            shortName: rawShort,
            name: ver.name,
            language: lang,
            languageCode: ver.abbreviation.split("_")[0] || "en",
            textDirection: RTL_LANG_REGEX.test(lang) ? "rtl" : "ltr",
            provider: "cdn",
            providerSlug: ver.abbreviation,
            estimatedSizeMB: 4.1,
            description:
              feat?.desc ||
              `Complete offline-downloadable ${lang} Scripture edition via Open Scripture CDN.`,
            regionTag: inferRegionTag(lang),
            hasRedLetter: true,
            featured: Boolean(feat?.featured),
          });
        }
      }
    }
  } catch {
    // Ignore local catalog error
  }

  // 2. Load local Bolls catalog (/bibles/bolls_catalog.json)
  try {
    const res = await fetch("/bibles/bolls_catalog.json");
    if (res.ok) {
      const bollsLangs: {
        language: string;
        translations: { short_name: string; full_name: string; dir?: string }[];
      }[] = await res.json();
      for (const group of bollsLangs) {
        const cleanLang = group.language.split(" ")[0].trim() || group.language;
        for (const tr of group.translations) {
          const id = `bolls:${tr.short_name}`;
          const isMsgOrUnique = ["MSG", "NET", "RSV", "NRSVCE", "LSB", "CJB", "TLV", "LXXE", "YLT", "SYNOD"].includes(
            tr.short_name
          );
          map.set(id, {
            id,
            shortName: tr.short_name,
            name: tr.full_name,
            language: cleanLang,
            languageCode: cleanLang.slice(0, 2).toLowerCase(),
            textDirection: tr.dir === "rtl" || RTL_LANG_REGEX.test(group.language) ? "rtl" : "ltr",
            provider: "bolls",
            providerSlug: tr.short_name,
            estimatedSizeMB: 3.6,
            description: `${group.language} • Stream chapters instantly or download complete archive via Bolls.`,
            regionTag: inferRegionTag(group.language),
            hasFootnotes: true,
            hasRedLetter: true,
            featured: isMsgOrUnique,
          });
        }
      }
    }
  } catch {
    // Ignore
  }

  // 3. Check cached HelloAO catalog first for instant offline rendering
  const cachedHello = await getCachedCatalog("helloao_v1");
  if (cachedHello && cachedHello.length > 0) {
    for (const hv of cachedHello) {
      if (!map.has(hv.id)) map.set(hv.id, hv);
    }
  }

  // Refresh through our same-origin Vercel function so provider access is not
  // dependent on each device's browser CORS, DNS, or network configuration.
  if (typeof navigator === "undefined" || navigator.onLine !== false) {
    onRemoteStatus?.("loading");
    const getHelloAoPayload = async () => {
      try {
        const proxyResponse = await fetch("/api/helloao/translations", {
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        });
        if (proxyResponse.ok) {
          const proxyPayload = await proxyResponse.json();
          if (Array.isArray(proxyPayload?.translations)) return proxyPayload;
        }
      } catch {
        // Local development and non-Vercel hosts may not provide the proxy.
      }

      const directResponse = await fetch("https://bible.helloao.org/api/available_translations.json", {
        signal: AbortSignal.timeout(15_000),
      });
      if (!directResponse.ok) throw new Error("The translation catalog request failed");
      const directPayload = await directResponse.json();
      if (!Array.isArray(directPayload?.translations)) {
        throw new Error("The translation catalog response was invalid");
      }
      return directPayload;
    };

    getHelloAoPayload()
      .then(async (payload) => {
        const freshHello: BibleVersionMeta[] = [];
        for (const t of payload.translations) {
          if (!t || typeof t.id !== "string" || !t.id) continue;
          const id = `helloao:${t.id}`;
          const langDisplay = t.languageEnglishName || t.languageName || t.language || "Global";
          const meta: BibleVersionMeta = {
            id,
            shortName: t.shortName || t.id,
            name: t.englishName || t.name || t.id,
            language: langDisplay,
            languageCode: t.language || "und",
            textDirection: t.textDirection === "rtl" ? "rtl" : "ltr",
            provider: "helloao",
            providerSlug: t.id,
            estimatedSizeMB: Number(((t.totalNumberOfChapters || 1189) * 0.0052).toFixed(1)),
            description: `${t.name || t.id} (${langDisplay} • ${t.numberOfBooks || 66} books) — Free Use Bible API with footnotes & formatting.`,
            regionTag: inferRegionTag(langDisplay),
            hasFootnotes: true,
            hasRedLetter: true,
            hasStudioAudio: t.id === "BSB" || t.id === "engwebp",
            licenseNotice: t.licenseNotice || undefined,
            licenseUrl: t.licenseUrl || undefined,
          };
          freshHello.push(meta);
          map.set(id, meta);
        }
        if (freshHello.length === 0) throw new Error("The provider returned no translations");
        await saveCachedCatalog("helloao_v1", freshHello);
        onRemoteUpdate?.(sortCatalog(Array.from(map.values())));
        onRemoteStatus?.("ready");
      })
      .catch(() => {
        onRemoteStatus?.("error");
      });
  } else {
    onRemoteStatus?.("error");
  }

  return sortCatalog(Array.from(map.values()));
}

function sortCatalog(list: BibleVersionMeta[]): BibleVersionMeta[] {
  return list.sort((a, b) => {
    if (a.provider === "bundled" && b.provider !== "bundled") return -1;
    if (b.provider === "bundled" && a.provider !== "bundled") return 1;
    if (a.featured && !b.featured) return -1;
    if (b.featured && !a.featured) return 1;
    if (a.language === "English" && b.language !== "English") return -1;
    if (b.language === "English" && a.language !== "English") return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Parses a `thiagobodruk/bible` 66-book JSON array into `NormalizedBible`
 */
function parseCdnArrayBible(
  rawBooks: { abbrev?: string; name?: string; chapters: string[][] }[],
  meta: BibleVersionMeta,
  sizeBytes: number
): NormalizedBible {
  const books: NormalizedBook[] = rawBooks.slice(0, 66).map((rawBook, idx) => {
    const byAbbrev = rawBook.abbrev ? BOOK_BY_CDN_ABBREV.get(rawBook.abbrev.toLowerCase()) : undefined;
    const canon = byAbbrev || BOOK_BY_NUMBER.get(idx + 1) || CANONICAL_BOOKS[idx];
    const chapters: NormalizedChapter[] = (rawBook.chapters || []).map((verseStrings, cIdx) => {
      const chNum = cIdx + 1;
      const verses: NormalizedVerse[] = verseStrings.map((vText, vIdx) => {
        const cleanText = String(vText || "").trim();
        return {
          verse: vIdx + 1,
          text: cleanText,
          redLetterRanges: detectHeuristicJesusSpeechRanges(canon.bookNumber, chNum, cleanText),
        };
      });
      return {
        chapter: chNum,
        verses,
      };
    });
    return {
      bookNumber: canon.bookNumber,
      usfm: canon.usfm,
      name: rawBook.name || canon.name,
      chapters,
    };
  });

  return {
    versionId: meta.id,
    shortName: meta.shortName,
    name: meta.name,
    language: meta.language,
    textDirection: meta.textDirection,
    downloadedAt: Date.now(),
    sizeBytes,
    books,
  };
}

/**
 * Parses a Bolls flat verse array `[{ book, chapter, verse, text, comment }]` into `NormalizedBible`
 */
function parseBollsFlatBible(
  flatVerses: { book: number; chapter: number; verse: number; text: string; comment?: string }[],
  meta: BibleVersionMeta,
  sizeBytes: number
): NormalizedBible {
  const bookMap = new Map<number, Map<number, NormalizedVerse[]>>();

  for (const row of flatVerses) {
    const bNum = Number(row.book);
    if (!bNum || bNum < 1 || bNum > 66) continue;
    let chMap = bookMap.get(bNum);
    if (!chMap) {
      chMap = new Map();
      bookMap.set(bNum, chMap);
    }
    const chNum = Number(row.chapter) || 1;
    let vList = chMap.get(chNum);
    if (!vList) {
      vList = [];
      chMap.set(chNum, vList);
    }
    const cleanText = cleanBollsHtml(row.text);
    const footnotes: NormalizedFootnote[] | undefined = row.comment
      ? [{ caller: "*", text: cleanBollsHtml(row.comment) }]
      : undefined;
    vList.push({
      verse: Number(row.verse) || vList.length + 1,
      text: cleanText,
      footnotes,
      redLetterRanges: detectHeuristicJesusSpeechRanges(bNum, chNum, cleanText),
    });
  }

  const books: NormalizedBook[] = [];
  for (let bNum = 1; bNum <= 66; bNum++) {
    const canon = getBookMeta(bNum);
    const chMap = bookMap.get(bNum);
    if (!chMap) continue;
    const sortedChNums = Array.from(chMap.keys()).sort((a, b) => a - b);
    const chapters: NormalizedChapter[] = sortedChNums.map((chNum) => ({
      chapter: chNum,
      verses: (chMap.get(chNum) || []).sort((a, b) => a.verse - b.verse),
    }));
    books.push({
      bookNumber: bNum,
      usfm: canon.usfm,
      name: canon.name,
      chapters,
    });
  }

  return {
    versionId: meta.id,
    shortName: meta.shortName,
    name: meta.name,
    language: meta.language,
    textDirection: meta.textDirection,
    downloadedAt: Date.now(),
    sizeBytes,
    books,
  };
}

interface HelloAoRawFootnote {
  noteId?: number;
  caller?: string | null;
  text?: string;
}

interface HelloAoRawContentPiece {
  text?: string;
  wordsOfJesus?: boolean;
  noteId?: number;
}

interface HelloAoRawChapterItem {
  type?: string;
  number?: number;
  text?: string;
  content?: Array<string | HelloAoRawContentPiece>;
  wordsOfJesus?: { start?: number; end?: number }[];
  footnotes?: HelloAoRawFootnote[];
}

interface HelloAoRawChapterWrapper {
  chapter?: {
    number?: number;
    content?: HelloAoRawChapterItem[];
    footnotes?: HelloAoRawFootnote[];
  };
  number?: number;
  content?: HelloAoRawChapterItem[];
  footnotes?: HelloAoRawFootnote[];
  thisChapterAudioLinks?: Record<string, string>;
  thisChapterAudioTimings?: Record<string, number[] | string>;
}

/**
 * Parses a HelloAO simplified or standard chapter object into `NormalizedChapter`
 */
function parseHelloAoChapter(
  rawChapterWrapper: HelloAoRawChapterWrapper,
  bookNumber: number
): NormalizedChapter {
  const chData = rawChapterWrapper.chapter || rawChapterWrapper;
  const chNum = Number(chData?.number) || 1;
  const headings: NormalizedHeading[] = [];
  const verses: NormalizedVerse[] = [];
  let pendingHeading: string | null = null;

  const contentArr = Array.isArray(chData?.content) ? chData.content : [];
  const chapterFootnotes: HelloAoRawFootnote[] = Array.isArray(chData?.footnotes)
    ? chData.footnotes
    : [];

  for (const item of contentArr) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "heading" || item.type === "hebrew_subtitle") {
      const hText =
        typeof item.text === "string"
          ? item.text
          : Array.isArray(item.content)
          ? item.content
              .map((p) => (typeof p === "string" ? p : p?.text || ""))
              .join(" ")
              .trim()
          : "";
      if (hText) {
        pendingHeading = pendingHeading ? `${pendingHeading} — ${hText}` : hText;
      }
    } else if (item.type === "verse") {
      const vNum = Number(item.number) || verses.length + 1;
      if (pendingHeading) {
        headings.push({ beforeVerse: vNum, text: pendingHeading });
        pendingHeading = null;
      }

      let verseText = "";
      const redRanges: { start: number; end: number }[] = [];
      const footnotes: NormalizedFootnote[] = [];

      if (typeof item.text === "string") {
        // Simplified format
        verseText = item.text.replace(/\s*\n\s*/g, " ").trim();
        if (Array.isArray(item.wordsOfJesus) && item.wordsOfJesus.length > 0) {
          // Since newline replacement can shift offsets by 1-2 chars, clamp safely
          for (const r of item.wordsOfJesus) {
            redRanges.push({
              start: Math.max(0, Math.min(verseText.length, r.start || 0)),
              end: Math.max(0, Math.min(verseText.length, r.end || verseText.length)),
            });
          }
        }
        if (Array.isArray(item.footnotes)) {
          for (const fn of item.footnotes) {
            if (fn?.text) {
              footnotes.push({
                caller: fn.caller && fn.caller !== "+" ? String(fn.caller) : "†",
                text: String(fn.text),
              });
            }
          }
        }
      } else if (Array.isArray(item.content)) {
        // Standard format
        const parts: string[] = [];
        for (const piece of item.content) {
          if (typeof piece === "string") {
            parts.push(piece);
          } else if (piece && typeof piece === "object") {
            if (typeof piece.text === "string") {
              const start = parts.join(" ").length + (parts.length > 0 ? 1 : 0);
              parts.push(piece.text);
              if (piece.wordsOfJesus) {
                const joined = parts.join(" ");
                redRanges.push({ start, end: joined.length });
              }
            } else if (typeof piece.noteId === "number") {
              const foundFn = chapterFootnotes.find((f) => f.noteId === piece.noteId);
              if (foundFn?.text) {
                footnotes.push({
                  caller: foundFn.caller && foundFn.caller !== "+" ? String(foundFn.caller) : "†",
                  text: String(foundFn.text),
                });
              }
            }
          }
        }
        verseText = parts.join(" ").replace(/\s+/g, " ").trim();
      }

      verses.push({
        verse: vNum,
        text: verseText,
        redLetterRanges:
          redRanges.length > 0
            ? redRanges
            : detectHeuristicJesusSpeechRanges(bookNumber, chNum, verseText),
        footnotes: footnotes.length > 0 ? footnotes : undefined,
      });
    }
  }

  return {
    chapter: chNum,
    headings: headings.length > 0 ? headings : undefined,
    verses,
    audioLinks: rawChapterWrapper.thisChapterAudioLinks || undefined,
    audioTimings:
      rawChapterWrapper.thisChapterAudioTimings &&
      typeof Object.values(rawChapterWrapper.thisChapterAudioTimings)[0] === "object"
        ? (rawChapterWrapper.thisChapterAudioTimings as Record<string, number[]>)
        : undefined,
  };
}

/**
 * Streams an HTTP response with real byte progress reporting
 */
async function fetchBytesWithProgress(
  url: string,
  expectedBytes: number,
  onProgress?: (pct: number, downloadedMB: number, totalMB?: number) => void
): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const contentLength = Number(res.headers.get("Content-Length")) || expectedBytes;
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.(92, buf.byteLength / (1024 * 1024), buf.byteLength / (1024 * 1024));
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      const pct = Math.min(
        90,
        Math.round((received / Math.max(received, contentLength)) * 88) + 4
      );
      onProgress?.(
        pct,
        Number((received / (1024 * 1024)).toFixed(2)),
        contentLength ? Number((contentLength / (1024 * 1024)).toFixed(2)) : undefined
      );
    }
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.byteLength;
  }
  return combined;
}

/**
 * Loads a complete NormalizedBible if installed (bundled or IndexedDB)
 */
export async function getInstalledFullBible(
  meta: BibleVersionMeta
): Promise<NormalizedBible | null> {
  const inMem = memoryBibleCache.get(meta.id);
  if (inMem) return inMem;

  if (meta.provider === "bundled") {
    const res = await fetch(`/bibles/${meta.providerSlug}.json`);
    if (!res.ok) throw new Error(`Failed to load bundled Bible ${meta.shortName}`);
    const rawText = (await res.text()).replace(/^\uFEFF/, "");
    const parsed = JSON.parse(rawText);
    const normalized = parseCdnArrayBible(parsed, meta, rawText.length);
    memoryBibleCache.set(meta.id, normalized);
    return normalized;
  }

  const stored = await getOfflineBible(meta.id);
  if (stored) {
    memoryBibleCache.set(meta.id, stored);
    return stored;
  }

  return null;
}

async function getBundledChapter(
  meta: BibleVersionMeta,
  bookNumber: number,
  chapter: number,
): Promise<NormalizedChapter | null> {
  const cacheKey = `${meta.id}:${bookNumber}:${chapter}`;
  const cached = memoryChapterCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`/bibles/chapters/${meta.providerSlug}/${bookNumber}/${chapter}.json`);
    if (!response.ok) return null;
    const rawBook = await response.json();
    const normalized = parseCdnArrayBible(
      [rawBook],
      meta,
      Number(response.headers.get("Content-Length")) || 0,
    );
    const chapterData = normalized.books.find((book) => book.bookNumber === bookNumber)?.chapters[0];
    if (!chapterData) return null;

    if (meta.id === "bundled:en_bsb") {
      const canon = getBookMeta(bookNumber);
      chapterData.audioLinks = {
        "Dan Hays (Studio)": `https://audio.bible.helloao.org/api/BSB/${canon.usfm}/${chapter}/audio/hays.mp3`,
        "Souer (Dramatic)": `https://audio.bible.helloao.org/api/BSB/${canon.usfm}/${chapter}/audio/souer.mp3`,
      };
    }

    memoryChapterCache.set(cacheKey, chapterData);
    return chapterData;
  } catch {
    // Fall back to the complete bundled file for old offline installs or unusual hosts.
    return null;
  }
}

/**
 * Downloads ANY version in full and persists it into the IndexedDB Offline Vault!
 */
export async function downloadVersionOffline(
  meta: BibleVersionMeta,
  onProgress?: (update: VersionDownloadProgress) => void
): Promise<NormalizedBible> {
  if (meta.provider === "external") {
    throw new Error("This copyrighted edition is available through its official online source only.");
  }

  if (meta.provider === "bundled") {
    const b = await getInstalledFullBible(meta);
    if (!b) throw new Error("Bundled Bible unavailable");
    onProgress?.({
      versionId: meta.id,
      progress: 100,
      downloadedMB: meta.estimatedSizeMB,
      totalMB: meta.estimatedSizeMB,
      phase: "done",
    });
    return b;
  }

  onProgress?.({
    versionId: meta.id,
    progress: 3,
    downloadedMB: 0,
    totalMB: meta.estimatedSizeMB,
    phase: "connecting",
  });

  const expectedBytes = Math.round((meta.estimatedSizeMB || 4.2) * 1024 * 1024);
  let normalized: NormalizedBible;

  if (meta.provider === "cdn") {
    const url = `https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/${meta.providerSlug}.json`;
    const bytes = await fetchBytesWithProgress(url, expectedBytes, (pct, mb, tot) => {
      onProgress?.({
        versionId: meta.id,
        progress: pct,
        downloadedMB: mb,
        totalMB: tot || meta.estimatedSizeMB,
        phase: "downloading",
      });
    });
    onProgress?.({
      versionId: meta.id,
      progress: 93,
      downloadedMB: Number((bytes.byteLength / (1024 * 1024)).toFixed(2)),
      phase: "indexing",
    });
    const text = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
    const raw = JSON.parse(text);
    normalized = parseCdnArrayBible(raw, meta, bytes.byteLength);
  } else if (meta.provider === "bolls") {
    let rawVerses: { book: number; chapter: number; verse: number; text: string; comment?: string }[] | null = null;
    let totalBytes = 0;

    try {
      const jsonUrl = `https://bolls.life/static/translations/${meta.providerSlug}.json`;
      const bytes = await fetchBytesWithProgress(jsonUrl, expectedBytes, (pct, mb, tot) => {
        onProgress?.({
          versionId: meta.id,
          progress: pct,
          downloadedMB: mb,
          totalMB: tot || meta.estimatedSizeMB,
          phase: "downloading",
        });
      });
      totalBytes = bytes.byteLength;
      const text = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
      rawVerses = JSON.parse(text);
    } catch {
      // Automatic fallback to Bolls .zip archive using fflate!
      const zipUrl = `https://bolls.life/static/translations/${meta.providerSlug}.zip`;
      const zipBytes = await fetchBytesWithProgress(zipUrl, expectedBytes * 0.4, (pct, mb, tot) => {
        onProgress?.({
          versionId: meta.id,
          progress: pct,
          downloadedMB: mb,
          totalMB: tot,
          phase: "downloading",
        });
      });
      const unzipped = unzipSync(zipBytes);
      const firstJsonKey = Object.keys(unzipped).find((k) => k.endsWith(".json")) || Object.keys(unzipped)[0];
      if (!firstJsonKey) throw new Error("Invalid Bolls archive format");
      const jsonU8 = unzipped[firstJsonKey];
      totalBytes = jsonU8.byteLength;
      const text = strFromU8(jsonU8).replace(/^\uFEFF/, "");
      rawVerses = JSON.parse(text);
    }

    onProgress?.({
      versionId: meta.id,
      progress: 93,
      downloadedMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
      phase: "indexing",
    });
    normalized = parseBollsFlatBible(rawVerses || [], meta, totalBytes);
  } else if (meta.provider === "helloao") {
    let rawComplete: {
      books?: {
        id?: string;
        order?: number;
        commonName?: string;
        name?: string;
        chapters?: HelloAoRawChapterWrapper[];
      }[];
    };
    let totalBytes = 0;
    try {
      const simpleUrl = `https://bible.helloao.org/api/${meta.providerSlug}/complete.simple.json`;
      const bytes = await fetchBytesWithProgress(simpleUrl, expectedBytes, (pct, mb, tot) => {
        onProgress?.({
          versionId: meta.id,
          progress: pct,
          downloadedMB: mb,
          totalMB: tot || meta.estimatedSizeMB,
          phase: "downloading",
        });
      });
      totalBytes = bytes.byteLength;
      rawComplete = JSON.parse(new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, ""));
    } catch {
      const stdUrl = `https://bible.helloao.org/api/${meta.providerSlug}/complete.json`;
      const bytes = await fetchBytesWithProgress(stdUrl, expectedBytes, (pct, mb, tot) => {
        onProgress?.({
          versionId: meta.id,
          progress: pct,
          downloadedMB: mb,
          totalMB: tot || meta.estimatedSizeMB,
          phase: "downloading",
        });
      });
      totalBytes = bytes.byteLength;
      rawComplete = JSON.parse(new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, ""));
    }

    onProgress?.({
      versionId: meta.id,
      progress: 94,
      downloadedMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
      phase: "indexing",
    });

    const books: NormalizedBook[] = [];
    for (const rawBook of rawComplete.books || []) {
      const canon = BOOK_BY_USFM.get(String(rawBook.id || "").toUpperCase()) || BOOK_BY_NUMBER.get(Number(rawBook.order));
      if (!canon || canon.bookNumber > 66) continue;
      const chapters: NormalizedChapter[] = (rawBook.chapters || []).map((chWrap) =>
        parseHelloAoChapter(chWrap, canon.bookNumber)
      );
      books.push({
        bookNumber: canon.bookNumber,
        usfm: canon.usfm,
        name: rawBook.commonName || rawBook.name || canon.name,
        chapters,
      });
    }
    books.sort((a, b) => a.bookNumber - b.bookNumber);
    normalized = {
      versionId: meta.id,
      shortName: meta.shortName,
      name: meta.name,
      language: meta.language,
      textDirection: meta.textDirection,
      downloadedAt: Date.now(),
      sizeBytes: totalBytes,
      books,
    };
  } else {
    throw new Error(`Unsupported provider for download: ${meta.provider}`);
  }

  onProgress?.({
    versionId: meta.id,
    progress: 97,
    downloadedMB: Number((normalized.sizeBytes / (1024 * 1024)).toFixed(2)),
    phase: "saving",
  });

  await saveOfflineBible(normalized);
  memoryBibleCache.set(meta.id, normalized);

  onProgress?.({
    versionId: meta.id,
    progress: 100,
    downloadedMB: Number((normalized.sizeBytes / (1024 * 1024)).toFixed(2)),
    phase: "done",
  });

  return normalized;
}

/**
 * Loads a single chapter—first checking Bundled / Offline Vault, then Chapter Cache,
 * then instant single-chapter streaming (or fast CDN fetch for cdn:*).
 */
export async function getChapterContent(
  meta: BibleVersionMeta,
  bookNumber: number,
  chapter: number,
  onAutoDownloadProgress?: (update: VersionDownloadProgress) => void
): Promise<{ chapterData: NormalizedChapter; isOfflineInstalled: boolean }> {
  const canon = getBookMeta(bookNumber);

  // Bundled Bible chapters are split into small static files so opening Read
  // never needs to download and parse the entire 4 MB translation first.
  if (meta.provider === "bundled") {
    const chapterData = await getBundledChapter(meta, bookNumber, chapter);
    if (chapterData) return { chapterData, isOfflineInstalled: true };
  }

  // 1. Check full offline Bible (bundled fallback or IndexedDB)
  const fullBible = await getInstalledFullBible(meta);
  if (fullBible) {
    const book =
      fullBible.books.find((b) => b.bookNumber === bookNumber) || fullBible.books[bookNumber - 1];
    const foundChapter =
      book?.chapters.find((c) => c.chapter === chapter) || book?.chapters[chapter - 1];
    if (foundChapter) {
      // Enrich bundled BSB with studio audio links when online if not yet populated!
      if (
        meta.id === "bundled:en_bsb" &&
        !foundChapter.audioLinks &&
        typeof navigator !== "undefined" &&
        navigator.onLine !== false
      ) {
        foundChapter.audioLinks = {
          "Dan Hays (Studio)": `https://audio.bible.helloao.org/api/BSB/${canon.usfm}/${chapter}/audio/hays.mp3`,
          "Souer (Dramatic)": `https://audio.bible.helloao.org/api/BSB/${canon.usfm}/${chapter}/audio/souer.mp3`,
        };
      }
      return { chapterData: foundChapter, isOfflineInstalled: true };
    }
  }

  // 2. Check per-chapter offline cache
  const cachedChapter = await getCachedStreamedChapter(meta.id, bookNumber, chapter);
  if (cachedChapter) {
    return { chapterData: cachedChapter, isOfflineInstalled: false };
  }

  // Copyrighted translations stay on their official publisher's reading site.
  if (meta.provider === "external") {
    throw new Error("Open this copyrighted edition from its official online source in the Versions Vault.");
  }

  // 3. Stream online!
  if (meta.provider === "helloao") {
    const url = `https://bible.helloao.org/api/${meta.providerSlug}/${canon.usfm}/${chapter}.simple.json`;
    const res = await fetch(url);
    if (!res.ok) {
      // Fallback to standard chapter endpoint
      const stdRes = await fetch(
        `https://bible.helloao.org/api/${meta.providerSlug}/${canon.usfm}/${chapter}.json`
      );
      if (!stdRes.ok) throw new Error(`Chapter unavailable in ${meta.shortName}`);
      const stdJson = await stdRes.json();
      const parsed = parseHelloAoChapter(stdJson, bookNumber);
      await cacheStreamedChapter(meta.id, bookNumber, chapter, parsed);
      return { chapterData: parsed, isOfflineInstalled: false };
    }
    const json = await res.json();
    const parsed = parseHelloAoChapter(json, bookNumber);
    await cacheStreamedChapter(meta.id, bookNumber, chapter, parsed);
    return { chapterData: parsed, isOfflineInstalled: false };
  }

  if (meta.provider === "bolls") {
    const url = `https://bolls.life/get-text/${meta.providerSlug}/${bookNumber}/${chapter}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unable to stream ${meta.shortName} from Bolls`);
    const rows: { verse: number; text: string; comment?: string }[] = await res.json();
    const parsed: NormalizedChapter = {
      chapter,
      verses: rows.map((r, i) => {
        const cleanText = cleanBollsHtml(r.text);
        return {
          verse: Number(r.verse) || i + 1,
          text: cleanText,
          footnotes: r.comment ? [{ caller: "*", text: cleanBollsHtml(r.comment) }] : undefined,
          redLetterRanges: detectHeuristicJesusSpeechRanges(bookNumber, chapter, cleanText),
        };
      }),
    };
    await cacheStreamedChapter(meta.id, bookNumber, chapter, parsed);
    return { chapterData: parsed, isOfflineInstalled: false };
  }

  if (meta.provider === "cdn") {
    // CDN versions are single ~4MB files on global jsDelivr edge — download & install automatically!
    const downloaded = await downloadVersionOffline(meta, onAutoDownloadProgress);
    const book = downloaded.books.find((b) => b.bookNumber === bookNumber);
    const ch = book?.chapters.find((c) => c.chapter === chapter);
    if (!ch) throw new Error(`Chapter not found in ${meta.shortName}`);
    return { chapterData: ch, isOfflineInstalled: true };
  }

  throw new Error(`Cannot load ${meta.shortName}`);
}

export function evictBibleFromMemory(versionId: string): void {
  memoryBibleCache.delete(versionId);
}

export interface BibleSearchResultItem {
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleSearchResponse {
  totalMatches: number;
  results: BibleSearchResultItem[];
  byBookCounts: { bookNumber: number; shortName: string; count: number }[];
  durationMs: number;
}

/**
 * Searches all 31,102+ verses of an installed Bible in <35ms!
 */
export async function searchInstalledBible(
  meta: BibleVersionMeta,
  query: string,
  options?: {
    scope?: "all" | "OT" | "NT";
    bookFilter?: number | null;
    limit?: number;
  }
): Promise<BibleSearchResponse> {
  const t0 = performance.now();
  const trimmed = query.trim();
  if (!trimmed) {
    return { totalMatches: 0, results: [], byBookCounts: [], durationMs: 0 };
  }

  const bible = await getInstalledFullBible(meta);
  if (!bible) {
    throw new Error("Download this version first to run instant full-Bible offline search.");
  }

  const limit = options?.limit || 150;
  const terms = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const isExactPhrase = trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2;
  const phraseClean = isExactPhrase ? trimmed.slice(1, -1).toLowerCase() : "";

  const results: BibleSearchResultItem[] = [];
  const byBookCounts: { bookNumber: number; shortName: string; count: number }[] = [];
  let totalMatches = 0;

  for (const book of bible.books) {
    const canon = getBookMeta(book.bookNumber);
    if (options?.scope === "OT" && canon.testament !== "OT") continue;
    if (options?.scope === "NT" && canon.testament !== "NT") continue;
    if (options?.bookFilter && book.bookNumber !== options.bookFilter) continue;

    let bookHits = 0;
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        const lower = v.text.toLowerCase();
        const matched = isExactPhrase
          ? lower.includes(phraseClean)
          : terms.every((t) => lower.includes(t));
        if (matched) {
          totalMatches++;
          bookHits++;
          if (results.length < limit) {
            results.push({
              bookNumber: book.bookNumber,
              bookName: canon.name,
              chapter: ch.chapter,
              verse: v.verse,
              text: v.text,
            });
          }
        }
      }
    }
    if (bookHits > 0) {
      byBookCounts.push({
        bookNumber: book.bookNumber,
        shortName: canon.shortName,
        count: bookHits,
      });
    }
  }

  return {
    totalMatches,
    results,
    byBookCounts,
    durationMs: Math.round(performance.now() - t0),
  };
}

/**
 * Exports a downloaded Bible to a portable `.json` file on the user's device
 */
export async function exportBibleJsonToDevice(meta: BibleVersionMeta): Promise<void> {
  const bible = await getInstalledFullBible(meta);
  if (!bible) throw new Error("Version is not installed locally.");
  const blob = new Blob([JSON.stringify(bible)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `selah-${meta.shortName.toLowerCase()}-offline-bible.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Imports a user-supplied `.json` Bible file into the Offline Vault!
 * Supports Selah NormalizedBible, thiagobodruk 66-book array, or Bolls flat verse array.
 */
export async function importCustomBibleJson(
  file: File
): Promise<{ meta: BibleVersionMeta; bible: NormalizedBible }> {
  const rawText = (await file.text()).replace(/^\uFEFF/, "");
  const parsed = JSON.parse(rawText);
  const baseName = file.name.replace(/\.json$/i, "").replace(/[-_]+/g, " ");

  if (parsed && parsed.books && Array.isArray(parsed.books) && parsed.versionId) {
    // Selah NormalizedBible export!
    const customId = parsed.versionId.startsWith("custom:")
      ? parsed.versionId
      : `custom:${Date.now()}`;
    const meta: BibleVersionMeta = {
      id: customId,
      shortName: parsed.shortName || "CUSTOM",
      name: parsed.name || baseName,
      language: parsed.language || "Custom",
      languageCode: "en",
      textDirection: parsed.textDirection || "ltr",
      provider: "custom",
      providerSlug: customId,
      estimatedSizeMB: Number((rawText.length / (1024 * 1024)).toFixed(1)),
      description: "Imported custom offline Bible JSON package.",
    };
    const bible: NormalizedBible = {
      ...parsed,
      versionId: customId,
      downloadedAt: Date.now(),
      sizeBytes: rawText.length,
    };
    await saveOfflineBible(bible);
    memoryBibleCache.set(customId, bible);
    return { meta, bible };
  }

  const customId = `custom:${Date.now()}`;
  const shortCode = baseName.slice(0, 6).toUpperCase();
  const meta: BibleVersionMeta = {
    id: customId,
    shortName: shortCode,
    name: `Imported: ${baseName}`,
    language: "Custom",
    languageCode: "en",
    textDirection: "ltr",
    provider: "custom",
    providerSlug: customId,
    estimatedSizeMB: Number((rawText.length / (1024 * 1024)).toFixed(1)),
    description: "User-imported offline Bible package.",
  };

  if (Array.isArray(parsed) && parsed[0]?.chapters) {
    const bible = parseCdnArrayBible(parsed, meta, rawText.length);
    await saveOfflineBible(bible);
    memoryBibleCache.set(customId, bible);
    return { meta, bible };
  }

  if (Array.isArray(parsed) && parsed[0]?.verse && parsed[0]?.text) {
    const bible = parseBollsFlatBible(parsed, meta, rawText.length);
    await saveOfflineBible(bible);
    memoryBibleCache.set(customId, bible);
    return { meta, bible };
  }

  throw new Error(
    "Unrecognized JSON Bible schema. Supported formats: Selah export JSON, 66-book chapters array, or verse objects array."
  );
}
