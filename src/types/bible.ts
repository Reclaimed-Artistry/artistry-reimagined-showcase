export type BibleProviderType = "bundled" | "cdn" | "bolls" | "helloao" | "custom" | "external";

export interface BibleVersionMeta {
  id: string;
  shortName: string;
  name: string;
  language: string;
  languageCode: string;
  textDirection: "ltr" | "rtl";
  provider: BibleProviderType;
  providerSlug: string;
  estimatedSizeMB: number;
  description?: string;
  regionTag?: string;
  hasStudioAudio?: boolean;
  hasRedLetter?: boolean;
  hasFootnotes?: boolean;
  licenseNotice?: string;
  licenseUrl?: string;
  /** Official third-party reader for editions that cannot be redistributed in-app. */
  sourceUrl?: string;
  featured?: boolean;
}

export interface NormalizedFootnote {
  caller: string;
  text: string;
}

export interface NormalizedVerse {
  verse: number;
  text: string;
  redLetterRanges?: { start: number; end: number }[];
  footnotes?: NormalizedFootnote[];
}

export interface NormalizedHeading {
  beforeVerse: number;
  text: string;
}

export interface NormalizedChapter {
  chapter: number;
  headings?: NormalizedHeading[];
  verses: NormalizedVerse[];
  audioLinks?: Record<string, string>;
  audioTimings?: Record<string, number[]>;
}

export interface NormalizedBook {
  bookNumber: number; // 1..66 canonical order
  usfm: string;
  name: string;
  chapters: NormalizedChapter[];
}

export interface NormalizedBible {
  versionId: string;
  shortName: string;
  name: string;
  language: string;
  textDirection: "ltr" | "rtl";
  downloadedAt: number;
  sizeBytes: number;
  books: NormalizedBook[];
}

export interface OfflineBibleSummary {
  versionId: string;
  shortName: string;
  name: string;
  language: string;
  downloadedAt: number;
  sizeBytes: number;
  bookCount: number;
}

export interface VersionDownloadProgress {
  versionId: string;
  progress: number; // 0..100
  downloadedMB: number;
  totalMB?: number;
  phase: "connecting" | "downloading" | "indexing" | "saving" | "done" | "error";
  errorMessage?: string;
}

export type HighlightColor = "amber" | "sage" | "sky" | "rose" | "lavender" | "terracotta";

export interface VerseHighlight {
  key: string; // `${bookNumber}:${chapter}:${verse}`
  bookNumber: number;
  chapter: number;
  verse: number;
  color: HighlightColor;
  updatedAt: number;
}

export interface VerseBookmark {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  versionId: string;
  versionShortName: string;
  textSnippet: string;
  label?: string;
  createdAt: number;
}

export interface VerseNote {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  verseEnd?: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ReadingPassageRange {
  bookNumber: number;
  startChapter: number;
  endChapter: number;
}

export interface ReadingPlanDay {
  day: number;
  title: string;
  reflectionPrompt: string;
  passages: ReadingPassageRange[];
}

export interface ReadingPlanDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: "Whole Bible" | "New Testament" | "Gospels" | "Wisdom" | "Topical" | "Epistles" | "Custom";
  durationDays: number;
  estimatedMinutesPerDay: number;
  accentColor: string;
  description: string;
  days: ReadingPlanDay[];
  isCustom?: boolean;
}

export interface UserPlanEnrollment {
  planId: string;
  startedAt: number;
  completedDays: number[];
  lastReadDay: number;
}

export interface DailyReflectionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  reference: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  mood?: string;
  standoutPhrase: string;
  meditationNotes: string;
  prayerResponse: string;
  dailyIntention: string;
  createdAt: number;
}

export interface PrayerJournalItem {
  id: string;
  title: string;
  details: string;
  scriptureRef?: string;
  category: "Personal" | "Family" | "Gratitude" | "Guidance" | "World" | "Healing";
  answered: boolean;
  createdAt: number;
  answeredAt?: number;
}

export interface MemoryVerseCard {
  id: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  verseEnd?: number;
  versionShortName: string;
  reference: string;
  text: string;
  masteryLevel: 0 | 1 | 2 | 3 | 4;
  practiceCount: number;
  lastPracticedAt?: number;
  createdAt: number;
}

export type ReaderTheme = "parchment" | "sepia" | "night";
export type ReaderFont = "scripture" | "display" | "sans" | "mono";
export type ReaderLayoutMode = "verse" | "paragraph";

export interface AiConnectionSettings {
  mode: "hybrid" | "custom_llm" | "server_llm";
  endpointUrl: string;
  apiKey: string;
  model: string;
}

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  appearanceBackgroundColor: string | null;
  appearanceBackgroundImage: string;
  appearanceImageDarken: number;
  fontSize: number;
  lineHeight: number;
  layoutMode: ReaderLayoutMode;
  showHeadings: boolean;
  showFootnotes: boolean;
  redLetter: boolean;
  parallelVersionId: string | null;
  thirdVersionId: string | null;
  speechRate: number;
  preferredVoiceURI: string;
  autoAdvanceChapter: boolean;
  ambientSound: boolean;
  aiSettings: AiConnectionSettings;
}

export type AppSection =
  | "reader"
  | "versions"
  | "plans"
  | "reflection"
  | "study"
  | "kids"
  | "about";
