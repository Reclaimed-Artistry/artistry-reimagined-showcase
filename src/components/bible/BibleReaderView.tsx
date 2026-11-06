import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Columns3,
  Copy,
  Download,
  Eraser,
  Globe,
  HardDriveDownload,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatReference, getBookMeta } from "@/data/canonicalBooks";
import { formatPassageRangeLabel } from "@/data/readingPlans";
import { useBibleApp } from "@/context/BibleAppContext";
import { BookChapterSelector } from "./BookChapterSelector";
import { TypographyPopover } from "./TypographyPopover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  BibleVersionMeta,
  HighlightColor,
  NormalizedChapter,
  NormalizedVerse,
} from "@/types/bible";

const HIGHLIGHT_SWATCHES: { color: HighlightColor; label: string; dotClass: string }[] = [
  { color: "amber", label: "Gold", dotClass: "bg-amber-400" },
  { color: "sage", label: "Sage", dotClass: "bg-emerald-400" },
  { color: "sky", label: "Sky", dotClass: "bg-sky-400" },
  { color: "rose", label: "Rose", dotClass: "bg-rose-400" },
  { color: "lavender", label: "Lavender", dotClass: "bg-violet-400" },
  { color: "terracotta", label: "Terracotta", dotClass: "bg-orange-400" },
];

function renderVerseTextWithRedLetter(
  verse: NormalizedVerse,
  enableRedLetter: boolean
): React.ReactNode {
  if (!enableRedLetter || !verse.redLetterRanges || verse.redLetterRanges.length === 0) {
    return verse.text;
  }
  const sorted = [...verse.redLetterRanges].sort((a, b) => a.start - b.start);
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((range, idx) => {
    const start = Math.max(cursor, Math.min(verse.text.length, range.start));
    const end = Math.max(start, Math.min(verse.text.length, range.end));
    if (start > cursor) {
      segments.push(
        <React.Fragment key={`n-${idx}`}>{verse.text.slice(cursor, start)}</React.Fragment>
      );
    }
    if (end > start) {
      segments.push(
        <span key={`r-${idx}`} className="words-of-jesus">
          {verse.text.slice(start, end)}
        </span>
      );
    }
    cursor = end;
  });

  if (cursor < verse.text.length) {
    segments.push(<React.Fragment key="tail">{verse.text.slice(cursor)}</React.Fragment>);
  }
  return segments;
}

