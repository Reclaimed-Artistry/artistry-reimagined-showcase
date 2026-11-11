import React, { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatReference, getBookMeta } from "@/data/canonicalBooks";
import { getDevotionalForDate } from "@/data/dailyReflections";
import { useBibleApp } from "@/context/useBibleApp";
import type { AppSection } from "@/types/bible";
import { Switch } from "@/components/ui/switch";
import { SelahIcon, type SelahIconName } from "./SelahIcon";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";

type HomeDashboardProps = {
  onSelectSection: (section: AppSection) => void;
  onOpenCompanion: () => void;
};

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const HOME_LINKS: {
  section: AppSection | "companion";
  title: string;
  description: string;
  icon: SelahIconName;
}[] = [
  { section: "reader", title: "Read", description: "Open a passage or pick up where you stopped.", icon: "read" },
  { section: "versions", title: "Bible versions", description: "Find, compare, and manage editions.", icon: "vault" },
  { section: "study", title: "Study", description: "Search Scripture and revisit your notes.", icon: "study" },
  { section: "companion", title: "Bible Companion", description: "Explore a passage with guided study tools.", icon: "companion" },
  { section: "kids", title: "Stories for families", description: "Read a Bible story and talk about it together.", icon: "kids" },
  { section: "plans", title: "Reading plans", description: "Follow a plan or shape one of your own.", icon: "plans" },
  { section: "reflection", title: "Daily reflection", description: "Make a little room for prayer and reflection.", icon: "reflect" },
  { section: "about", title: "About Selah", description: "Learn how Selah works and who made it.", icon: "about" },
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onSelectSection, onOpenCompanion }) => {
  const {
    bookNumber,
    chapter,
    navigateTo,
    prefs,
  } = useBibleApp();
  const dateKey = todayKey();
  const displayDate = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);
  const devotional = useMemo(() => getDevotionalForDate(dateKey), [dateKey]);
  const devotionalReference = formatReference(
    devotional.bookNumber,
    devotional.chapter,
    devotional.verse,
    devotional.verseEnd,
  );
  const verseText = devotional.fallbackText;
  const lastBook = getBookMeta(bookNumber);

  const handleReadVerse = () => {
    navigateTo(devotional.bookNumber, devotional.chapter, devotional.verse, devotional.verseEnd);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-9 px-4 pb-32 pt-7 sm:px-8 sm:pt-9">
      <header className="border-b border-border/80 pb-5">
        <p className="text-xs font-medium text-muted-foreground">{displayDate}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">A moment to pause.</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.45fr_.85fr]">
        <article className="rounded-2xl border border-border bg-card px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="uppercase tracking-[.13em]">Today’s passage</span>
            <span aria-hidden="true" className="text-border">/</span>
            <span className="font-mono text-[11px] text-primary">{devotionalReference}</span>
          </div>
          <blockquote className="mt-6 max-w-3xl font-scripture text-[14px] leading-6 text-foreground">
            “{verseText}”
          </blockquote>
          <button
            type="button"
            onClick={handleReadVerse}
            className="mt-6 inline-flex items-center gap-2 border-b border-primary/40 pb-1 text-sm font-semibold text-primary transition hover:border-primary"
          >
            Read the full passage <ArrowRight className="h-4 w-4" />
          </button>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-border bg-secondary/55 p-6 sm:p-7">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Continue where you left off</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">{lastBook.name} {chapter}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your place is saved on this device.</p>
          </div>
          <button
            type="button"
            onClick={() => onSelectSection("reader")}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Continue reading <ArrowRight className="h-4 w-4" />
          </button>
        </article>
      </section>

      <section aria-labelledby="home-menu-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border/80 pb-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Choose a practice</p>
            <h2 id="home-menu-heading" className="mt-1 font-display text-2xl font-semibold">Explore Selah</h2>
          </div>
          <span className="text-xs text-muted-foreground">Read at your own pace</span>
        </div>
        <div className="grid gap-x-8 md:grid-cols-2">
          {HOME_LINKS.filter((link) => link.section !== "companion" || prefs.showBibleCompanion).map((link) => (
            <button
              key={link.section}
              type="button"
              onClick={() => link.section === "companion" ? onOpenCompanion() : onSelectSection(link.section)}
              className="group flex min-w-0 items-center gap-3 border-b border-border/70 py-4 text-left transition-colors hover:bg-primary/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"><SelahIcon name={link.icon} className="h-7 w-7" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{link.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{link.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      <AdSenseSlot />
    </div>
  );
};
