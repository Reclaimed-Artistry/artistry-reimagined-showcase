import React, { useMemo, useState } from "react";
import {
  Bookmark,
  Brain,
  Cloud,
  CheckCircle2,
  Eye,
  FileText,
  Highlighter,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CANONICAL_BOOKS, formatReference, getBookMeta } from "@/data/canonicalBooks";
import { TOPICAL_LIFE_GUIDES } from "@/data/scholarlyKnowledge";
import {
  BibleSearchResponse,
  searchInstalledBible,
} from "@/lib/bibleProviders";
import { useBibleApp } from "@/context/BibleAppContext";
import type { MemoryVerseCard } from "@/types/bible";
import { CloudWorkspacePanel } from "./CloudWorkspacePanel";

function buildClozeText(text: string, level: 0 | 1 | 2 | 3): string {
  if (level === 0) return text;
  const tokens = text.split(/(\s+)/);
  let wordCounter = 0;
  return tokens
    .map((tok) => {
      if (/^\s+$/.test(tok) || tok.length < 3) return tok;
      wordCounter++;
      const puncMatch = tok.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'-]+)([^a-zA-Z0-9]*)$/);
      if (!puncMatch) return tok;
      const [, pre, core, post] = puncMatch;
      if (level === 1 && wordCounter % 3 === 0) {
        return `${pre}${core[0]}${"_".repeat(Math.max(2, core.length - 1))}${post}`;
      }
      if (level === 2 && wordCounter % 2 === 0) {
        return `${pre}${"_".repeat(core.length)}${post}`;
      }
      if (level === 3) {
        return `${pre}${core[0]}${"_".repeat(Math.max(2, core.length - 1))}${post}`;
      }
      return tok;
    })
    .join("");
}

