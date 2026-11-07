import React from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  CloudDownload,
  Compass,
  Feather,
  HeartHandshake,
  Layers3,
  Lightbulb,
  MessageCircleHeart,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useBibleApp } from "@/context/BibleAppContext";

const FEATURES = [
  { icon: BookOpen, title: "Read at your pace", body: "Open a passage, choose a translation, and make the page comfortable with adjustable type and reading layouts." },
  { icon: Layers3, title: "Compare translations", body: "Place trusted Bible versions side by side and notice how each translation expresses the passage." },
  { icon: CloudDownload, title: "Take Scripture offline", body: "Keep selected Bible translations on your device so your reading can continue without a connection." },
  { icon: Feather, title: "Build a quiet rhythm", body: "Use reflections, reading plans, prayer notes, and saved verses to create a practice that fits real life." },
  { icon: AudioLines, title: "Listen as you read", body: "Use read-along audio and speech tools when listening works better than looking at a screen." },
  { icon: MessageCircleHeart, title: "Explore with care", body: "The optional Selah AI companion can help explain context and prompt reflection. It is a study aid, not a substitute for Scripture or trusted pastoral guidance." },
];

const STEPS = [
  ["01", "Choose a place to begin", "Start with a familiar book, a daily reflection, or a short reading plan."],
  ["02", "Make it yours", "Pick a translation, font, and light or dark appearance that feels easy on your eyes."],
  ["03", "Pause and respond", "Save a verse, write a note, pray, or talk about what stood out."],
];

export const ExplainerView: React.FC = () => {
  const { setActiveSection, prefs, updatePrefs, catalog, offlineSummaries } = useBibleApp();
  const isDark = prefs.theme === "night";
  const setTheme = (theme: "parchment" | "night") => updatePrefs({ theme });

  return (
    <div className="explainer-page mx-auto max-w-6xl space-y-9 px-4 pb-32 pt-7 sm:px-8 sm:pt-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#17251f] px-6 py-9 text-white shadow-[0_30px_90px_-44px_rgba(19,31,25,.7)] sm:px-10 sm:py-14 lg:px-14">
        <div className="absolute -right-14 -top-24 -z-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 -z-10 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-100"><Sparkles className="h-3.5 w-3.5" /> A calmer way to spend time in the Word</div>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Make room for <span className="text-amber-200">what matters.</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">Selah is a thoughtful Bible reading companion: a quiet place to read, listen, learn, and reflect—on your own or with the people you love.</p>
            <button type="button" onClick={() => setActiveSection("reader")} className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-stone-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-100">Open today’s reading <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/[.07] p-5 backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/75"><Compass className="h-4 w-4 text-amber-200" /> A simple starting point</div>
            <p className="mt-4 font-scripture text-2xl leading-relaxed sm:text-3xl">“Be still, and know that I am God.”</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/55"><span>Psalm 46:10</span><span>Take a breath · Begin</span></div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Your space, your light</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Choose how the page feels.</h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">Switch between a warm, paper-like reading canvas and a restful dark appearance. Your choice is saved on this device. Prefer the classic sepia tone? It remains available in the reader’s Aa appearance menu.</p>
          <div className="grid max-w-md grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setTheme("parchment")} className={`rounded-2xl border p-4 text-left transition ${!isDark ? "border-amber-500/50 bg-amber-50 text-stone-900 ring-2 ring-amber-500/15 dark:bg-amber-100" : "border-border bg-card hover:border-primary/30"}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-200 text-amber-900"><Sun className="h-4 w-4" /></span><span className="mt-3 block text-sm font-semibold">Warm light</span><span className="mt-1 block text-xs opacity-70">Soft parchment tones</span>
            </button>
            <button type="button" onClick={() => setTheme("night")} className={`rounded-2xl border p-4 text-left transition ${isDark ? "border-indigo-400/40 bg-slate-900 text-white ring-2 ring-indigo-400/15" : "border-border bg-card hover:border-primary/30"}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-200/15 text-indigo-300"><MoonStar className="h-4 w-4" /></span><span className="mt-3 block text-sm font-semibold">Quiet dark</span><span className="mt-1 block text-xs opacity-70">Gentle on evening eyes</span>
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }, index) => <article key={title} className="group rounded-3xl border border-border/80 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-6"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${index % 2 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{body}</p></article>)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Start in three small steps</p><h2 className="mt-2 font-display text-3xl font-semibold">No perfect routine required.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A few minutes of attentive reading can be a good beginning. Let the tools support you, not rush you.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">{STEPS.map(([number, title, description]) => <div key={number} className="rounded-2xl bg-muted/60 p-4"><span className="font-mono text-xs font-bold text-primary">{number}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p></div>)}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-border bg-card p-5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-300"><BookOpen className="h-5 w-5" /></span><p className="mt-4 text-2xl font-semibold">{catalog.length.toLocaleString()}+</p><p className="text-xs font-semibold">translations in the catalog</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Browse the vault and download versions for offline reading where available.</p><button type="button" onClick={() => setActiveSection("versions")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Explore the vault <ArrowRight className="h-3.5 w-3.5" /></button></article>
        <article className="rounded-3xl border border-border bg-card p-5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span><p className="mt-4 text-2xl font-semibold">{offlineSummaries.length || 2}</p><p className="text-xs font-semibold">Bibles available offline</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Your notes, bookmarks, and reading progress stay on this device. Downloaded text is stored locally too.</p><button type="button" onClick={() => setActiveSection("versions")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Manage downloads <ArrowRight className="h-3.5 w-3.5" /></button></article>
        <article className="rounded-3xl border border-amber-200/70 bg-amber-50/70 p-5 dark:border-amber-100/10 dark:bg-amber-200/5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-200"><HeartHandshake className="h-5 w-5" /></span><p className="mt-4 text-lg font-semibold">Reading with a child?</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Try short, gentle story retellings with a big idea, a question to talk through, and a simple activity.</p><button type="button" onClick={() => setActiveSection("kids")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-200">Visit the storybook <ArrowRight className="h-3.5 w-3.5" /></button></article>
      </section>

      <section className="grid items-center gap-6 rounded-[2rem] border border-primary/15 bg-primary/5 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><Lightbulb className="h-4 w-4" /> A gentle reminder</div><p className="mt-3 max-w-3xl font-scripture text-lg leading-8 text-foreground/90">Selah means to pause and reflect. Use the app in a way that helps you listen, learn, and love your neighbor. No streak or feature matters more than that.</p></div>
        <button type="button" onClick={() => setActiveSection("reflection")} className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-card px-5 py-3 text-sm font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent"><Check className="h-4 w-4 text-primary" /> Take a quiet moment</button>
      </section>
    </div>
  );
};
