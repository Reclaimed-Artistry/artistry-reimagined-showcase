import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Database,
  Feather,
  Moon,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  CANONICAL_BOOKS,
  parseScriptureReference,
} from "@/data/canonicalBooks";
import { useBibleApp } from "@/context/useBibleApp";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export const CommandPaletteModal: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    navigateTo,
    setActiveSection,
    setAiPanelOpen,
    catalog,
    setActiveVersionId,
    isVersionOffline,
    prefs,
    updatePrefs,
  } = useBibleApp();

  const [query, setQuery] = useState("");

  const parsedRef = useMemo(() => parseScriptureReference(query), [query]);

  const matchingVersions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return catalog.filter((v) => v.provider !== "external" && isVersionOffline(v.id)).slice(0, 4);
    return catalog
      .filter(
        (v) =>
          v.provider !== "external" &&
          v.shortName.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.language.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, catalog, isVersionOffline]);

  const matchingBooks = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [CANONICAL_BOOKS[0], CANONICAL_BOOKS[18], CANONICAL_BOOKS[42], CANONICAL_BOOKS[44]];
    return CANONICAL_BOOKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.aliases.some((a) => a.includes(q))
    ).slice(0, 5);
  }, [query]);

  const closeAndRun = (fn: () => void) => {
    fn();
    setCommandPaletteOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="mr-3 h-4 w-4 text-primary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && parsedRef) {
                closeAndRun(() =>
                  navigateTo(
                    parsedRef.bookNumber,
                    parsedRef.chapter,
                    parsedRef.verse,
                    parsedRef.verseEnd
                  )
                );
              }
            }}
            placeholder="Jump to verse (e.g. John 3:16, Ps 23), switch version, or open AI..."
            className="w-full bg-transparent text-sm outline-none"
            autoFocus
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-3 text-xs">
          {parsedRef && (
            <div>
              <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                Direct Scripture Jump
              </div>
              <button
                type="button"
                onClick={() =>
                  closeAndRun(() =>
                    navigateTo(
                      parsedRef.bookNumber,
                      parsedRef.chapter,
                      parsedRef.verse,
                      parsedRef.verseEnd
                    )
                  )
                }
                className="flex w-full items-center justify-between rounded-xl bg-primary px-3.5 py-2.5 font-semibold text-primary-foreground"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Go to {parsedRef.bookName} {parsedRef.chapter}
                  {parsedRef.verse ? `:${parsedRef.verse}` : ""}
                  {parsedRef.verseEnd ? `-${parsedRef.verseEnd}` : ""}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div>
            <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Books
            </div>
            <div className="space-y-1">
              {matchingBooks.map((b) => (
                <button
                  key={b.bookNumber}
                  type="button"
                  onClick={() => closeAndRun(() => navigateTo(b.bookNumber, 1))}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-accent"
                >
                  <span className="font-semibold text-foreground">{b.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {b.chapters} chapters • {b.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Switch Bible Version
            </div>
            <div className="space-y-1">
              {matchingVersions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    closeAndRun(() => {
                      setActiveVersionId(v.id);
                      setActiveSection("reader");
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-accent"
                >
                  <span>
                    <strong className="font-mono text-primary">{v.shortName}</strong> —{" "}
                    {v.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{v.language}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => closeAndRun(() => setActiveSection("versions"))}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 font-medium hover:bg-accent"
              >
                <Database className="h-3.5 w-3.5 text-primary" />
                Offline Version Vault
              </button>
              <button
                type="button"
                onClick={() => closeAndRun(() => setActiveSection("plans"))}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 font-medium hover:bg-accent"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Reading Plans
              </button>
              <button
                type="button"
                onClick={() => closeAndRun(() => setActiveSection("reflection"))}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 font-medium hover:bg-accent"
              >
                <Feather className="h-3.5 w-3.5 text-primary" />
                Daily Reflection
              </button>
              {prefs.showBibleCompanion && (
                <button
                  type="button"
                  onClick={() =>
                    closeAndRun(() => {
                      setActiveSection("reader");
                      setAiPanelOpen(true);
                    })
                  }
                  className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 font-medium hover:bg-accent"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Open Selah Bible Companion
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  closeAndRun(() =>
                    updatePrefs({
                      theme: prefs.theme === "night" ? "parchment" : "night",
                    })
                  )
                }
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 font-medium hover:bg-accent"
              >
                {prefs.theme === "night" ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-primary" />
                    Switch to Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-primary" />
                    Switch to Night Mode
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
