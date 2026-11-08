import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Columns2,
  Database,
  Download,
  ExternalLink,
  FileDown,
  FileUp,
  Globe2,
  HardDrive,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useBibleApp } from "@/context/useBibleApp";
import { estimateDeviceStorage } from "@/lib/offlineDb";
import type { BibleVersionMeta } from "@/types/bible";

const REGION_TABS = [
  { id: "ALL", label: "All Versions" },
  { id: "OFFLINE", label: "Downloaded Offline" },
  { id: "FEATURED", label: "Featured" },
  { id: "English", label: "English" },
  { id: "African & Nigerian", label: "African & Nigerian" },
  { id: "Original & Ancient", label: "Hebrew / Greek / Latin" },
  { id: "European", label: "European" },
  { id: "Global & Asian", label: "Global & Asian" },
] as const;

const PROVIDER_LABELS: Record<string, { label: string; style: string }> = {
  bundled: {
    label: "Pre-Installed",
    style: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
  },
  cdn: {
    label: "Global Edge CDN",
    style: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  },
  bolls: {
    label: "Bolls Open Archive",
    style: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30",
  },
  helloao: {
    label: "HelloAO Open API",
    style: "bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/30",
  },
  custom: {
    label: "Custom Imported",
    style: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
  },
  external: {
    label: "Official Online Edition",
    style: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30",
  },
};

