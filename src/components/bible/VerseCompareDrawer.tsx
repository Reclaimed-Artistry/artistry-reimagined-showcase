import React, { useEffect, useMemo, useState } from "react";
import { Columns2, Copy, Download, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatReference } from "@/data/canonicalBooks";
import { getChapterContent } from "@/lib/bibleProviders";
import { useBibleApp } from "@/context/useBibleApp";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BibleVersionMeta } from "@/types/bible";

export const VerseCompareDrawer: React.FC = () => {
  const {
    compareDrawerOpen,
    setCompareDrawerOpen,
    bookNumber,
    chapter,
    selectedVerses,
    catalog,
    isVersionOffline,
    triggerDownloadVersion,
    updatePrefs,
  } = useBibleApp();

  const targetVerses = useMemo(
    () => (selectedVerses.length > 0 ? [...selectedVerses].sort((a, b) => a - b) : [1]),
    [selectedVerses]
  );

  // Compare across all Offline Installed versions + up to 5 featured online translations!
  const compareTargets: BibleVersionMeta[] = useMemo(() => {
    const offline = catalog.filter((v) => isVersionOffline(v.id));
    const onlineFeatured = catalog
      .filter(
        (v) =>
          !isVersionOffline(v.id) &&
          ["bolls:NKJV", "bolls:ESV", "bolls:NASB", "bolls:YLT", "bolls:MSG"].includes(v.id)
      )
      .slice(0, 5);
    return [...offline, ...onlineFeatured];
  }, [catalog, isVersionOffline]);

  const [results, setResults] = useState<
    Record<string, { loading: boolean; text: string; error?: boolean }>
  >({});

  useEffect(() => {
    if (!compareDrawerOpen) return;
    let cancelled = false;

    const initial: Record<string, { loading: boolean; text: string }> = {};
    for (const v of compareTargets) {
      initial[v.id] = { loading: true, text: "" };
    }
    setResults(initial);

    compareTargets.forEach((v) => {
      getChapterContent(v, bookNumber, chapter)
        .then(({ chapterData }) => {
          if (cancelled) return;
          const matched = chapterData.verses
            .filter((vr) => targetVerses.includes(vr.verse))
            .map((vr) => (targetVerses.length > 1 ? `[${vr.verse}] ${vr.text}` : vr.text))
            .join(" ");
          setResults((prev) => ({
            ...prev,
            [v.id]: { loading: false, text: matched || "Verse not present in this edition." },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setResults((prev) => ({
            ...prev,
            [v.id]: { loading: false, text: "", error: true },
          }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [compareDrawerOpen, compareTargets, bookNumber, chapter, targetVerses]);

  const refTitle = formatReference(
    bookNumber,
    chapter,
    targetVerses[0],
    targetVerses.length > 1 ? targetVerses[targetVerses.length - 1] : undefined
  );

  return (
    <Sheet open={compareDrawerOpen} onOpenChange={setCompareDrawerOpen}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-6">
        <SheetHeader className="border-b border-border pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Layers className="h-3.5 w-3.5" />
            Multi-Version Parallel Lens
          </div>
          <SheetTitle className="font-display text-3xl font-bold">
            {refTitle}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Comparing all your Offline Vault Bibles alongside live translations. Download any
            version in the Vault to permanently include it here!
          </p>
        </SheetHeader>

        <div className="mt-5 space-y-3.5">
          {compareTargets.map((ver) => {
            const state = results[ver.id];
            const offline = isVersionOffline(ver.id);

            return (
              <div
                key={ver.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                      {ver.shortName}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">
                      {ver.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {!offline && (
                      <button
                        type="button"
                        onClick={() => triggerDownloadVersion(ver)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-primary"
                        title="Save this version offline"
                      >
                        <Download className="h-3 w-3" />
                        Save
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        updatePrefs({ parallelVersionId: ver.id });
                        setCompareDrawerOpen(false);
                      }}
                      className="rounded-lg border border-border p-1 text-muted-foreground hover:text-primary"
                      title="Open full chapter side-by-side"
                    >
                      <Columns2 className="h-3.5 w-3.5" />
                    </button>
                    {state?.text && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${state.text} — ${refTitle} (${ver.shortName})`
                          );
                          toast.success(`Copied ${ver.shortName}`);
                        }}
                        className="rounded-lg border border-border p-1 text-muted-foreground hover:text-foreground"
                        title="Copy verse"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {state?.loading ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Loading {ver.shortName}...
                  </div>
                ) : state?.error ? (
                  <p className="text-xs italic text-muted-foreground">
                    Online stream unreachable right now.
                  </p>
                ) : (
                  <p
                    dir={ver.textDirection}
                    className="font-scripture text-sm leading-relaxed text-foreground"
                  >
                    {state?.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
