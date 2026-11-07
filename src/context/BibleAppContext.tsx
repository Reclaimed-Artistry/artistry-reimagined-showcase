import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { getBookMeta } from "@/data/canonicalBooks";
import { BUILTIN_READING_PLANS } from "@/data/readingPlans";
import {
  BUNDLED_VERSIONS,
  downloadVersionOffline,
  evictBibleFromMemory,
  exportBibleJsonToDevice,
  getChapterContent,
  importCustomBibleJson,
  loadUnifiedCatalog,
} from "@/lib/bibleProviders";
import {
  deleteOfflineBible,
  listOfflineBibleSummaries,
} from "@/lib/offlineDb";
import type {
  AppSection,
  BibleVersionMeta,
  DailyReflectionEntry,
  HighlightColor,
  MemoryVerseCard,
  NormalizedChapter,
  OfflineBibleSummary,
  PrayerJournalItem,
  ReaderPreferences,
  ReadingPlanDefinition,
  UserPlanEnrollment,
  VerseBookmark,
  VerseHighlight,
  VerseNote,
  VersionDownloadProgress,
} from "@/types/bible";

const STORAGE_KEYS = {
  PREFS: "selah_prefs_v1",
  LOCATION: "selah_location_v1",
  ACTIVE_VERSION: "selah_active_version_v1",
  HIGHLIGHTS: "selah_highlights_v1",
  BOOKMARKS: "selah_bookmarks_v1",
  NOTES: "selah_notes_v1",
  ENROLLMENTS: "selah_plan_enrollments_v1",
  CUSTOM_PLANS: "selah_custom_plans_v1",
  CUSTOM_VERSIONS: "selah_custom_versions_v1",
  REFLECTIONS: "selah_reflections_v1",
  PRAYERS: "selah_prayers_v1",
  MEMORY_CARDS: "selah_memory_cards_v1",
  READ_CHAPTERS: "selah_read_chapters_v1",
  STREAK_DATES: "selah_streak_dates_v1",
};

