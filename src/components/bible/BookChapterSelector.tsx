import React, { useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, Search, Sparkles } from "lucide-react";
import {
  CANONICAL_BOOKS,
  CanonicalBookMeta,
  getBookMeta,
  parseScriptureReference,
} from "@/data/canonicalBooks";
import { useBibleApp } from "@/context/BibleAppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Pentateuch: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  Historical: "bg-orange-500/12 text-orange-800 dark:text-orange-300",
  "Poetry & Wisdom": "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  "Major Prophets": "bg-rose-500/12 text-rose-800 dark:text-rose-300",
  "Minor Prophets": "bg-pink-500/12 text-pink-800 dark:text-pink-300",
  "Gospels & Acts": "bg-red-500/12 text-red-800 dark:text-red-300",
  "Pauline Epistles": "bg-sky-500/12 text-sky-800 dark:text-sky-300",
  "General Epistles": "bg-indigo-500/12 text-indigo-800 dark:text-indigo-300",
  Apocalyptic: "bg-purple-500/12 text-purple-800 dark:text-purple-300",
};

export const BookChapterSelector: React.FC = () => {
  const { bookNumber, chapter, navigateTo, readChapters } = useBibleApp();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ALL" | "OT" | "NT">("ALL");
  const [filter, setFilter] = useState("");
  const [selectedBook, setSelectedBook] = useState<CanonicalBookMeta>(() =>
    getBookMeta(bookNumber)
  );
  const [step, setStep] = useState<"book" | "chapter">("book");

  const currentBook = getBookMeta(bookNumber);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedBook(getBookMeta(bookNumber));
      setStep("book");
      setFilter("");
    }
  };

  const parsedDirectRef = useMemo(
    () => (filter.trim().length >= 3 ? parseScriptureReference(filter) : null),
    [filter]
  );

  const filteredBooks = useMemo(() => {
    return CANONICAL_BOOKS.filter((b) => {
      if (tab !== "ALL" && b.testament !== tab) return false;
      if (!filter.trim()) return true;
      const q = filter.toLowerCase().trim();
      return (
        b.name.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.aliases.some((a) => a.includes(q))
      );
    });
  }, [tab, filter]);

  const readSet = useMemo(() => new Set(readChapters), [readChapters]);

  const handleDirectJump = () => {
    if (!parsedDirectRef) return;
    navigateTo(
      parsedDirectRef.bookNumber,
      parsedDirectRef.chapter,
      parsedDirectRef.verse,
      parsedDirectRef.verseEnd
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-accent/50"
          title="Choose Book & Chapter"
        >
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-display text-lg font-semibold tracking-tight">
            {currentBook.name} {chapter}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 bg-muted/40 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="font-display text-2xl font-semibold">
              {step === "book" ? "Navigate Scripture" : `${selectedBook.name} — Choose Chapter`}
            </DialogTitle>
            {step === "chapter" && (
              <button
                type="button"
                onClick={() => setStep("book")}
                className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
              >
                ← All 66 Books
              </button>
            )}
          </div>

          {step === "book" && (
            <div className="mt-3 space-y-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && parsedDirectRef) {
                      handleDirectJump();
                    }
                  }}
                  placeholder="Search book or jump directly (e.g. John 3:16, Ps 23, Rom 8)..."
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              {parsedDirectRef && (
                <button
                  type="button"
                  onClick={handleDirectJump}
                  className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-left text-xs font-medium text-foreground transition hover:bg-primary/15"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Jump directly to{" "}
                    <strong>
                      {parsedDirectRef.bookName} {parsedDirectRef.chapter}
                      {parsedDirectRef.verse ? `:${parsedDirectRef.verse}` : ""}
                      {parsedDirectRef.verseEnd ? `-${parsedDirectRef.verseEnd}` : ""}
                    </strong>
                  </span>
                  <span className="rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                    Enter ↵
                  </span>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: "All 66 Books" },
                    { id: "OT", label: "Old Testament (39)" },
                    { id: "NT", label: "New Testament (27)" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      tab === t.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          {step === "book" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredBooks.map((b) => {
                const isCurrent = b.bookNumber === bookNumber;
                return (
                  <button
                    key={b.bookNumber}
                    type="button"
                    onClick={() => {
                      setSelectedBook(b);
                      if (b.chapters === 1) {
                        navigateTo(b.bookNumber, 1);
                        setOpen(false);
                      } else {
                        setStep("chapter");
                      }
                    }}
                    className={`group flex flex-col items-start rounded-xl border p-3 text-left transition ${
                      isCurrent
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="font-semibold text-foreground">{b.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {b.chapters} ch
                      </span>
                    </div>
                    <span
                      className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        CATEGORY_BADGE_STYLES[b.category] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {b.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="mb-3 text-xs text-muted-foreground">
                {selectedBook.theme} • {selectedBook.author} ({selectedBook.dateWritten})
              </p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chNum) => {
                  const isActive =
                    selectedBook.bookNumber === bookNumber && chNum === chapter;
                  const isCompleted = readSet.has(`${selectedBook.bookNumber}:${chNum}`);
                  return (
                    <button
                      key={chNum}
                      type="button"
                      onClick={() => {
                        navigateTo(selectedBook.bookNumber, chNum);
                        setOpen(false);
                      }}
                      className={`relative flex h-11 items-center justify-center rounded-xl border font-mono text-sm font-semibold transition ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : isCompleted
                          ? "border-emerald-500/40 bg-emerald-500/10 text-foreground hover:bg-emerald-500/20"
                          : "border-border/70 bg-card text-foreground hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      {chNum}
                      {isCompleted && !isActive && (
                        <Check className="absolute right-1 top-1 h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