const MemoryPracticeDeck: React.FC = () => {
  const { memoryCards, recordMemoryPractice, deleteMemoryCard, navigateTo } = useBibleApp();
  const [activeCardId, setActiveCardId] = useState<string>(memoryCards[0]?.id || "");
  const [clozeStage, setClozeStage] = useState<0 | 1 | 2 | 3>(1);
  const [revealed, setRevealed] = useState(false);

  const activeCard: MemoryVerseCard | undefined =
    memoryCards.find((c) => c.id === activeCardId) || memoryCards[0];

  if (memoryCards.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
        Select any verse in the Bible Reader and tap <strong>Memorize</strong> to add it to your
        Scripture Memory Deck!
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-2 lg:col-span-5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Your Memory Deck ({memoryCards.length})
        </div>
        {memoryCards.map((c) => (
          <div
            key={c.id}
            onClick={() => {
              setActiveCardId(c.id);
              setRevealed(false);
            }}
            className={`cursor-pointer rounded-2xl border p-3.5 transition ${
              activeCard?.id === c.id
                ? "border-primary bg-primary/8"
                : "border-border/70 bg-card hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">{c.reference}</span>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  Mastery {c.masteryLevel}/4
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMemoryCard(c.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </div>

      {activeCard && (
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-primary">
                {activeCard.reference} ({activeCard.versionShortName})
              </span>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Progressive Cloze Trainer
              </h3>
            </div>

            <div className="flex gap-1 rounded-xl border border-border bg-background p-1 text-xs">
              {(
                [
                  { lv: 0, label: "Full" },
                  { lv: 1, label: "30% Hidden" },
                  { lv: 2, label: "50% Hidden" },
                  { lv: 3, label: "Initials Only" },
                ] as const
              ).map((st) => (
                <button
                  key={st.lv}
                  type="button"
                  onClick={() => {
                    setClozeStage(st.lv);
                    setRevealed(false);
                  }}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    clozeStage === st.lv
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-6 rounded-2xl border border-border/70 bg-background/80 p-6 font-scripture text-xl leading-relaxed text-foreground">
            {revealed ? activeCard.text : buildClozeText(activeCard.text, clozeStage)}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent"
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                {revealed ? "Hide Hints Again" : "Peek Full Verse"}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateTo(activeCard.bookNumber, activeCard.chapter, activeCard.verse)
                }
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                Open Chapter →
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                recordMemoryPractice(activeCard.id, true);
                setRevealed(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
            >
              <CheckCircle2 className="h-4 w-4" />I Recited It Well (+Mastery)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchAndStudyView: React.FC = () => {
  const {
    activeVersion,
    isVersionOffline,
    triggerDownloadVersion,
    navigateTo,
    highlights,
    bookmarks,
    removeBookmark,
    notes,
    deleteNote,
    readChapters,
  } = useBibleApp();

  const [subTab, setSubTab] = useState<"search" | "notebook" | "memory" | "progress" | "cloud">(
    new URLSearchParams(window.location.search).get("group") ? "cloud" : "search"
  );
  const [notebookQuery, setNotebookQuery] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "OT" | "NT">("all");
  const [bookFilter, setBookFilter] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<BibleSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isOfflineReady = isVersionOffline(activeVersion.id);

  const runSearch = async (customQuery?: string, customScope = scope, customBook = bookFilter) => {
    const q = (customQuery !== undefined ? customQuery : query).trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchInstalledBible(activeVersion, q, {
        scope: customScope,
        bookFilter: customBook,
        limit: 120,
      });
      setSearchResult(res);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const highlightEntries = useMemo(
    () => Object.values(highlights).sort((a, b) => b.updatedAt - a.updatedAt),
    [highlights]
  );
  const notebookNeedle = notebookQuery.trim().toLowerCase();
  const filteredNotes = useMemo(() => notes.filter((note) =>
    !notebookNeedle || `${formatReference(note.bookNumber, note.chapter, note.verse, note.verseEnd)} ${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase().includes(notebookNeedle)
  ), [notes, notebookNeedle]);
  const filteredBookmarks = useMemo(() => bookmarks.filter((bookmark) =>
    !notebookNeedle || `${formatReference(bookmark.bookNumber, bookmark.chapter, bookmark.verse)} ${bookmark.textSnippet} ${bookmark.label || ""}`.toLowerCase().includes(notebookNeedle)
  ), [bookmarks, notebookNeedle]);
  const filteredHighlights = useMemo(() => highlightEntries.filter((highlight) =>
    !notebookNeedle || formatReference(highlight.bookNumber, highlight.chapter, highlight.verse).toLowerCase().includes(notebookNeedle)
  ), [highlightEntries, notebookNeedle]);

  const readSet = useMemo(() => new Set(readChapters), [readChapters]);
  const totalBibleChapters = 1189;
  const overallPct = ((readChapters.length / totalBibleChapters) * 100).toFixed(1);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8">
      {/* Header & Sub-Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Concordance, Notebook &amp; Memory
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Instant full-Bible offline search across 31,102 verses, personal annotations,
            memorization flashcards, and 66-book completion progress.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          {(
            [
              { id: "search", label: "Full-Bible Search", icon: <Search className="h-3.5 w-3.5" /> },
              {
                id: "notebook",
                label: `Study Notebook (${
                  highlightEntries.length + bookmarks.length + notes.length
                })`,
                icon: <Highlighter className="h-3.5 w-3.5" />,
              },
              { id: "memory", label: "Memory Deck", icon: <Brain className="h-3.5 w-3.5" /> },
              {
                id: "progress",
                label: `66-Book Progress (${overallPct}%)`,
                icon: <Sparkles className="h-3.5 w-3.5" />,
              },
              {
                id: "cloud",
                label: "Sync & Groups",
                icon: <Cloud className="h-3.5 w-3.5" />,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                subTab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: FULL-BIBLE SEARCH & CONCORDANCE */}
      {subTab === "search" && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm"
          >
            {!isOfflineReady && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs">
                <span>
                  Download <strong>{activeVersion.name}</strong> to run instant offline
                  full-Bible concordance search across all 66 books.
                </span>
                <button
                  type="button"
                  onClick={() => triggerDownloadVersion(activeVersion)}
                  className="rounded-xl bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                >
                  Download {activeVersion.shortName} Now
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search all 31,102 verses of ${activeVersion.shortName} (use quotes for exact phrase, e.g. "still waters" or grace peace)...`}
                  className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="rounded-2xl bg-primary px-6 py-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-40"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search Bible"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                {(["all", "OT", "NT"] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => {
                      setScope(sc);
                      setBookFilter(null);
                      if (query.trim()) runSearch(query, sc, null);
                    }}
                    className={`rounded-lg px-2.5 py-1 font-semibold ${
                      scope === sc && !bookFilter
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sc === "all"
                      ? "Entire Bible"
                      : sc === "OT"
                      ? "Old Testament"
                      : "New Testament"}
                  </button>
                ))}
                {bookFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setBookFilter(null);
                      runSearch(query, scope, null);
                    }}
                    className="rounded-lg bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                  >
                    Book: {getBookMeta(bookFilter).name} ×
                  </button>
                )}
              </div>

              {/* Quick Seed Searches */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">Try:</span>
                {['"steadfast love"', '"fear not"', "shepherd", "grace faith", "peace heart"].map(
                  (sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setQuery(sample);
                        runSearch(sample);
                      }}
                      className="rounded-lg border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary hover:text-primary"
                    >
                      {sample}
                    </button>
                  )
                )}
              </div>
            </div>
          </form>

          {searchError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
              {searchError}
            </div>
          )}

          {searchResult ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Found <strong>{searchResult.totalMatches.toLocaleString()}</strong> occurrences across{" "}
                  <strong>{searchResult.byBookCounts.length}</strong> books in{" "}
                  <strong className="font-mono text-primary">{searchResult.durationMs}ms</strong>
                </span>
              </div>

              {/* Concordance Book Distribution Pills */}
              {searchResult.byBookCounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/70 bg-card p-3.5">
                  {searchResult.byBookCounts.map((b) => (
                    <button
                      key={b.bookNumber}
                      type="button"
                      onClick={() => {
                        setBookFilter(b.bookNumber);
                        runSearch(query, "all", b.bookNumber);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                        bookFilter === b.bookNumber
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <span>{b.shortName}</span>
                      <span className="font-mono text-[10px] opacity-75">({b.count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Matching Verses */}
              <div className="space-y-2.5">
                {searchResult.results.map((r, idx) => (
                  <div
                    key={`${r.bookNumber}-${r.chapter}-${r.verse}-${idx}`}
                    onClick={() => navigateTo(r.bookNumber, r.chapter, r.verse)}
                    className="cursor-pointer rounded-2xl border border-border/75 bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        {r.bookName} {r.chapter}:{r.verse}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Open in Reader →
                      </span>
                    </div>
                    <p className="mt-1.5 font-scripture text-sm leading-relaxed text-foreground">
                      {r.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Curated Life Topics Explorer when search is idle */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOPICAL_LIFE_GUIDES.map((topic) => (
                <div
                  key={topic.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
                >
                  <div className="text-2xl">{topic.emoji}</div>
                  <h3 className="mt-2 font-display text-xl font-bold text-foreground">
                    {topic.label}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{topic.summary}</p>
                  <div className="mt-3 space-y-1.5">
                    {topic.passages.slice(0, 3).map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuery(p.ref.split(" ")[0]);
                          const [bName, chPart] = p.ref.split(/\s+(?=\d)/);
                          const foundB = CANONICAL_BOOKS.find((b) =>
                            b.name.toLowerCase().startsWith(bName.toLowerCase())
                          );
                          if (foundB && chPart) {
                            const [chS, vS] = chPart.split(":");
                            navigateTo(
                              foundB.bookNumber,
                              parseInt(chS, 10) || 1,
                              vS ? parseInt(vS, 10) : undefined
                            );
                          }
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-left text-xs hover:border-primary/40"
                      >
                        <span className="font-semibold text-primary">{p.ref}</span>
                        <span className="truncate pl-2 text-[11px] text-muted-foreground">
                          {p.note}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDY NOTEBOOK (NOTES, BOOKMARKS, HIGHLIGHTS) */}
      {subTab === "notebook" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="relative lg:col-span-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={notebookQuery}
              onChange={(event) => setNotebookQuery(event.target.value)}
              placeholder="Search notes, tags, bookmarks, highlights, or references..."
              className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
              aria-label="Search your study journal"
            />
          </div>
          {/* Study Notes */}
          <div className="space-y-3 rounded-3xl border border-border/80 bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold">
              <FileText className="h-4 w-4 text-primary" />
              Study Notes ({filteredNotes.length})
            </h3>
            {filteredNotes.length === 0 ? (
              <p className="py-6 text-xs text-muted-foreground">
                {notes.length === 0
                  ? <>Tap any verse in the Reader and click <strong>Note</strong> to add personal commentary.</>
                  : "No study notes match this search."}
              </p>
            ) : (
              filteredNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-3.5 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <button
                      type="button"
                      onClick={() => navigateTo(n.bookNumber, n.chapter, n.verse)}
                      className="font-semibold text-primary hover:underline"
                    >
                      {formatReference(n.bookNumber, n.chapter, n.verse, n.verseEnd)} —{" "}
                      {n.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-foreground/90">{n.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Bookmarks */}
          <div className="space-y-3 rounded-3xl border border-border/80 bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold">
              <Bookmark className="h-4 w-4 text-primary" />
              Bookmarks ({filteredBookmarks.length})
            </h3>
            {filteredBookmarks.length === 0 ? (
              <p className="py-6 text-xs text-muted-foreground">
                {bookmarks.length === 0 ? "Your bookmarked verses will appear here for instant recall." : "No bookmarks match this search."}
              </p>
            ) : (
              filteredBookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigateTo(bm.bookNumber, bm.chapter, bm.verse)}
                      className="font-mono font-bold text-primary hover:underline"
                    >
                      {formatReference(bm.bookNumber, bm.chapter, bm.verse)} (
                      {bm.versionShortName})
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBookmark(bm.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-3 font-scripture italic text-muted-foreground">
                    “{bm.textSnippet}”
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Highlights */}
          <div className="space-y-3 rounded-3xl border border-border/80 bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold">
              <Highlighter className="h-4 w-4 text-primary" />
              Highlights ({filteredHighlights.length})
            </h3>
            {filteredHighlights.length === 0 ? (
              <p className="py-6 text-xs text-muted-foreground">
                {highlightEntries.length === 0 ? "Tap any verse and choose from 6 watercolor highlight tones." : "No highlights match this search."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredHighlights.map((hl) => (
                  <button
                    key={hl.key}
                    type="button"
                    onClick={() => navigateTo(hl.bookNumber, hl.chapter, hl.verse)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold hl-${hl.color}`}
                  >
                    {formatReference(hl.bookNumber, hl.chapter, hl.verse)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SCRIPTURE MEMORY TRAINER */}
      {subTab === "memory" && <MemoryPracticeDeck />}

      {/* TAB 4: 66-BOOK COMPLETION MOSAIC */}
      {subTab === "progress" && (
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-2xl font-bold">
                66-Book Reading Completion Mosaic
              </h3>
              <p className="text-xs text-muted-foreground">
                {readChapters.length} of 1,189 canonical chapters marked read ({overallPct}%)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {CANONICAL_BOOKS.map((b) => {
              let done = 0;
              for (let c = 1; c <= b.chapters; c++) {
                if (readSet.has(`${b.bookNumber}:${c}`)) done++;
              }
              const pct = Math.round((done / b.chapters) * 100);
              return (
                <button
                  key={b.bookNumber}
                  type="button"
                  onClick={() => navigateTo(b.bookNumber, 1)}
                  className="flex flex-col justify-between rounded-2xl border border-border/75 bg-background/70 p-3 text-left transition hover:border-primary/50"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">{b.shortName}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {done}/{b.chapters}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-emerald-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: CLOUD BACKUP AND SHARED READING GROUPS */}
      {subTab === "cloud" && <CloudWorkspacePanel />}
    </div>
  );
};