const DEFAULT_PREFS: ReaderPreferences = {
  theme: "parchment",
  fontFamily: "scripture",
  appearanceBackgroundColor: null,
  appearanceBackgroundImage: "",
  appearanceImageDarken: 28,
  fontSize: 19,
  lineHeight: 1.85,
  layoutMode: "verse",
  showHeadings: true,
  showFootnotes: true,
  redLetter: true,
  parallelVersionId: null,
  thirdVersionId: null,
  speechRate: 1.0,
  preferredVoiceURI: "",
  autoAdvanceChapter: true,
  ambientSound: false,
  aiSettings: {
    mode: "hybrid",
    endpointUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "gpt-4o-mini",
  },
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

export interface ActivePlanReadingSession {
  planId: string;
  day: number;
}

interface BibleAppContextValue {
  activeSection: AppSection;
  setActiveSection: (s: AppSection) => void;

  // Navigation & Scripture location
  bookNumber: number;
  chapter: number;
  selectedVerses: number[];
  focusedVerse: number | null;
  navigateTo: (
    bookNumber: number,
    chapter: number,
    verse?: number,
    verseEnd?: number,
    switchToReader?: boolean
  ) => void;
  toggleVerseSelection: (verse: number) => void;
  clearSelectedVerses: () => void;
  nextChapter: () => void;
  prevChapter: () => void;

  // Versions & Offline Vault
  catalog: BibleVersionMeta[];
  activeVersionId: string;
  activeVersion: BibleVersionMeta;
  setActiveVersionId: (id: string) => void;
  offlineSummaries: OfflineBibleSummary[];
  isVersionOffline: (versionId: string) => boolean;
  downloadTasks: Record<string, VersionDownloadProgress>;
  triggerDownloadVersion: (meta: BibleVersionMeta) => Promise<void>;
  removeOfflineVersion: (versionId: string) => Promise<void>;
  exportVersionJson: (meta: BibleVersionMeta) => Promise<void>;
  importVersionJson: (file: File) => Promise<void>;

  // Loaded Chapter State
  primaryChapterData: NormalizedChapter | null;
  primaryLoading: boolean;
  primaryError: string | null;
  isPrimaryOfflineInstalled: boolean;
  parallelChapterData: NormalizedChapter | null;
  thirdChapterData: NormalizedChapter | null;
  reloadChapters: () => void;

  // Preferences & Theme
  prefs: ReaderPreferences;
  updatePrefs: (patch: Partial<ReaderPreferences>) => void;

  // Highlights, Bookmarks, Notes
  highlights: Record<string, VerseHighlight>;
  setVerseHighlight: (verses: number[], color: HighlightColor | null) => void;
  bookmarks: VerseBookmark[];
  toggleBookmark: (verse: number, textSnippet: string) => void;
  removeBookmark: (id: string) => void;
  notes: VerseNote[];
  saveNote: (note: Omit<VerseNote, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  deleteNote: (id: string) => void;

  // Progress & Streaks
  readChapters: string[];
  markChapterRead: (bookNumber?: number, chapter?: number) => void;
  streakCount: number;

  // Reading Plans
  allPlans: ReadingPlanDefinition[];
  enrollments: UserPlanEnrollment[];
  enrollInPlan: (planId: string) => void;
  unenrollPlan: (planId: string) => void;
  togglePlanDayComplete: (planId: string, day: number) => void;
  addCustomPlan: (plan: ReadingPlanDefinition) => void;
  activePlanSession: ActivePlanReadingSession | null;
  setActivePlanSession: (s: ActivePlanReadingSession | null) => void;

  // Reflections, Prayers & Memory Deck
  reflections: DailyReflectionEntry[];
  saveReflection: (entry: Omit<DailyReflectionEntry, "id" | "createdAt">) => void;
  prayers: PrayerJournalItem[];
  addPrayer: (p: Omit<PrayerJournalItem, "id" | "createdAt" | "answered">) => void;
  togglePrayerAnswered: (id: string) => void;
  deletePrayer: (id: string) => void;
  memoryCards: MemoryVerseCard[];
  addMemoryCard: (verses: number[], text: string) => void;
  recordMemoryPractice: (id: string, masteredUp: boolean) => void;
  deleteMemoryCard: (id: string) => void;

  // Panels, Audio & Modals
  aiPanelOpen: boolean;
  setAiPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  audioBarOpen: boolean;
  setAudioBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeAudioVerse: number | null;
  setActiveAudioVerse: React.Dispatch<React.SetStateAction<number | null>>;
  audioStartRequest: { verse: number; nonce: number } | null;
  startAudioFromVerse: (verse?: number) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  compareDrawerOpen: boolean;
  setCompareDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  verseArtModalOpen: boolean;
  setVerseArtModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const BibleAppContext = createContext<BibleAppContextValue | null>(null);

function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const BibleAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<AppSection>("reader");

  const initialLoc = useMemo(
    () => readLocal<{ bookNumber: number; chapter: number }>(STORAGE_KEYS.LOCATION, { bookNumber: 43, chapter: 1 }),
    []
  );
  const [bookNumber, setBookNumber] = useState<number>(initialLoc.bookNumber || 43);
  const [chapter, setChapter] = useState<number>(initialLoc.chapter || 1);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);

  const [prefs, setPrefs] = useState<ReaderPreferences>(() => ({
    ...DEFAULT_PREFS,
    ...readLocal<Partial<ReaderPreferences>>(STORAGE_KEYS.PREFS, {}),
  }));

  const [customVersions, setCustomVersions] = useState<BibleVersionMeta[]>(() =>
    readLocal<BibleVersionMeta[]>(STORAGE_KEYS.CUSTOM_VERSIONS, [])
  );
  const [baseCatalog, setBaseCatalog] = useState<BibleVersionMeta[]>(BUNDLED_VERSIONS);

  const catalog = useMemo(() => {
    const map = new Map<string, BibleVersionMeta>();
    for (const v of baseCatalog) map.set(v.id, v);
    for (const cv of customVersions) map.set(cv.id, cv);
    return Array.from(map.values());
  }, [baseCatalog, customVersions]);

  const [activeVersionId, setActiveVersionIdState] = useState<string>(() =>
    readLocal<string>(STORAGE_KEYS.ACTIVE_VERSION, "bundled:en_bsb")
  );

  const activeVersion = useMemo(
    () => catalog.find((v) => v.id === activeVersionId) || BUNDLED_VERSIONS[0],
    [catalog, activeVersionId]
  );

  const [offlineSummaries, setOfflineSummaries] = useState<OfflineBibleSummary[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<Record<string, VersionDownloadProgress>>({});

  // Chapter content states
  const [primaryChapterData, setPrimaryChapterData] = useState<NormalizedChapter | null>(null);
  const [primaryLoading, setPrimaryLoading] = useState<boolean>(true);
  const [primaryError, setPrimaryError] = useState<string | null>(null);
  const [isPrimaryOfflineInstalled, setIsPrimaryOfflineInstalled] = useState<boolean>(true);
  const [parallelChapterData, setParallelChapterData] = useState<NormalizedChapter | null>(null);
  const [thirdChapterData, setThirdChapterData] = useState<NormalizedChapter | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  // User study items
  const [highlights, setHighlights] = useState<Record<string, VerseHighlight>>(() =>
    readLocal<Record<string, VerseHighlight>>(STORAGE_KEYS.HIGHLIGHTS, {})
  );
  const [bookmarks, setBookmarks] = useState<VerseBookmark[]>(() =>
    readLocal<VerseBookmark[]>(STORAGE_KEYS.BOOKMARKS, [])
  );
  const [notes, setNotes] = useState<VerseNote[]>(() =>
    readLocal<VerseNote[]>(STORAGE_KEYS.NOTES, [])
  );
  const [readChapters, setReadChapters] = useState<string[]>(() =>
    readLocal<string[]>(STORAGE_KEYS.READ_CHAPTERS, [])
  );
  const [streakDates, setStreakDates] = useState<string[]>(() =>
    readLocal<string[]>(STORAGE_KEYS.STREAK_DATES, [getTodayIso()])
  );

  // Reading plans
  const [customPlans, setCustomPlans] = useState<ReadingPlanDefinition[]>(() =>
    readLocal<ReadingPlanDefinition[]>(STORAGE_KEYS.CUSTOM_PLANS, [])
  );
  const [enrollments, setEnrollments] = useState<UserPlanEnrollment[]>(() =>
    readLocal<UserPlanEnrollment[]>(STORAGE_KEYS.ENROLLMENTS, [
      {
        planId: "gospels-30",
        startedAt: Date.now(),
        completedDays: [],
        lastReadDay: 1,
      },
    ])
  );
  const [activePlanSession, setActivePlanSession] = useState<ActivePlanReadingSession | null>(null);

  // Reflections, prayers, memory deck
  const [reflections, setReflections] = useState<DailyReflectionEntry[]>(() =>
    readLocal<DailyReflectionEntry[]>(STORAGE_KEYS.REFLECTIONS, [])
  );
  const [prayers, setPrayers] = useState<PrayerJournalItem[]>(() =>
    readLocal<PrayerJournalItem[]>(STORAGE_KEYS.PRAYERS, [])
  );
  const [memoryCards, setMemoryCards] = useState<MemoryVerseCard[]>(() =>
    readLocal<MemoryVerseCard[]>(STORAGE_KEYS.MEMORY_CARDS, [
      {
        id: "seed-mem-1",
        bookNumber: 19,
        chapter: 119,
        verse: 11,
        versionShortName: "BSB",
        reference: "Psalms 119:11",
        text: "I have hidden Your word in my heart that I might not sin against You.",
        masteryLevel: 1,
        practiceCount: 1,
        createdAt: Date.now(),
      },
      {
        id: "seed-mem-2",
        bookNumber: 50,
        chapter: 4,
        verse: 6,
        verseEnd: 7,
        versionShortName: "BSB",
        reference: "Philippians 4:6-7",
        text: "Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.",
        masteryLevel: 0,
        practiceCount: 0,
        createdAt: Date.now(),
      },
    ])
  );

  // Panels & Modals
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);
  const [audioBarOpen, setAudioBarOpen] = useState<boolean>(false);
  const [activeAudioVerse, setActiveAudioVerse] = useState<number | null>(null);
  const [audioStartRequest, setAudioStartRequest] = useState<{ verse: number; nonce: number } | null>(
    null
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState<boolean>(false);
  const [verseArtModalOpen, setVerseArtModalOpen] = useState<boolean>(false);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "theme-sepia");
    if (prefs.theme === "night") {
      root.classList.add("dark");
    } else if (prefs.theme === "sepia") {
      root.classList.add("theme-sepia");
    }
    writeLocal(STORAGE_KEYS.PREFS, prefs);
  }, [prefs]);

  // Global Cmd+K / Ctrl+K shortcut for Quick Scripture Jumper
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load Unified Catalog + Offline Vault list on startup
  const refreshOfflineList = useCallback(async () => {
    const dbList = await listOfflineBibleSummaries();
    setOfflineSummaries(dbList);
  }, []);

  useEffect(() => {
    loadUnifiedCatalog((remoteUpdated) => {
      setBaseCatalog(remoteUpdated);
    }).then((initial) => {
      setBaseCatalog(initial);
    });
    refreshOfflineList();

    // Record today's visit in reading streak
    const today = getTodayIso();
    setStreakDates((prev) => {
      if (prev.includes(today)) return prev;
      const next = [...prev, today].sort();
      writeLocal(STORAGE_KEYS.STREAK_DATES, next);
      return next;
    });
  }, [refreshOfflineList]);

  // Persist location
  useEffect(() => {
    writeLocal(STORAGE_KEYS.LOCATION, { bookNumber, chapter });
  }, [bookNumber, chapter]);

  const setActiveVersionId = useCallback((id: string) => {
    setActiveVersionIdState(id);
    writeLocal(STORAGE_KEYS.ACTIVE_VERSION, id);
  }, []);

  // Load Primary + Parallel + Third chapters whenever version/book/chapter changes
  useEffect(() => {
    let cancelled = false;
    setPrimaryLoading(true);
    setPrimaryError(null);

    getChapterContent(activeVersion, bookNumber, chapter, (prog) => {
      setDownloadTasks((prev) => ({ ...prev, [activeVersion.id]: prog }));
    })
      .then(({ chapterData, isOfflineInstalled }) => {
        if (cancelled) return;
        setPrimaryChapterData(chapterData);
        setIsPrimaryOfflineInstalled(isOfflineInstalled);
        setPrimaryLoading(false);
        if (isOfflineInstalled && activeVersion.provider !== "bundled") {
          refreshOfflineList();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPrimaryError(err?.message || "Failed to load chapter.");
        setPrimaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeVersion, bookNumber, chapter, reloadTick, refreshOfflineList]);

  // Load Parallel 2nd column if enabled
  useEffect(() => {
    let cancelled = false;
    if (!prefs.parallelVersionId) {
      setParallelChapterData(null);
      return;
    }
    const pMeta = catalog.find((v) => v.id === prefs.parallelVersionId);
    if (!pMeta) {
      setParallelChapterData(null);
      return;
    }
    getChapterContent(pMeta, bookNumber, chapter)
      .then(({ chapterData }) => {
        if (!cancelled) setParallelChapterData(chapterData);
      })
      .catch(() => {
        if (!cancelled) setParallelChapterData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [prefs.parallelVersionId, catalog, bookNumber, chapter, reloadTick]);

  // Load Parallel 3rd column if enabled
  useEffect(() => {
    let cancelled = false;
    if (!prefs.thirdVersionId) {
      setThirdChapterData(null);
      return;
    }
    const tMeta = catalog.find((v) => v.id === prefs.thirdVersionId);
    if (!tMeta) {
      setThirdChapterData(null);
      return;
    }
    getChapterContent(tMeta, bookNumber, chapter)
      .then(({ chapterData }) => {
        if (!cancelled) setThirdChapterData(chapterData);
      })
      .catch(() => {
        if (!cancelled) setThirdChapterData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [prefs.thirdVersionId, catalog, bookNumber, chapter, reloadTick]);

  const navigateTo = useCallback(
    (
      nextBook: number,
      nextCh: number,
      verse?: number,
      verseEnd?: number,
      switchToReader = true
    ) => {
      const meta = getBookMeta(nextBook);
      const safeCh = Math.max(1, Math.min(meta.chapters, nextCh || 1));
      setBookNumber(meta.bookNumber);
      setChapter(safeCh);
      setActiveAudioVerse(null);
      if (verse) {
        const range: number[] = [];
        const end = verseEnd && verseEnd >= verse ? verseEnd : verse;
        for (let v = verse; v <= end; v++) range.push(v);
        setSelectedVerses(range);
        setFocusedVerse(verse);
      } else {
        setSelectedVerses([]);
        setFocusedVerse(null);
      }
      if (switchToReader) {
        setActiveSection("reader");
      }
    },
    []
  );

  const nextChapter = useCallback(() => {
    const meta = getBookMeta(bookNumber);
    if (chapter < meta.chapters) {
      navigateTo(bookNumber, chapter + 1);
    } else if (bookNumber < 66) {
      navigateTo(bookNumber + 1, 1);
    }
  }, [bookNumber, chapter, navigateTo]);

  const prevChapter = useCallback(() => {
    if (chapter > 1) {
      navigateTo(bookNumber, chapter - 1);
    } else if (bookNumber > 1) {
      const prevMeta = getBookMeta(bookNumber - 1);
      navigateTo(bookNumber - 1, prevMeta.chapters);
    }
  }, [bookNumber, chapter, navigateTo]);

  const toggleVerseSelection = useCallback((verse: number) => {
    setSelectedVerses((prev) =>
      prev.includes(verse) ? prev.filter((v) => v !== verse) : [...prev, verse].sort((a, b) => a - b)
    );
  }, []);

  const clearSelectedVerses = useCallback(() => setSelectedVerses([]), []);

  const updatePrefs = useCallback((patch: Partial<ReaderPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const isVersionOffline = useCallback(
    (versionId: string) => {
      if (versionId.startsWith("bundled:")) return true;
      return offlineSummaries.some((s) => s.versionId === versionId);
    },
    [offlineSummaries]
  );

  const triggerDownloadVersion = useCallback(
    async (meta: BibleVersionMeta) => {
      if (meta.provider === "external") {
        if (meta.sourceUrl) window.open(meta.sourceUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (meta.provider === "bundled") {
        toast.success(`${meta.shortName} is pre-installed and ready offline.`);
        return;
      }
      try {
        await downloadVersionOffline(meta, (prog) => {
          setDownloadTasks((prev) => ({ ...prev, [meta.id]: prog }));
        });
        await refreshOfflineList();
        toast.success(`${meta.name} (${meta.shortName}) saved to Offline Vault!`, {
          description: "Available anytime—even without an internet connection.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Download failed";
        setDownloadTasks((prev) => ({
          ...prev,
          [meta.id]: {
            versionId: meta.id,
            progress: 0,
            downloadedMB: 0,
            phase: "error",
            errorMessage: msg,
          },
        }));
        toast.error(`Could not download ${meta.shortName}`, {
          description: msg || "Check internet connection and retry.",
        });
      }
    },
    [refreshOfflineList]
  );

  const removeOfflineVersion = useCallback(
    async (versionId: string) => {
      if (versionId.startsWith("bundled:")) return;
      await deleteOfflineBible(versionId);
      evictBibleFromMemory(versionId);
      setDownloadTasks((prev) => {
        const copy = { ...prev };
        delete copy[versionId];
        return copy;
      });
      if (versionId.startsWith("custom:")) {
        setCustomVersions((prev) => {
          const next = prev.filter((c) => c.id !== versionId);
          writeLocal(STORAGE_KEYS.CUSTOM_VERSIONS, next);
          return next;
        });
      }
      if (activeVersionId === versionId) {
        setActiveVersionId("bundled:en_bsb");
      }
      await refreshOfflineList();
      toast.info("Removed offline copy from device storage.");
    },
    [activeVersionId, refreshOfflineList, setActiveVersionId]
  );

  const exportVersionJson = useCallback(async (meta: BibleVersionMeta) => {
    try {
      await exportBibleJsonToDevice(meta);
      toast.success(`Exported ${meta.shortName} offline JSON file.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export Bible file.");
    }
  }, []);

  const importVersionJson = useCallback(
    async (file: File) => {
      try {
        const { meta } = await importCustomBibleJson(file);
        setCustomVersions((prev) => {
          const next = [meta, ...prev.filter((p) => p.id !== meta.id)];
          writeLocal(STORAGE_KEYS.CUSTOM_VERSIONS, next);
          return next;
        });
        await refreshOfflineList();
        setActiveVersionId(meta.id);
        toast.success(`Imported ${meta.name} into Offline Vault!`);
      } catch (err: unknown) {
        toast.error("Could not import JSON file", {
          description: err instanceof Error ? err.message : "Unsupported JSON Bible format.",
        });
      }
    },
    [refreshOfflineList, setActiveVersionId]
  );

  const setVerseHighlight = useCallback(
    (verses: number[], color: HighlightColor | null) => {
      setHighlights((prev) => {
        const next = { ...prev };
        for (const v of verses) {
          const key = `${bookNumber}:${chapter}:${v}`;
          if (!color) {
            delete next[key];
          } else {
            next[key] = {
              key,
              bookNumber,
              chapter,
              verse: v,
              color,
              updatedAt: Date.now(),
            };
          }
        }
        writeLocal(STORAGE_KEYS.HIGHLIGHTS, next);
        return next;
      });
    },
    [bookNumber, chapter]
  );

  const toggleBookmark = useCallback(
    (verse: number, textSnippet: string) => {
      setBookmarks((prev) => {
        const existing = prev.find(
          (b) => b.bookNumber === bookNumber && b.chapter === chapter && b.verse === verse
        );
        let next: VerseBookmark[];
        if (existing) {
          next = prev.filter((b) => b.id !== existing.id);
          toast.info("Bookmark removed");
        } else {
          next = [
            {
              id: `bm-${Date.now()}-${verse}`,
              bookNumber,
              chapter,
              verse,
              versionId: activeVersion.id,
              versionShortName: activeVersion.shortName,
              textSnippet,
              createdAt: Date.now(),
            },
            ...prev,
          ];
          toast.success(`Bookmarked ${getBookMeta(bookNumber).name} ${chapter}:${verse}`);
        }
        writeLocal(STORAGE_KEYS.BOOKMARKS, next);
        return next;
      });
    },
    [bookNumber, chapter, activeVersion]
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      writeLocal(STORAGE_KEYS.BOOKMARKS, next);
      return next;
    });
  }, []);

  const saveNote = useCallback(
    (noteInput: Omit<VerseNote, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      setNotes((prev) => {
        let next: VerseNote[];
        if (noteInput.id) {
          next = prev.map((n) =>
            n.id === noteInput.id
              ? { ...n, ...noteInput, updatedAt: Date.now() }
              : n
          );
        } else {
          next = [
            {
              ...noteInput,
              id: `note-${Date.now()}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...prev,
          ];
        }
        writeLocal(STORAGE_KEYS.NOTES, next);
        toast.success("Study note saved");
        return next;
      });
    },
    []
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      writeLocal(STORAGE_KEYS.NOTES, next);
      return next;
    });
  }, []);

  const markChapterRead = useCallback(
    (bNum = bookNumber, chNum = chapter) => {
      const key = `${bNum}:${chNum}`;
      setReadChapters((prev) => {
        if (prev.includes(key)) return prev;
        const next = [...prev, key];
        writeLocal(STORAGE_KEYS.READ_CHAPTERS, next);
        return next;
      });
      const today = getTodayIso();
      setStreakDates((prev) => {
        if (prev.includes(today)) return prev;
        const next = [...prev, today].sort();
        writeLocal(STORAGE_KEYS.STREAK_DATES, next);
        return next;
      });
    },
    [bookNumber, chapter]
  );

  const streakCount = useMemo(() => {
    if (streakDates.length === 0) return 1;
    const set = new Set(streakDates);
    let count = 0;
    const d = new Date();
    while (true) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (set.has(iso)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return Math.max(1, count);
  }, [streakDates]);

  const allPlans = useMemo(
    () => [...customPlans, ...BUILTIN_READING_PLANS],
    [customPlans]
  );

  const enrollInPlan = useCallback((planId: string) => {
    setEnrollments((prev) => {
      if (prev.some((e) => e.planId === planId)) return prev;
      const next: UserPlanEnrollment[] = [
        {
          planId,
          startedAt: Date.now(),
          completedDays: [],
          lastReadDay: 1,
        },
        ...prev,
      ];
      writeLocal(STORAGE_KEYS.ENROLLMENTS, next);
      toast.success("Reading plan started!");
      return next;
    });
  }, []);

  const unenrollPlan = useCallback((planId: string) => {
    setEnrollments((prev) => {
      const next = prev.filter((e) => e.planId !== planId);
      writeLocal(STORAGE_KEYS.ENROLLMENTS, next);
      return next;
    });
  }, []);

  const togglePlanDayComplete = useCallback((planId: string, day: number) => {
    setEnrollments((prev) => {
      const exists = prev.some((e) => e.planId === planId);
      const base = exists
        ? prev
        : [
            {
              planId,
              startedAt: Date.now(),
              completedDays: [],
              lastReadDay: 1,
            },
            ...prev,
          ];
      const next = base.map((e) => {
        if (e.planId !== planId) return e;
        const has = e.completedDays.includes(day);
        const completedDays = has
          ? e.completedDays.filter((d) => d !== day)
          : [...e.completedDays, day].sort((a, b) => a - b);
        return {
          ...e,
          completedDays,
          lastReadDay: has ? e.lastReadDay : day + 1,
        };
      });
      writeLocal(STORAGE_KEYS.ENROLLMENTS, next);
      return next;
    });
  }, []);

  const addCustomPlan = useCallback((plan: ReadingPlanDefinition) => {
    setCustomPlans((prev) => {
      const next = [plan, ...prev];
      writeLocal(STORAGE_KEYS.CUSTOM_PLANS, next);
      return next;
    });
    enrollInPlan(plan.id);
  }, [enrollInPlan]);

  const saveReflection = useCallback(
    (entry: Omit<DailyReflectionEntry, "id" | "createdAt">) => {
      setReflections((prev) => {
        const next: DailyReflectionEntry[] = [
          {
            ...entry,
            id: `ref-${Date.now()}`,
            createdAt: Date.now(),
          },
          ...prev,
        ];
        writeLocal(STORAGE_KEYS.REFLECTIONS, next);
        toast.success("Daily reflection saved to your journal");
        return next;
      });
    },
    []
  );

  const addPrayer = useCallback(
    (p: Omit<PrayerJournalItem, "id" | "createdAt" | "answered">) => {
      setPrayers((prev) => {
        const next: PrayerJournalItem[] = [
          {
            ...p,
            id: `pray-${Date.now()}`,
            answered: false,
            createdAt: Date.now(),
          },
          ...prev,
        ];
        writeLocal(STORAGE_KEYS.PRAYERS, next);
        toast.success("Added to your Prayer Sanctuary");
        return next;
      });
    },
    []
  );

  const togglePrayerAnswered = useCallback((id: string) => {
    setPrayers((prev) => {
      const next = prev.map((p) =>
        p.id === id
          ? {
              ...p,
              answered: !p.answered,
              answeredAt: !p.answered ? Date.now() : undefined,
            }
          : p
      );
      writeLocal(STORAGE_KEYS.PRAYERS, next);
      return next;
    });
  }, []);

  const deletePrayer = useCallback((id: string) => {
    setPrayers((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeLocal(STORAGE_KEYS.PRAYERS, next);
      return next;
    });
  }, []);

  const addMemoryCard = useCallback(
    (verses: number[], text: string) => {
      if (verses.length === 0) return;
      const sorted = [...verses].sort((a, b) => a - b);
      const book = getBookMeta(bookNumber);
      const ref =
        sorted.length > 1
          ? `${book.name} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`
          : `${book.name} ${chapter}:${sorted[0]}`;
      setMemoryCards((prev) => {
        if (prev.some((m) => m.reference === ref)) {
          toast.info(`${ref} is already in your Memory Deck`);
          return prev;
        }
        const next: MemoryVerseCard[] = [
          {
            id: `mem-${Date.now()}`,
            bookNumber,
            chapter,
            verse: sorted[0],
            verseEnd: sorted.length > 1 ? sorted[sorted.length - 1] : undefined,
            versionShortName: activeVersion.shortName,
            reference: ref,
            text,
            masteryLevel: 0,
            practiceCount: 0,
            createdAt: Date.now(),
          },
          ...prev,
        ];
        writeLocal(STORAGE_KEYS.MEMORY_CARDS, next);
        toast.success(`Added ${ref} to Scripture Memory Deck`);
        return next;
      });
    },
    [bookNumber, chapter, activeVersion]
  );

  const recordMemoryPractice = useCallback((id: string, masteredUp: boolean) => {
    setMemoryCards((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const nextLevel = masteredUp
          ? (Math.min(4, c.masteryLevel + 1) as 0 | 1 | 2 | 3 | 4)
          : (Math.max(0, c.masteryLevel - 1) as 0 | 1 | 2 | 3 | 4);
        return {
          ...c,
          masteryLevel: nextLevel,
          practiceCount: c.practiceCount + 1,
          lastPracticedAt: Date.now(),
        };
      });
      writeLocal(STORAGE_KEYS.MEMORY_CARDS, next);
      return next;
    });
  }, []);

  const deleteMemoryCard = useCallback((id: string) => {
    setMemoryCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeLocal(STORAGE_KEYS.MEMORY_CARDS, next);
      return next;
    });
  }, []);

  const startAudioFromVerse = useCallback((verse = 1) => {
    setAudioBarOpen(true);
    setAudioStartRequest({ verse, nonce: Date.now() });
  }, []);

  const reloadChapters = useCallback(() => setReloadTick((t) => t + 1), []);

  const value: BibleAppContextValue = {
    activeSection,
    setActiveSection,
    bookNumber,
    chapter,
    selectedVerses,
    focusedVerse,
    navigateTo,
    toggleVerseSelection,
    clearSelectedVerses,
    nextChapter,
    prevChapter,
    catalog,
    activeVersionId,
    activeVersion,
    setActiveVersionId,
    offlineSummaries,
    isVersionOffline,
    downloadTasks,
    triggerDownloadVersion,
    removeOfflineVersion,
    exportVersionJson,
    importVersionJson,
    primaryChapterData,
    primaryLoading,
    primaryError,
    isPrimaryOfflineInstalled,
    parallelChapterData,
    thirdChapterData,
    reloadChapters,
    prefs,
    updatePrefs,
    highlights,
    setVerseHighlight,
    bookmarks,
    toggleBookmark,
    removeBookmark,
    notes,
    saveNote,
    deleteNote,
    readChapters,
    markChapterRead,
    streakCount,
    allPlans,
    enrollments,
    enrollInPlan,
    unenrollPlan,
    togglePlanDayComplete,
    addCustomPlan,
    activePlanSession,
    setActivePlanSession,
    reflections,
    saveReflection,
    prayers,
    addPrayer,
    togglePrayerAnswered,
    deletePrayer,
    memoryCards,
    addMemoryCard,
    recordMemoryPractice,
    deleteMemoryCard,
    aiPanelOpen,
    setAiPanelOpen,
    audioBarOpen,
    setAudioBarOpen,
    activeAudioVerse,
    setActiveAudioVerse,
    audioStartRequest,
    startAudioFromVerse,
    commandPaletteOpen,
    setCommandPaletteOpen,
    compareDrawerOpen,
    setCompareDrawerOpen,
    verseArtModalOpen,
    setVerseArtModalOpen,
  };

  return (
    <BibleAppContext.Provider value={value}>{children}</BibleAppContext.Provider>
  );
};

export function useBibleApp(): BibleAppContextValue {
  const ctx = useContext(BibleAppContext);
  if (!ctx) {
    throw new Error("useBibleApp must be used inside BibleAppProvider");
  }
  return ctx;
}
