import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CANONICAL_BOOKS } from "@/data/canonicalBooks";
import {
  buildCustomReadingPlan,
  formatPassageRangeLabel,
} from "@/data/readingPlans";
import { useBibleApp } from "@/context/BibleAppContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReadingPlanDefinition } from "@/types/bible";

export const ReadingPlansView: React.FC = () => {
  const {
    allPlans,
    enrollments,
    enrollInPlan,
    unenrollPlan,
    togglePlanDayComplete,
    addCustomPlan,
    navigateTo,
    setActivePlanSession,
    streakCount,
  } = useBibleApp();

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    enrollments[0]?.planId || allPlans[0]?.id || "gospels-30"
  );
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("My Book of John & Psalms Journey");
  const [customDuration, setCustomDuration] = useState<number>(21);
  const [customBooks, setCustomBooks] = useState<number[]>([43, 50]);

  const selectedPlan: ReadingPlanDefinition = useMemo(
    () => allPlans.find((p) => p.id === selectedPlanId) || allPlans[0],
    [allPlans, selectedPlanId]
  );

  const selectedEnrollment = useMemo(
    () => enrollments.find((e) => e.planId === selectedPlan.id) || null,
    [enrollments, selectedPlan]
  );

  const nextIncompleteDay = useMemo(() => {
    if (!selectedPlan) return 1;
    const done = new Set(selectedEnrollment?.completedDays || []);
    const found = selectedPlan.days.find((d) => !done.has(d.day));
    return found ? found.day : selectedPlan.durationDays;
  }, [selectedPlan, selectedEnrollment]);

  const handleLaunchDayInReader = (plan: ReadingPlanDefinition, dayNum: number) => {
    const dayObj = plan.days.find((d) => d.day === dayNum) || plan.days[0];
    if (!enrollments.some((e) => e.planId === plan.id)) {
      enrollInPlan(plan.id);
    }
    setActivePlanSession({ planId: plan.id, day: dayObj.day });
    const firstPassage = dayObj.passages[0];
    navigateTo(firstPassage.bookNumber, firstPassage.startChapter);
  };

  const handleCreateCustomPlan = () => {
    if (customBooks.length === 0) return;
    const created = buildCustomReadingPlan({
      title: customTitle,
      bookNumbers: customBooks,
      durationDays: customDuration,
    });
    addCustomPlan(created);
    setSelectedPlanId(created.id);
    setCustomModalOpen(false);
  };

  const toggleBookInCustom = (bNum: number) => {
    setCustomBooks((prev) =>
      prev.includes(bNum) ? prev.filter((x) => x !== bNum) : [...prev, bNum]
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8">
      {/* Hero Banner */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            <Calendar className="h-3.5 w-3.5" />
            Structured Daily Reading Rhythms
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Build a Lifelong Scripture Habit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a curated journey—from 7 days on Peace to the Whole Bible in 365 days—or design
            your own custom reading plan across any books of Scripture.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <Flame className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-display text-2xl font-bold leading-none text-foreground">
                {streakCount} {streakCount === 1 ? "Day" : "Days"}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                Active Streak
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCustomModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Custom Plan
          </button>
        </div>
      </div>

      {/* Main Layout: Left Plan Library + Right Selected Plan Day Schedule */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Plans Column */}
        <div className="space-y-3 lg:col-span-5">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Reading Plans Library ({allPlans.length})
          </h2>

          {allPlans.map((plan) => {
            const enrollment = enrollments.find((e) => e.planId === plan.id);
            const pct = enrollment
              ? Math.round((enrollment.completedDays.length / plan.durationDays) * 100)
              : 0;
            const isSelected = plan.id === selectedPlan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/30"
                    : "border-border/80 bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: plan.accentColor }}
                  >
                    {plan.category} • {plan.durationDays}d
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />~{plan.estimatedMinutesPerDay} min/day
                  </span>
                </div>

                <h3 className="mt-2 font-display text-xl font-bold text-foreground">
                  {plan.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.subtitle}</p>

                {enrollment ? (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-primary">
                        Enrolled • {enrollment.completedDays.length} / {plan.durationDays} days
                      </span>
                      <span className="font-mono">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tap to preview daily schedule</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        enrollInPlan(plan.id);
                        setSelectedPlanId(plan.id);
                      }}
                      className="font-semibold text-primary hover:underline"
                    >
                      Start Plan →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Plan Detailed Schedule */}
        <div className="lg:col-span-7">
          {selectedPlan && (
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                      style={{ backgroundColor: selectedPlan.accentColor }}
                    >
                      {selectedPlan.durationDays} Days
                    </span>
                    {selectedEnrollment && (
                      <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Active Plan
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
                    {selectedPlan.title}
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    {selectedPlan.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLaunchDayInReader(selectedPlan, nextIncompleteDay)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Read Day {nextIncompleteDay} Now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  {selectedEnrollment && (
                    <button
                      type="button"
                      onClick={() => unenrollPlan(selectedPlan.id)}
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:text-destructive"
                      title="Leave plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Day-by-Day Interactive List */}
              <div className="mt-5 max-h-[600px] space-y-2.5 overflow-y-auto pr-1">
                {selectedPlan.days.map((dayItem) => {
                  const isCompleted =
                    selectedEnrollment?.completedDays.includes(dayItem.day) || false;
                  const isNextUp = dayItem.day === nextIncompleteDay && !isCompleted;

                  return (
                    <div
                      key={dayItem.day}
                      className={`rounded-2xl border p-4 transition ${
                        isNextUp
                          ? "border-primary/50 bg-primary/6"
                          : isCompleted
                          ? "border-emerald-500/30 bg-emerald-500/6 opacity-85"
                          : "border-border/70 bg-background/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => togglePlanDayComplete(selectedPlan.id, dayItem.day)}
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                              isCompleted
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-border bg-card hover:border-primary"
                            }`}
                            title="Mark day complete"
                          >
                            {isCompleted && <Check className="h-3.5 w-3.5" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary">
                                DAY {dayItem.day}
                              </span>
                              {isNextUp && (
                                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                                  Today&apos;s Reading
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">
                              {dayItem.title}
                            </h4>
                            <p className="mt-1 text-xs italic text-muted-foreground">
                              “{dayItem.reflectionPrompt}”
                            </p>

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {dayItem.passages.map((p, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleLaunchDayInReader(selectedPlan, dayItem.day)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
                                >
                                  <BookOpen className="h-3 w-3 text-primary" />
                                  {formatPassageRangeLabel(p)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLaunchDayInReader(selectedPlan, dayItem.day)}
                          className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                        >
                          Open →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Plan Creator Modal */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Design a Custom Reading Plan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Plan Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Duration (Days)
                </label>
                <select
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {[7, 14, 21, 30, 45, 60, 90, 180, 365].map((d) => (
                    <option key={d} value={d}>
                      {d} Days
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  Select Books to Include ({customBooks.length} selected)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomBooks([40, 41, 42, 43])}
                    className="font-semibold text-primary hover:underline"
                  >
                    4 Gospels
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomBooks(
                        CANONICAL_BOOKS.filter((b) => b.testament === "NT").map(
                          (b) => b.bookNumber
                        )
                      )
                    }
                    className="font-semibold text-primary hover:underline"
                  >
                    All NT
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomBooks([])}
                    className="text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid max-h-60 grid-cols-3 gap-1.5 overflow-y-auto rounded-xl border border-border bg-muted/30 p-2.5 sm:grid-cols-4">
                {CANONICAL_BOOKS.map((b) => {
                  const active = customBooks.includes(b.bookNumber);
                  return (
                    <button
                      key={b.bookNumber}
                      type="button"
                      onClick={() => toggleBookInCustom(b.bookNumber)}
                      className={`flex items-center justify-between rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border/60 bg-card text-foreground hover:bg-accent"
                      }`}
                    >
                      <span className="truncate">{b.shortName}</span>
                      {active && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setCustomModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={customBooks.length === 0}
              onClick={handleCreateCustomPlan}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Schedule
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
