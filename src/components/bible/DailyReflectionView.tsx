import React, { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Feather,
  Heart,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
  Wind,
} from "lucide-react";
import { formatReference } from "@/data/canonicalBooks";
import {
  DAILY_DEVOTIONALS,
  getDevotionalForDate,
  HEART_MOOD_COMPASS,
} from "@/data/dailyReflections";
import { getChapterContent } from "@/lib/bibleProviders";
import { useBibleApp } from "@/context/BibleAppContext";
import type { PrayerJournalItem } from "@/types/bible";

export const DailyReflectionView: React.FC = () => {
  const {
    activeVersion,
    navigateTo,
    reflections,
    saveReflection,
    prayers,
    addPrayer,
    togglePrayerAnswered,
    deletePrayer,
  } = useBibleApp();

  const todayIso = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  })();

  const [devotionalIndex, setDevotionalIndex] = useState<number>(() => {
    const initial = getDevotionalForDate(todayIso);
    const idx = DAILY_DEVOTIONALS.findIndex((d) => d.id === initial.id);
    return idx >= 0 ? idx : 0;
  });

  const devotional = DAILY_DEVOTIONALS[devotionalIndex % DAILY_DEVOTIONALS.length];
  const [liveScriptureText, setLiveScriptureText] = useState<string>(devotional.fallbackText);

  // Mood Compass
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [moodVerseText, setMoodVerseText] = useState<string>("");

  // Lectio Divina Journal Form
  const [standoutPhrase, setStandoutPhrase] = useState("");
  const [meditationNotes, setMeditationNotes] = useState("");
  const [prayerResponse, setPrayerResponse] = useState("");
  const [dailyIntention, setDailyIntention] = useState("");

  // Prayer Sanctuary Form
  const [prayerTitle, setPrayerTitle] = useState("");
  const [prayerDetails, setPrayerDetails] = useState("");
  const [prayerCategory, setPrayerCategory] =
    useState<PrayerJournalItem["category"]>("Personal");

  // Load Today's Devotional Scripture in user's active Bible version!
  useEffect(() => {
    let cancelled = false;
    setLiveScriptureText(devotional.fallbackText);
    getChapterContent(activeVersion, devotional.bookNumber, devotional.chapter)
      .then(({ chapterData }) => {
        if (cancelled) return;
        const end = devotional.verseEnd || devotional.verse;
        const matched = chapterData.verses
          .filter((v) => v.verse >= devotional.verse && v.verse <= end)
          .map((v) => v.text)
          .join(" ");
        if (matched) setLiveScriptureText(matched);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [devotional, activeVersion]);

  // Load Mood Compass verse in active Bible version!
  useEffect(() => {
    if (!selectedMoodId) return;
    const mood = HEART_MOOD_COMPASS.find((m) => m.id === selectedMoodId);
    if (!mood) return;
    let cancelled = false;
    getChapterContent(activeVersion, mood.bookNumber, mood.chapter)
      .then(({ chapterData }) => {
        if (cancelled) return;
        const end = mood.verseEnd || mood.verse;
        const text = chapterData.verses
          .filter((v) => v.verse >= mood.verse && v.verse <= end)
          .map((v) => v.text)
          .join(" ");
        setMoodVerseText(text);
      })
      .catch(() => setMoodVerseText(""));
    return () => {
      cancelled = true;
    };
  }, [selectedMoodId, activeVersion]);

  const devotionalRef = formatReference(
    devotional.bookNumber,
    devotional.chapter,
    devotional.verse,
    devotional.verseEnd
  );

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standoutPhrase.trim() && !meditationNotes.trim() && !prayerResponse.trim()) return;
    saveReflection({
      date: todayIso,
      reference: devotionalRef,
      bookNumber: devotional.bookNumber,
      chapter: devotional.chapter,
      verse: devotional.verse,
      mood: selectedMoodId || undefined,
      standoutPhrase: standoutPhrase.trim(),
      meditationNotes: meditationNotes.trim(),
      prayerResponse: prayerResponse.trim(),
      dailyIntention: dailyIntention.trim(),
    });
    setStandoutPhrase("");
    setMeditationNotes("");
    setPrayerResponse("");
    setDailyIntention("");
  };

  const handleAddPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerTitle.trim()) return;
    addPrayer({
      title: prayerTitle.trim(),
      details: prayerDetails.trim(),
      category: prayerCategory,
      scriptureRef: devotionalRef,
    });
    setPrayerTitle("");
    setPrayerDetails("");
  };

  const renderMoodIcon = (name: string) => {
    switch (name) {
      case "Wind":
        return <Wind className="h-3.5 w-3.5" />;
      case "Sun":
        return <Sun className="h-3.5 w-3.5" />;
      case "Moon":
        return <Moon className="h-3.5 w-3.5" />;
      case "Compass":
        return <Compass className="h-3.5 w-3.5" />;
      case "Heart":
        return <Heart className="h-3.5 w-3.5" />;
      default:
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  const selectedMood = HEART_MOOD_COMPASS.find((m) => m.id === selectedMoodId);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-28 pt-8 sm:px-8">
      {/* Daily Devotional & Verse Sanctuary Card */}
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            <Feather className="h-3.5 w-3.5" />
            Daily Bible Reflection • {devotional.themeBadge}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDevotionalIndex((i) => (i + 1) % DAILY_DEVOTIONALS.length)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
              title="Explore another daily reflection"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              Another Reflection
            </button>
            <button
              type="button"
              onClick={() =>
                navigateTo(devotional.bookNumber, devotional.chapter, devotional.verse)
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Open Full Chapter
            </button>
          </div>
        </div>

        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {devotional.title}
        </h1>

        <blockquote className="mt-5 rounded-2xl border-l-4 border-primary bg-primary/6 p-5 font-scripture text-lg italic leading-relaxed text-foreground sm:text-xl">
          “{liveScriptureText}”
          <footer className="mt-2 font-sans text-xs font-bold not-italic uppercase tracking-wider text-primary">
            — {devotionalRef} ({activeVersion.shortName})
          </footer>
        </blockquote>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
          <p>{devotional.meditation}</p>

          <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Breath Prayer • Inhale
              </div>
              <div className="mt-0.5 font-scripture text-base italic">
                “{devotional.breathPrayer.inhale}”
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Breath Prayer • Exhale
              </div>
              <div className="mt-0.5 font-scripture text-base italic">
                “{devotional.breathPrayer.exhale}”
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Heart Mood Compass */}
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="font-display text-2xl font-bold text-foreground">
          How Is Your Heart Arriving Today?
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select what you&apos;re feeling right now to receive a tailored Scripture anchor in{" "}
          <strong>{activeVersion.shortName}</strong>.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {HEART_MOOD_COMPASS.map((m) => {
            const active = selectedMoodId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMoodId(active ? null : m.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent"
                }`}
              >
                {renderMoodIcon(m.iconName)}
                {m.label}
              </button>
            );
          })}
        </div>

        {selectedMood && (
          <div className="mt-4 animate-fade-in rounded-2xl border border-primary/30 bg-primary/8 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-primary">
                {formatReference(
                  selectedMood.bookNumber,
                  selectedMood.chapter,
                  selectedMood.verse,
                  selectedMood.verseEnd
                )}{" "}
                ({activeVersion.shortName})
              </span>
              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    selectedMood.bookNumber,
                    selectedMood.chapter,
                    selectedMood.verse
                  )
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                Read in Context →
              </button>
            </div>
            {moodVerseText && (
              <p className="mt-2 font-scripture text-base italic text-foreground">
                “{moodVerseText}”
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{selectedMood.encouragement}</p>
          </div>
        )}
      </section>

      {/* Two-Column: 4-Step Lectio Divina Journal + Prayer Sanctuary */}
      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSaveReflection}
          className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-7"
        >
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Guided 4-Step *Lectio Divina* Reflection
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {devotional.lectioQuestion}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              1. *Lectio* (Read) — Which single word or phrase stood out most?
            </label>
            <input
              type="text"
              value={standoutPhrase}
              onChange={(e) => setStandoutPhrase(e.target.value)}
              placeholder="e.g. “His compassions never fail”..."
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              2. *Meditatio* (Reflect) — How does this word intersect your life today?
            </label>
            <textarea
              rows={3}
              value={meditationNotes}
              onChange={(e) => setMeditationNotes(e.target.value)}
              placeholder="Write freely and honestly..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              3. *Oratio* (Respond in Prayer)
            </label>
            <textarea
              rows={2}
              value={prayerResponse}
              onChange={(e) => setPrayerResponse(e.target.value)}
              placeholder={devotional.prayerStarter}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              4. *Contemplatio* — One gentle intention to live out today
            </label>
            <input
              type="text"
              value={dailyIntention}
              onChange={(e) => setDailyIntention(e.target.value)}
              placeholder="e.g. Pause for 30 seconds before replying in stressful moments"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            Save Today&apos;s Reflection Entry
          </button>

          {reflections.length > 0 && (
            <div className="space-y-2.5 border-t border-border/70 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Reflection Entries ({reflections.length})
              </div>
              {reflections.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-primary">
                    <span>{r.reference}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.date}
                    </span>
                  </div>
                  {r.standoutPhrase && (
                    <p className="mt-1 font-scripture italic text-foreground">
                      “{r.standoutPhrase}”
                    </p>
                  )}
                  {r.meditationNotes && (
                    <p className="mt-1 text-muted-foreground">{r.meditationNotes}</p>
                  )}
                  {r.dailyIntention && (
                    <p className="mt-1 font-medium text-foreground/85">
                      Intention: {r.dailyIntention}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Prayer Sanctuary Wall */}
        <div className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Prayer Sanctuary
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Keep a living record of petitions, people you&apos;re carrying, and answered prayers.
            </p>
          </div>

          <form onSubmit={handleAddPrayer} className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={prayerTitle}
                onChange={(e) => setPrayerTitle(e.target.value)}
                placeholder="Prayer focus or person's name..."
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <select
                value={prayerCategory}
                onChange={(e) =>
                  setPrayerCategory(e.target.value as PrayerJournalItem["category"])
                }
                className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs"
              >
                {["Personal", "Family", "Gratitude", "Guidance", "Healing", "World"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
            <textarea
              rows={2}
              value={prayerDetails}
              onChange={(e) => setPrayerDetails(e.target.value)}
              placeholder="Details or Scripture promise you're praying over this..."
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/12 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Prayer Request
            </button>
          </form>

          <div className="max-h-96 space-y-2 overflow-y-auto pt-2">
            {prayers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Your personal prayer list is quiet. Add your first prayer request above.
              </p>
            ) : (
              prayers.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-3 text-xs transition ${
                    p.answered
                      ? "border-emerald-500/30 bg-emerald-500/8"
                      : "border-border/70 bg-background/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => togglePrayerAnswered(p.id)}
                        className={`mt-0.5 rounded-full p-0.5 ${
                          p.answered
                            ? "text-emerald-600"
                            : "text-muted-foreground hover:text-primary"
                        }`}
                        title="Toggle Answered Prayer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <div>
                        <div className="font-semibold text-foreground">
                          {p.title}{" "}
                          <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {p.category}
                          </span>
                        </div>
                        {p.details && (
                          <p className="mt-1 text-muted-foreground">{p.details}</p>
                        )}
                        {p.answered && (
                          <span className="mt-1 inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            Praise Report • Answered Prayer
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deletePrayer(p.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