export const VersionVaultView: React.FC = () => {
  const {
    catalog,
    activeVersion,
    setActiveVersionId,
    setActiveSection,
    offlineSummaries,
    isVersionOffline,
    downloadTasks,
    triggerDownloadVersion,
    removeOfflineVersion,
    exportVersionJson,
    importVersionJson,
    prefs,
    updatePrefs,
  } = useBibleApp();

  const [search, setSearch] = useState("");
  const [regionTab, setRegionTab] = useState<string>("ALL");
  const [languageFilter, setLanguageFilter] = useState<string>("ALL");
  const [visibleLimit, setVisibleLimit] = useState<number>(48);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [storageStats, setStorageStats] = useState<{ usedMB: string }>({ usedMB: "8.1" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    estimateDeviceStorage().then(({ usedBytes }) => {
      const bundledBytes = 8.15 * 1024 * 1024;
      const totalMB = ((usedBytes + bundledBytes) / (1024 * 1024)).toFixed(1);
      setStorageStats({ usedMB: totalMB });
    });
  }, [offlineSummaries]);

  const distinctLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of catalog) {
      counts.set(v.language, (counts.get(v.language) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [catalog]);

  const filteredVersions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return catalog.filter((v) => {
      if (regionTab === "OFFLINE" && !isVersionOffline(v.id)) return false;
      if (regionTab === "FEATURED" && !v.featured && v.provider !== "bundled") return false;
      if (
        regionTab !== "ALL" &&
        regionTab !== "OFFLINE" &&
        regionTab !== "FEATURED" &&
        v.regionTag !== regionTab
      ) {
        return false;
      }
      if (languageFilter !== "ALL" && v.language !== languageFilter) return false;
      if (!q) return true;
      return (
        v.shortName.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
      );
    });
  }, [catalog, search, regionTab, languageFilter, isVersionOffline]);

  const offlineCount = useMemo(
    () => catalog.filter((v) => isVersionOffline(v.id)).length,
    [catalog, isVersionOffline]
  );

  const handleReadPrimary = (v: BibleVersionMeta) => {
    setActiveVersionId(v.id);
    setActiveSection("reader");
  };

  const handleOpenParallel = (v: BibleVersionMeta) => {
    if (v.id === activeVersion.id) {
      setActiveSection("reader");
      return;
    }
    updatePrefs({ parallelVersionId: v.id });
    setActiveSection("reader");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8">
      {/* Header & Offline Vault Telemetry */}
      <div className="mb-8 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
              <Database className="h-3.5 w-3.5" />
              Global Multi-Version Library &amp; Offline Vault
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Every Translation. Ready Anytime, Anywhere.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Browse <strong>{catalog.length.toLocaleString()}+ Bible translations</strong> across{" "}
              <strong>{distinctLanguages.length}+ languages</strong>. Stream any chapter instantly or
              click <strong>Download Offline</strong> to store complete 66-book Bibles permanently in
              your device&apos;s IndexedDB Vault for zero-internet reading and <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;35ms</code> full-Bible search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isOnline
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isOnline ? "Online • Live Catalog Synced" : "Offline Mode • Local Vault Active"}
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importVersionJson(f);
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent"
              title="Import a downloaded .json Bible file from your computer or phone"
            >
              <FileUp className="h-3.5 w-3.5 text-primary" />
              Import .JSON Bible
            </button>
          </div>
        </div>

        {/* Vault Stats Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/70 pt-5 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-background/60 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available Versions
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-foreground">
              {catalog.length.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Across {distinctLanguages.length} languages
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Installed Offline
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-foreground">
              {offlineCount} {offlineCount === 1 ? "Bible" : "Bibles"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Works 100% without internet
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/60 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Primary
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold text-primary">
              {activeVersion.shortName}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {activeVersion.name}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/60 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Offline Vault Footprint
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold text-foreground">
              <HardDrive className="h-4 w-4 text-primary" />
              {storageStats.usedMB} MB
            </div>
            <div className="text-[11px] text-muted-foreground">
              IndexedDB device storage
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleLimit(48);
              }}
              placeholder="Search by abbreviation, version name, or language (e.g. NKJV, NIV, ESV, NLT, MSG, Yoruba, Igbo, Hausa, Español, Greek)..."
              className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={languageFilter}
            onChange={(e) => {
              setLanguageFilter(e.target.value);
              setVisibleLimit(48);
            }}
            className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm outline-none focus:border-primary"
          >
            <option value="ALL">All Languages ({distinctLanguages.length})</option>
            {distinctLanguages.map(([lang, cnt]) => (
              <option key={lang} value={lang}>
                {lang} ({cnt})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {REGION_TABS.map((tab) => {
            const active = regionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRegionTab(tab.id);
                  setVisibleLimit(48);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.id === "OFFLINE" ? ` (${offlineCount})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <strong>{Math.min(visibleLimit, filteredVersions.length)}</strong> of{" "}
          <strong>{filteredVersions.length.toLocaleString()}</strong> matching Bible versions
        </span>
        {prefs.parallelVersionId && (
          <span className="text-primary font-medium">
            Parallel View active with{" "}
            {catalog.find((c) => c.id === prefs.parallelVersionId)?.shortName}
          </span>
        )}
      </div>

      {/* Versions Grid */}
      {filteredVersions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Globe2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-display text-xl font-semibold">No matching versions found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing your language filter or searching for another translation name.
          </p>
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVersions.slice(0, visibleLimit).map((v) => {
            const isOffline = isVersionOffline(v.id);
            const isActivePrimary = activeVersion.id === v.id;
            const isActiveParallel = prefs.parallelVersionId === v.id;
            const task = downloadTasks[v.id];
            const isDownloading =
              task &&
              (task.phase === "connecting" ||
                task.phase === "downloading" ||
                task.phase === "indexing" ||
                task.phase === "saving");
            const summary = offlineSummaries.find((s) => s.versionId === v.id);
            const actualMB = summary
              ? (summary.sizeBytes / (1024 * 1024)).toFixed(1)
              : v.estimatedSizeMB;
            const provStyle = PROVIDER_LABELS[v.provider] || PROVIDER_LABELS.helloao;

            return (
              <div
                key={v.id}
                className={`flex h-full flex-col justify-between rounded-2xl border p-4 shadow-sm transition ${
                  isActivePrimary
                    ? "border-primary bg-primary/6 ring-1 ring-primary/30"
                    : "border-border/80 bg-card hover:border-primary/40"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                        {v.shortName}
                      </span>
                      {v.featured && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                          <Sparkles className="h-2.5 w-2.5" />
                          Popular
                        </span>
                      )}
                    </div>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${provStyle.style}`}
                    >
                      {provStyle.label}
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-display text-xl font-bold leading-snug text-foreground">
                    {v.name}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{v.language}</span>
                    <span>•</span>
                    <span>{v.provider === "external" ? "Read online at official source" : `~${actualMB} MB`}</span>
                    {v.textDirection === "rtl" && (
                      <>
                        <span>•</span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold">
                          RTL Script
                        </span>
                      </>
                    )}
                    {v.hasStudioAudio && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">Studio Audio</span>
                      </>
                    )}
                  </div>

                  {v.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {v.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-2.5 border-t border-border/60 pt-3">
                  {/* Live Download Progress Bar */}
                  {isDownloading && task && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                        <span className="flex items-center gap-1.5 capitalize">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {task.phase}...
                        </span>
                        <span className="font-mono">
                          {task.progress}% ({task.downloadedMB} MB)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {v.provider === "external" ? (
                    <a
                      href={v.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Read the official Nigerian Pidgin edition
                    </a>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReadPrimary(v)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            isActivePrimary
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-background hover:bg-accent"
                          }`}
                        >
                          <BookOpenCheck className="h-3.5 w-3.5" />
                          {isActivePrimary ? "Reading" : "Read"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenParallel(v)}
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                            isActiveParallel
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                          title="Open side-by-side in Parallel View"
                        >
                          <Columns2 className="h-3.5 w-3.5" />
                          Parallel
                        </button>
                      </div>

                      {isOffline ? (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/12 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Offline Ready
                          </span>
                          <button
                            type="button"
                            onClick={() => exportVersionJson(v)}
                            className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
                            title="Export offline .json backup file"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </button>
                          {v.provider !== "bundled" && (
                            <button
                              type="button"
                              onClick={() => removeOfflineVersion(v.id)}
                              className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                              title="Remove offline copy from device"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(isDownloading)}
                          onClick={() => triggerDownloadVersion(v)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredVersions.length > visibleLimit && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisibleLimit((prev) => prev + 60)}
            className="rounded-2xl border border-border bg-card px-6 py-2.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent"
          >
            Show More Versions ({(filteredVersions.length - visibleLimit).toLocaleString()} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
