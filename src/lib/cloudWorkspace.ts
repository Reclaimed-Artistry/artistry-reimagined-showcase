import { createClient } from "@supabase/supabase-js";
import type {
  DailyReflectionEntry,
  MemoryVerseCard,
  PrayerJournalItem,
  ReadingPlanDefinition,
  UserPlanEnrollment,
  VerseBookmark,
  VerseHighlight,
  VerseNote,
} from "@/types/bible";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const cloudSyncConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = cloudSyncConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

export interface StudySnapshot {
  version: 1;
  bookmarks: VerseBookmark[];
  highlights: Record<string, VerseHighlight>;
  notes: VerseNote[];
  readChapters: string[];
  streakDates: string[];
  enrollments: UserPlanEnrollment[];
  customPlans: ReadingPlanDefinition[];
  reflections: DailyReflectionEntry[];
  prayers: PrayerJournalItem[];
  memoryCards: MemoryVerseCard[];
  deletedItems: Record<string, number>;
}

export const EMPTY_STUDY_SNAPSHOT: StudySnapshot = {
  version: 1,
  bookmarks: [],
  highlights: {},
  notes: [],
  readChapters: [],
  streakDates: [],
  enrollments: [],
  customPlans: [],
  reflections: [],
  prayers: [],
  memoryCards: [],
  deletedItems: {},
};

function mergeById<T extends { id: string; updatedAt?: number; createdAt?: number }>(
  local: T[],
  remote: T[]
): T[] {
  const items = new Map<string, T>();
  for (const item of [...remote, ...local]) {
    const prior = items.get(item.id);
    const itemTime = item.updatedAt || item.createdAt || 0;
    const priorTime = prior?.updatedAt || prior?.createdAt || 0;
    if (!prior || itemTime >= priorTime) items.set(item.id, item);
  }
  return Array.from(items.values()).sort(
    (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );
}

export function mergeStudySnapshots(
  local: StudySnapshot,
  remote: Partial<StudySnapshot> | null | undefined
): StudySnapshot {
  const cloud = { ...EMPTY_STUDY_SNAPSHOT, ...(remote || {}) };
  const highlights = { ...cloud.highlights };
  for (const [key, item] of Object.entries(local.highlights)) {
    if (!highlights[key] || item.updatedAt >= highlights[key].updatedAt) highlights[key] = item;
  }
  const deletedItems = { ...cloud.deletedItems };
  for (const [key, deletedAt] of Object.entries(local.deletedItems || {})) {
    deletedItems[key] = Math.max(deletedItems[key] || 0, deletedAt);
  }
  const isNotDeleted = (kind: string, id: string, timestamp: number) =>
    (deletedItems[`${kind}:${id}`] || 0) < timestamp;
  for (const [key, highlight] of Object.entries(highlights)) {
    if (!isNotDeleted("highlight", key, highlight.updatedAt)) delete highlights[key];
  }

  const enrollments = new Map(cloud.enrollments.map((entry) => [entry.planId, entry]));
  for (const localEntry of local.enrollments) {
    const remoteEntry = enrollments.get(localEntry.planId);
    enrollments.set(localEntry.planId, remoteEntry
      ? {
          planId: localEntry.planId,
          startedAt: Math.min(localEntry.startedAt, remoteEntry.startedAt),
          completedDays: Array.from(new Set([...remoteEntry.completedDays, ...localEntry.completedDays])).sort((a, b) => a - b),
          lastReadDay: Math.max(localEntry.lastReadDay, remoteEntry.lastReadDay),
        }
      : localEntry);
  }

  return {
    version: 1,
    bookmarks: mergeById(local.bookmarks, cloud.bookmarks).filter((item) =>
      isNotDeleted("bookmark", item.id, item.createdAt)
    ),
    highlights,
    notes: mergeById(local.notes, cloud.notes).filter((item) =>
      isNotDeleted("note", item.id, item.updatedAt || item.createdAt)
    ),
    readChapters: Array.from(new Set([...cloud.readChapters, ...local.readChapters])),
    streakDates: Array.from(new Set([...cloud.streakDates, ...local.streakDates])).sort(),
    enrollments: Array.from(enrollments.values()),
    customPlans: mergeById(local.customPlans, cloud.customPlans),
    reflections: mergeById(local.reflections, cloud.reflections),
    prayers: mergeById(local.prayers, cloud.prayers).filter((item) =>
      isNotDeleted("prayer", item.id, item.createdAt)
    ),
    memoryCards: mergeById(local.memoryCards, cloud.memoryCards).filter((item) =>
      isNotDeleted("memory", item.id, item.lastPracticedAt || item.createdAt)
    ),
    deletedItems,
  };
}

export function isValidStudySnapshot(value: unknown): value is Partial<StudySnapshot> {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return ["bookmarks", "highlights", "notes", "readChapters", "streakDates", "enrollments", "customPlans", "reflections", "prayers", "memoryCards", "deletedItems"]
    .every((key) => data[key] === undefined || (["highlights", "deletedItems"].includes(key)
      ? Boolean(data[key]) && typeof data[key] === "object" && !Array.isArray(data[key])
      : Array.isArray(data[key])));
}