const VersionQuickPicker: React.FC<{
  valueId: string;
  onChange: (id: string) => void;
  compact?: boolean;
}> = ({ valueId, onChange, compact }) => {
  const { catalog, isVersionOffline, setActiveSection } = useBibleApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const current = catalog.find((v) => v.id === valueId) || catalog[0];

  const { offlineList, featuredOnline } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matches = catalog.filter(
      (v) =>
        !q ||
        v.shortName.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q)
    );
    const off = matches.filter((v) => isVersionOffline(v.id));
    const onl = matches.filter((v) => !isVersionOffline(v.id)).slice(0, 35);
    return { offlineList: off, featuredOnline: onl };
  }, [catalog, isVersionOffline, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/50 ${
            compact ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-xs"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isVersionOffline(current.id) ? "bg-emerald-500" : "bg-amber-500"
            }`}
            title={isVersionOffline(current.id) ? "Available Offline" : "Streaming Online"}
          />
          <span className="font-mono font-bold">{current.shortName}</span>
          {!compact && (
            <span className="hidden max-w-[140px] truncate text-muted-foreground md:inline">
              • {current.name}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border p-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick switch version (KJV, NIV, ESV, Yoruba...)"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {offlineList.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Ready Offline ({offlineList.length})
              </div>
              {offlineList.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    v.id === valueId ? "bg-primary/15 font-semibold" : "hover:bg-accent"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary">{v.shortName}</span>
                      <span className="truncate">{v.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{v.language}</div>
                  </div>
                  {v.id === valueId && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Online Stream &amp; Downloadable
            </div>
            {featuredOnline.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChange(v.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  v.id === valueId ? "bg-primary/15 font-semibold" : "hover:bg-accent"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold">{v.shortName}</span>
                    <span className="truncate">{v.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{v.language}</div>
                </div>
                <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-border bg-muted/40 p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setActiveSection("versions");
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
          >
            <HardDriveDownload className="h-3.5 w-3.5" />
            Browse &amp; Download All {catalog.length.toLocaleString()}+ Versions
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const BibleReaderView: React.FC = () => {
  const {
    bookNumber,
    chapter,
    selectedVerses,
    focusedVerse,
    toggleVerseSelection,
    clearSelectedVerses,
    nextChapter,
    prevChapter,
    navigateTo,
    catalog,
    activeVersion,
    setActiveVersionId,
    primaryChapterData,
    primaryLoading,
    primaryError,
    isPrimaryOfflineInstalled,
    parallelChapterData,
    thirdChapterData,
    reloadChapters,
    prefs,
    updatePrefs,
    downloadTasks,
    triggerDownloadVersion,
    highlights,
    setVerseHighlight,
    bookmarks,
    toggleBookmark,
    notes,
    saveNote,
    readChapters,
    markChapterRead,
    allPlans,
    enrollments,
    togglePlanDayComplete,
    activePlanSession,
    setActivePlanSession,
    addMemoryCard,
    setAiPanelOpen,
    startAudioFromVerse,
    activeAudioVerse,
    setCompareDrawerOpen,
    setVerseArtModalOpen,
  } = useBibleApp();

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState("reflection");

  const verseRefs = useRef<Record<number, HTMLElement | null>>({});
  const bookMeta = getBookMeta(bookNumber);
  const isChapterMarkedRead = readChapters.includes(`${bookNumber}:${chapter}`);

  const fontClass =
    prefs.fontFamily === "scripture"
      ? "font-scripture"
      : prefs.fontFamily === "display"
      ? "font-display"
      : prefs.fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  // Smooth scroll to focused verse or active audio verse
  useEffect(() => {
    const target = activeAudioVerse || focusedVerse;
    if (!target) return;
    const el = verseRefs.current[target];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeAudioVerse, focusedVerse, primaryChapterData]);

  // Active plan context if launched from Reading Plans
  const activePlanDetails = useMemo(() => {
    if (!activePlanSession) return null;
    const plan = allPlans.find((p) => p.id === activePlanSession.planId);
    if (!plan) return null;
    const dayObj = plan.days.find((d) => d.day === activePlanSession.day);
    const enrollment = enrollments.find((e) => e.planId === plan.id);
    const isDayDone = enrollment?.completedDays.includes(activePlanSession.day) || false;
    return { plan, dayObj, isDayDone };
  }, [activePlanSession, allPlans, enrollments]);

  const chapterNotesMap = useMemo(() => {
    const map = new Map<number, typeof notes>();
    for (const n of notes) {
      if (n.bookNumber === bookNumber && n.chapter === chapter) {
        const list = map.get(n.verse) || [];
        list.push(n);
        map.set(n.verse, list);
      }
    }
    return map;
  }, [notes, bookNumber, chapter]);

  const chapterBookmarkSet = useMemo(() => {
    const s = new Set<number>();
    for (const b of bookmarks) {
      if (b.bookNumber === bookNumber && b.chapter === chapter) {
        s.add(b.verse);
      }
    }
    return s;
  }, [bookmarks, bookNumber, chapter]);

  const selectedVersesText = useMemo(() => {
    if (!primaryChapterData || selectedVerses.length === 0) return "";
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    return primaryChapterData.verses
      .filter((v) => sorted.includes(v.verse))
      .map((v) => v.text)
      .join(" ");
  }, [primaryChapterData, selectedVerses]);

  const activeDownloadTask = downloadTasks[activeVersion.id];

  const parallelColumnsCount = prefs.thirdVersionId
    ? 3
    : prefs.parallelVersionId
    ? 2
    : 1;

  const toggleSplitColumns = () => {
    if (!prefs.parallelVersionId) {
      const fallbackSecond =
        activeVersion.id === "bundled:en_bsb" ? "bundled:en_kjv" : "bundled:en_bsb";
      updatePrefs({ parallelVersionId: fallbackSecond, thirdVersionId: null });
    } else if (!prefs.thirdVersionId) {
      const fallbackThird =
        catalog.find(
          (v) => v.id !== activeVersion.id && v.id !== prefs.parallelVersionId && v.featured
        )?.id || "cdn:en_web";
      updatePrefs({ thirdVersionId: fallbackThird });
    } else {
      updatePrefs({ parallelVersionId: null, thirdVersionId: null });
    }
  };

  const handleCopySelected = () => {
    if (!primaryChapterData || selectedVerses.length === 0) return;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const ref = formatReference(
      bookNumber,
      chapter,
      sorted[0],
      sorted.length > 1 ? sorted[sorted.length - 1] : undefined
    );
    const body = `${selectedVersesText} — ${ref} (${activeVersion.shortName})`;
    navigator.clipboard.writeText(body);
    toast.success(`Copied ${ref} (${activeVersion.shortName})`);
  };

  const handleOpenNoteDialog = () => {
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const ref = formatReference(
      bookNumber,
      chapter,
      sorted[0] || 1,
      sorted.length > 1 ? sorted[sorted.length - 1] : undefined
    );
    setNoteTitle(`Notes on ${ref}`);
    setNoteContent("");
    setNoteTags("study, reflection");
    setNoteModalOpen(true);
  };

  const handleSaveNewNote = () => {
    if (!noteContent.trim()) return;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    saveNote({
      bookNumber,
      chapter,
      verse: sorted[0] || 1,
      verseEnd: sorted.length > 1 ? sorted[sorted.length - 1] : undefined,
      title: noteTitle.trim() || `${bookMeta.name} ${chapter}:${sorted[0] || 1}`,
      content: noteContent.trim(),
      tags: noteTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setNoteModalOpen(false);
    clearSelectedVerses();
  };

  const renderSingleChapterColumn = (
    chData: NormalizedChapter | null,
    colMeta: BibleVersionMeta,
    isPrimary: boolean
  ) => {
    if (!chData) {
      return (
        <div className="space-y-3 py-8">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      );
    }

    const headingByVerse = new Map<number, string>();
    if (prefs.showHeadings && chData.headings) {
      for (const h of chData.headings) {
        headingByVerse.set(h.beforeVerse, h.text);
      }
    }

    if (prefs.layoutMode === "paragraph" && parallelColumnsCount === 1) {
      return (
        <div
          dir={colMeta.textDirection}
          className={`${fontClass} text-foreground transition-all`}
          style={{ fontSize: `${prefs.fontSize}px`, lineHeight: prefs.lineHeight }}
        >
          <p className="leading-relaxed">
            {chData.verses.map((v) => {
              const heading = headingByVerse.get(v.verse);
              const hl = highlights[`${bookNumber}:${chapter}:${v.verse}`];
              const isSelected = selectedVerses.includes(v.verse);
              const isAudioActive = activeAudioVerse === v.verse;
              const isBookmarked = chapterBookmarkSet.has(v.verse);

              return (
                <React.Fragment key={v.verse}>
                  {heading && (
                    <span className="mb-2 mt-6 block font-display text-xl font-bold tracking-tight text-foreground/90">
                      {heading}
                    </span>
                  )}
                  <span
                    ref={(el) => {
                      if (isPrimary) verseRefs.current[v.verse] = el;
                    }}
                    onClick={() => toggleVerseSelection(v.verse)}
                    className={`cursor-pointer rounded px-1 py-0.5 transition ${
                      hl ? `hl-${hl.color}` : ""
                    } ${
                      isSelected
                        ? "bg-primary/15 underline decoration-primary/60 decoration-dashed underline-offset-4"
                        : "hover:bg-accent/50"
                    } ${
                      isAudioActive
                        ? "ring-2 ring-amber-500/70 bg-amber-500/15"
                        : ""
                    }`}
                  >
                    <sup className="mr-1 select-none font-sans text-[11px] font-bold text-primary/80">
                      {v.verse}
                      {isBookmarked ? "★" : ""}
                    </sup>
                    {renderVerseTextWithRedLetter(v, prefs.redLetter)}{" "}
                  </span>
                </React.Fragment>
              );
            })}
          </p>
        </div>
      );
    }

    return (
      <div
        dir={colMeta.textDirection}
        className="space-y-2.5"
      >
        {chData.verses.map((v) => {
          const heading = headingByVerse.get(v.verse);
          const hl = highlights[`${bookNumber}:${chapter}:${v.verse}`];
          const isSelected = selectedVerses.includes(v.verse);
          const isAudioActive = activeAudioVerse === v.verse;
          const isBookmarked = chapterBookmarkSet.has(v.verse);
          const verseNotes = isPrimary ? chapterNotesMap.get(v.verse) : undefined;

          return (
            <div
              key={v.verse}
              ref={(el) => {
                if (isPrimary) verseRefs.current[v.verse] = el;
              }}
            >
              {heading && (
                <h3 className="mb-2 mt-5 font-display text-xl font-semibold tracking-tight text-foreground/90 first:mt-0">
                  {heading}
                </h3>
              )}

              <div
                onClick={() => toggleVerseSelection(v.verse)}
                className={`group relative cursor-pointer rounded-xl px-3 py-1.5 transition ${
                  hl ? `hl-${hl.color}` : ""
                } ${
                  isSelected
                    ? "bg-primary/15 ring-1 ring-primary/50"
                    : "hover:bg-accent/45"
                } ${
                  isAudioActive
                    ? "bg-amber-500/15 ring-2 ring-amber-500/70 shadow-sm"
                    : ""
                }`}
              >
                <p
                  className={`${fontClass} text-foreground`}
                  style={{ fontSize: `${prefs.fontSize}px`, lineHeight: prefs.lineHeight }}
                >
                  <span className="mr-2 inline-flex select-none items-center gap-0.5 align-baseline font-sans text-xs font-bold text-primary/80">
                    {v.verse}
                    {isBookmarked && (
                      <Bookmark className="inline h-3 w-3 fill-primary text-primary" />
                    )}
                  </span>
                  {renderVerseTextWithRedLetter(v, prefs.redLetter)}

                  {prefs.showFootnotes && v.footnotes && v.footnotes.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-1.5 inline-flex h-4 items-center rounded bg-secondary px-1 font-sans text-[10px] font-semibold text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                          title="View translator footnote"
                        >
                          {v.footnotes[0].caller || "†"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs leading-relaxed">
                        <div className="mb-1 font-semibold text-primary">
                          Footnote • {bookMeta.shortName} {chapter}:{v.verse}
                        </div>
                        {v.footnotes.map((fn, idx) => (
                          <p key={idx} className="text-muted-foreground">
                            {fn.text}
                          </p>
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                </p>

                {verseNotes && verseNotes.length > 0 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 space-y-1.5 rounded-lg border border-primary/25 bg-card/90 p-2.5 text-xs"
                  >
                    {verseNotes.map((n) => (
                      <div key={n.id}>
                        <div className="font-semibold text-primary">{n.title}</div>
                        <p className="text-muted-foreground">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const secondMeta = prefs.parallelVersionId
    ? catalog.find((c) => c.id === prefs.parallelVersionId) || null
    : null;
  const thirdMeta = prefs.thirdVersionId
    ? catalog.find((c) => c.id === prefs.thirdVersionId) || null
    : null;

  return (
    <div className="relative flex min-h-full flex-col">
      {/* Sticky Reader Control Bar */}
      <div className="sticky top-0 z-20 border-b border-border/75 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={prevChapter}
              disabled={bookNumber === 1 && chapter === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground transition hover:bg-accent disabled:opacity-40"
              title="Previous Chapter"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <BookChapterSelector />

            <button
              type="button"
              onClick={nextChapter}
              disabled={bookNumber === 66 && chapter === 22}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground transition hover:bg-accent disabled:opacity-40"
              title="Next Chapter"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <VersionQuickPicker
              valueId={activeVersion.id}
              onChange={(id) => setActiveVersionId(id)}
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleSplitColumns}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                parallelColumnsCount > 1
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/80 bg-card text-foreground hover:border-primary/40 hover:bg-accent/50"
              }`}
              title="Compare Multiple Versions Side-by-Side"
            >
              {parallelColumnsCount === 3 ? (
                <Columns3 className="h-3.5 w-3.5" />
              ) : (
                <Columns2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {parallelColumnsCount === 1
                  ? "Parallel"
                  : `${parallelColumnsCount} Versions`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => startAudioFromVerse(selectedVerses[0] || 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/50"
              title="Listen & Read Along (AI Voice or Studio Audio)"
            >
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Listen</span>
            </button>

            <button
              type="button"
              onClick={() => setAiPanelOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-primary/20"
              title="Open Embedded AI Bible Reading Companion"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="hidden md:inline">AI Guide</span>
            </button>

            <TypographyPopover />
          </div>
        </div>
      </div>

      {/* Active Reading Plan Banner if launched from Plan */}
      {activePlanDetails && activePlanDetails.dayObj && (
        <div className="border-b border-primary/20 bg-primary/8 px-4 py-2.5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">
                {activePlanDetails.plan.title} • Day {activePlanDetails.dayObj.day}
              </span>
              <span className="text-muted-foreground">Today&apos;s Passages:</span>
              {activePlanDetails.dayObj.passages.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigateTo(p.bookNumber, p.startChapter)}
                  className={`rounded-md border px-2 py-0.5 font-medium transition ${
                    p.bookNumber === bookNumber &&
                    chapter >= p.startChapter &&
                    chapter <= p.endChapter
                      ? "border-primary bg-card text-foreground"
                      : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {formatPassageRangeLabel(p)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  togglePlanDayComplete(
                    activePlanDetails.plan.id,
                    activePlanDetails.dayObj!.day
                  );
                  markChapterRead();
                  toast.success(`Completed Day ${activePlanDetails.dayObj!.day}!`);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                  activePlanDetails.isDayDone
                    ? "bg-emerald-600 text-white"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {activePlanDetails.isDayDone ? "Day Completed" : "Mark Day Complete"}
              </button>
              <button
                type="button"
                onClick={() => setActivePlanSession(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title="Exit Plan Mode"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streaming Online -> Download Full Version Banner */}
      {!isPrimaryOfflineInstalled && (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                Currently streaming <strong>{activeVersion.name}</strong> online. Download it once (~
                {activeVersion.estimatedSizeMB} MB) to read anytime offline!
              </span>
            </div>
            {activeDownloadTask &&
            activeDownloadTask.phase !== "done" &&
            activeDownloadTask.phase !== "error" ? (
              <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Downloading {activeDownloadTask.progress}% ({activeDownloadTask.downloadedMB} MB)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => triggerDownloadVersion(activeVersion)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 font-semibold text-primary-foreground transition hover:opacity-95"
              >
                <Download className="h-3.5 w-3.5" />
                Save Offline
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Scripture Reading Canvas */}
      <div
        className={`mx-auto w-full flex-1 px-4 pb-32 pt-8 sm:px-8 ${
          parallelColumnsCount === 1
            ? "max-w-3xl"
            : parallelColumnsCount === 2
            ? "max-w-6xl"
            : "max-w-7xl"
        }`}
      >
        {/* Editorial Chapter Header */}
        <header className="mb-8 border-b border-border/70 pb-6 text-center">
          <div className="mb-1.5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span>{bookMeta.testament === "OT" ? "Old Testament" : "New Testament"}</span>
            <span>•</span>
            <span>{bookMeta.category}</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {bookMeta.name}{" "}
            <span className="text-primary">{chapter}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground sm:text-sm">
            {bookMeta.theme}
          </p>
        </header>

        {primaryLoading ? (
          <div className="space-y-4 py-12">
            {activeDownloadTask && activeDownloadTask.phase === "downloading" && (
              <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/8 p-4 text-center text-xs">
                <div className="mb-2 flex items-center justify-center gap-2 font-semibold text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading &amp; indexing {activeVersion.name} for permanent offline use (
                  {activeDownloadTask.progress}%)...
                </div>
                <div className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${activeDownloadTask.progress}%` }}
                  />
                </div>
              </div>
            )}
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : primaryError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">{primaryError}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can switch to any Offline Vault Bible (like BSB or KJV) or retry connecting.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={reloadChapters}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setActiveVersionId("bundled:en_bsb")}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold"
              >
                Switch to Offline BSB
              </button>
            </div>
          </div>
        ) : parallelColumnsCount === 1 ? (
          renderSingleChapterColumn(primaryChapterData, activeVersion, true)
        ) : (
          <div
            className={`grid gap-6 ${
              parallelColumnsCount === 2 ? "md:grid-cols-2" : "lg:grid-cols-3"
            }`}
          >
            {/* Primary Column */}
            <div className="rounded-2xl border border-border/75 bg-card/60 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                <VersionQuickPicker
                  valueId={activeVersion.id}
                  onChange={setActiveVersionId}
                  compact
                />
                <span className="text-[11px] font-medium text-muted-foreground">
                  Primary
                </span>
              </div>
              {renderSingleChapterColumn(primaryChapterData, activeVersion, true)}
            </div>

            {/* Parallel Column 2 */}
            {secondMeta && (
              <div className="rounded-2xl border border-border/75 bg-card/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                  <VersionQuickPicker
                    valueId={secondMeta.id}
                    onChange={(id) => updatePrefs({ parallelVersionId: id })}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePrefs({
                        parallelVersionId: prefs.thirdVersionId,
                        thirdVersionId: null,
                      })
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Close parallel column"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {renderSingleChapterColumn(parallelChapterData, secondMeta, false)}
              </div>
            )}

            {/* Parallel Column 3 */}
            {thirdMeta && (
              <div className="rounded-2xl border border-border/75 bg-card/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                  <VersionQuickPicker
                    valueId={thirdMeta.id}
                    onChange={(id) => updatePrefs({ thirdVersionId: id })}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => updatePrefs({ thirdVersionId: null })}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Close third column"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {renderSingleChapterColumn(thirdChapterData, thirdMeta, false)}
              </div>
            )}
          </div>
        )}

        {/* Chapter Footer Navigation & Mark Read */}
        {!primaryLoading && !primaryError && (
          <footer className="mt-12 space-y-4 border-t border-border/70 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Finished reading {bookMeta.name} {chapter}?
                </div>
                <div className="text-xs text-muted-foreground">
                  Track your progress across all 1,189 chapters or explore deeper with AI Guide.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    markChapterRead();
                    toast.success(`Marked ${bookMeta.name} ${chapter} as read!`);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isChapterMarkedRead
                      ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-primary text-primary-foreground hover:opacity-95"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isChapterMarkedRead ? "Chapter Completed" : "Mark Chapter Read"}
                </button>
                <button
                  type="button"
                  onClick={() => setAiPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Reflect with AI
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={prevChapter}
                disabled={bookNumber === 1 && chapter === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold transition hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Chapter
              </button>
              <span className="text-[11px] text-muted-foreground">
                {activeVersion.licenseNotice || `${activeVersion.name} (${activeVersion.shortName})`}
              </span>
              <button
                type="button"
                onClick={nextChapter}
                disabled={bookNumber === 66 && chapter === 22}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold transition hover:bg-accent disabled:opacity-40"
              >
                Next Chapter
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* Floating Selected Verses Action Bar */}
      {selectedVerses.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-30 w-[95vw] max-w-2xl -translate-x-1/2 animate-fade-in rounded-2xl border border-border bg-popover/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-2.5 flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {formatReference(
                  bookNumber,
                  chapter,
                  Math.min(...selectedVerses),
                  selectedVerses.length > 1 ? Math.max(...selectedVerses) : undefined
                )}
              </span>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_SWATCHES.map((s) => (
                  <button
                    key={s.color}
                    type="button"
                    onClick={() => setVerseHighlight(selectedVerses, s.color)}
                    className={`h-5 w-5 rounded-full ${s.dotClass} ring-offset-background transition hover:scale-110 focus:ring-2 focus:ring-primary`}
                    title={`Highlight ${s.label}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setVerseHighlight(selectedVerses, null)}
                  className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                  title="Clear highlight"
                >
                  <Eraser className="h-3 w-3" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={clearSelectedVerses}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCompareDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
            >
              <Layers className="h-3.5 w-3.5" />
              Compare Versions
            </button>
            <button
              type="button"
              onClick={() => setAiPanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-primary/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Ask AI Guide
            </button>
            <button
              type="button"
              onClick={() => startAudioFromVerse(Math.min(...selectedVerses))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              Read From Here
            </button>
            <button
              type="button"
              onClick={handleOpenNoteDialog}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Note
            </button>
            <button
              type="button"
              onClick={() =>
                toggleBookmark(Math.min(...selectedVerses), selectedVersesText.slice(0, 180))
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Bookmark
            </button>
            <button
              type="button"
              onClick={() => addMemoryCard(selectedVerses, selectedVersesText)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Brain className="h-3.5 w-3.5" />
              Memorize
            </button>
            <button
              type="button"
              onClick={() => setVerseArtModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Verse Art
            </button>
            <button
              type="button"
              onClick={handleCopySelected}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Study Note Dialog */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add Margin Study Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Title
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Your Reflection / Study Observation
              </label>
              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write what stood out, cross-references, or personal application..."
                className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewNote}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Save Note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
