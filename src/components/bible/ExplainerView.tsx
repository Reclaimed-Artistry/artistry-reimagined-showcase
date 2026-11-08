import React from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  CloudDownload,
  Compass,
  Feather,
  Heart,
  HeartHandshake,
  Layers3,
  LoaderCircle,
  Lightbulb,
  MessageCircleHeart,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useBibleApp } from "@/context/useBibleApp";

const FEATURES = [
  { icon: BookOpen, title: "Read at your pace", body: "Open a passage, choose a translation, and make the page comfortable with adjustable type and reading layouts." },
  { icon: Layers3, title: "Compare translations", body: "Place trusted Bible versions side by side and notice how each translation expresses the passage." },
  { icon: CloudDownload, title: "Take Scripture offline", body: "Keep selected Bible translations on your device so your reading can continue without a connection." },
  { icon: Feather, title: "Build a quiet rhythm", body: "Use reflections, reading plans, prayer notes, and saved verses to create a practice that fits real life." },
  { icon: AudioLines, title: "Listen as you read", body: "Use read-along audio and speech tools when listening works better than looking at a screen." },
  { icon: MessageCircleHeart, title: "Explore with care", body: "The optional Selah Bible Companion can help explain context and prompt reflection using local Bible texts and curated notes. It is a study aid, not a substitute for Scripture or trusted pastoral guidance." },
];

const STEPS = [
  ["01", "Choose a place to begin", "Start with a familiar book, a daily reflection, or a short reading plan."],
  ["02", "Make it yours", "Pick a translation, font, and light or dark appearance that feels easy on your eyes."],
  ["03", "Pause and respond", "Save a verse, write a note, pray, or talk about what stood out."],
];

const SUPPORT_AMOUNTS = [500, 1000, 2500, 5000];

type SupportNotice = { kind: "success" | "error" | "info"; message: string };

export const ExplainerView: React.FC = () => {
  const { setActiveSection, prefs, updatePrefs, catalog, offlineSummaries } = useBibleApp();
  const isDark = prefs.theme === "night";
  const [supportAmount, setSupportAmount] = React.useState("1000");
  const [supportEmail, setSupportEmail] = React.useState("");
  const [supportLoading, setSupportLoading] = React.useState(false);
  const [supportNotice, setSupportNotice] = React.useState<SupportNotice | null>(null);
  const setTheme = (theme: "parchment" | "night") => updatePrefs({ theme });

  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("support") !== "return") return;

    const reference = url.searchParams.get("reference");
    url.searchParams.delete("support");
    url.searchParams.delete("reference");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    if (!reference) {
      setSupportNotice({ kind: "info", message: "We didn’t receive a payment reference. No payment was confirmed." });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
        const result = (await response.json()) as { paid?: boolean; error?: string; amount?: number };
        if (cancelled) return;
        if (response.ok && result.paid) {
          const amount = typeof result.amount === "number"
            ? ` Your ₦${result.amount.toLocaleString("en-NG")} gift was received.`
            : " Your gift was received.";
          setSupportNotice({ kind: "success", message: `Thank you for helping Selah grow.${amount}` });
        } else {
          setSupportNotice({ kind: "info", message: result.error || "We couldn’t confirm a completed payment. If you were charged, please contact us so we can help." });
        }
      } catch {
        if (!cancelled) {
          setSupportNotice({ kind: "info", message: "We couldn’t verify the payment just now. If you were charged, please contact us so we can help." });
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSupportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupportNotice(null);

    const amount = Number(supportAmount);
    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 1_000_000) {
      setSupportNotice({ kind: "error", message: "Please choose an amount between ₦100 and ₦1,000,000." });
      return;
    }

    setSupportLoading(true);
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, email: supportEmail }),
      });
      const result = (await response.json()) as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error || "We couldn’t open Paystack checkout. Please try again.");
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setSupportNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "We couldn’t open Paystack checkout. Please try again.",
      });
      setSupportLoading(false);
    }
  };

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
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }, index) => <article key={title} className="group h-full rounded-3xl border border-border/80 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-6"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${index % 2 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{body}</p></article>)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Start in three small steps</p><h2 className="mt-2 font-display text-3xl font-semibold">No perfect routine required.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A few minutes of attentive reading can be a good beginning. Let the tools support you, not rush you.</p></div>
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-3">{STEPS.map(([number, title, description]) => <div key={number} className="h-full rounded-2xl bg-muted/60 p-4"><span className="font-mono text-xs font-bold text-primary">{number}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p></div>)}</div>
        </div>
      </section>

      <section className="grid auto-rows-fr gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-border bg-card p-5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-300"><BookOpen className="h-5 w-5" /></span><p className="mt-4 text-2xl font-semibold">{catalog.length.toLocaleString()}+</p><p className="text-xs font-semibold">translations in the catalog</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Browse the vault and download versions for offline reading where available.</p><button type="button" onClick={() => setActiveSection("versions")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Explore the vault <ArrowRight className="h-3.5 w-3.5" /></button></article>
        <article className="rounded-3xl border border-border bg-card p-5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span><p className="mt-4 text-2xl font-semibold">{offlineSummaries.length || 2}</p><p className="text-xs font-semibold">Bibles available offline</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Your notes, bookmarks, and reading progress stay on this device. Downloaded text is stored locally too.</p><button type="button" onClick={() => setActiveSection("versions")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Manage downloads <ArrowRight className="h-3.5 w-3.5" /></button></article>
        <article className="rounded-3xl border border-amber-200/70 bg-amber-50/70 p-5 dark:border-amber-100/10 dark:bg-amber-200/5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-200"><HeartHandshake className="h-5 w-5" /></span><p className="mt-4 text-lg font-semibold">Reading with a child?</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Try short, gentle story retellings with a big idea, a question to talk through, and a simple activity.</p><button type="button" onClick={() => setActiveSection("kids")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-200">Visit the storybook <ArrowRight className="h-3.5 w-3.5" /></button></article>
      </section>

      <section className="grid items-center gap-6 rounded-[2rem] border border-primary/15 bg-primary/5 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><Lightbulb className="h-4 w-4" /> A gentle reminder</div><p className="mt-3 max-w-3xl font-scripture text-lg leading-8 text-foreground/90">Selah means to pause and reflect. Use the app in a way that helps you listen, learn, and love your neighbor. No streak or feature matters more than that.</p></div>
        <button type="button" onClick={() => setActiveSection("reflection")} className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-card px-5 py-3 text-sm font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent"><Check className="h-4 w-4 text-primary" /> Take a quiet moment</button>
      </section>

      <section aria-labelledby="developer-heading" className="overflow-hidden rounded-[2rem] border border-border/80 bg-card p-5 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">The heart behind Selah</p>
          <h2 id="developer-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">About the Developer</h2>
        </div>
        <div className="grid items-start gap-7 md:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] md:gap-10">
          <img
            src="/images/victor-inyang.jpg"
            alt="Victor Inyang, developer of Selah Multi Versions Bible"
            className="mx-auto aspect-[4/5] w-full max-w-sm rounded-[1.5rem] object-cover object-center shadow-md md:mx-0"
            loading="lazy"
          />
          <div className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>My name is Victor Inyang, and I am a lover of God&apos;s Word with a deep passion for making the Scriptures more accessible, understandable, and meaningful to everyone who desires to grow in their knowledge of God.</p>
            <p>My love for the Word of God goes beyond simply reading the Scriptures; I have a genuine desire to see people understand, internalise, and live by the truths contained in them. I believe that studying the Bible should not only be an exercise in reading words but an opportunity to encounter truth, gain understanding, develop spiritual maturity, and experience transformation.</p>
            <p>This conviction inspired the creation of Selah Multi Versions Bible.</p>
            <p>I believe that one of the greatest gifts anyone can have is the ability to understand God&apos;s Word with clarity. Different Bible translations offer different perspectives on the same divine truth, and having access to multiple versions can make studying, comparing, interpreting, and assimilating Scripture much easier.</p>
            <p>My vision is to make Bible study a more enriching and rewarding experience, helping readers move beyond familiarity with Scripture into deeper understanding and practical application.</p>
            <p>Selah represents a moment to pause, reflect, and consider. It is a reminder that God&apos;s Word deserves more than a hurried reading; it deserves thoughtful meditation, understanding, and application.</p>
            <p>My prayer is that this platform will inspire a deeper hunger for God&apos;s Word, encourage consistent Bible study, and help everyone who uses it grow in wisdom, faith, and intimacy with God.</p>
            <p>The goal is simple: not just to help people read the Word, but to make it easier for them to understand, assimilate, and live it.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="support-heading" className="relative isolate overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-[#17251f] to-slate-900 p-6 text-white shadow-[0_30px_90px_-44px_rgba(19,31,25,.7)] sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-100"><Heart className="h-3.5 w-3.5" /> Help this work continue</div>
            <h2 id="support-heading" className="mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Help keep a quiet place for Scripture alive.</h2>
            <div className="mt-4 max-w-2xl space-y-3 text-sm leading-7 text-white/75">
              <p>Maybe Selah has met you in a small moment: a verse before the day began, a question shared with a child, or a pause when you needed room to breathe. If this space has helped you or someone you love draw closer to Scripture, you can help us tend it for the next reader.</p>
              <p>Your gift, in any amount, helps sustain the work behind Selah and its thoughtful tools. Giving is completely optional; every feature remains free, and there is never any pressure to give.</p>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-100/80"><ShieldCheck className="h-4 w-4 shrink-0" /> Secure checkout is handled by Paystack. Your card details never reach Selah.</p>
          </div>

          <form onSubmit={handleSupportSubmit} className="rounded-3xl border border-white/15 bg-white/[.08] p-5 backdrop-blur-sm sm:p-6">
            <label className="text-xs font-semibold text-white/90" htmlFor="support-amount">Choose a one-time gift (NGN)</label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SUPPORT_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={supportAmount === String(amount)}
                  onClick={() => setSupportAmount(String(amount))}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${supportAmount === String(amount) ? "border-amber-200 bg-amber-200 text-stone-950" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}`}
                >
                  ₦{amount.toLocaleString("en-NG")}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex items-center rounded-xl border border-white/15 bg-slate-950/30 focus-within:border-amber-200/70">
                <span className="pl-3 text-sm text-white/60">₦</span>
                <input
                  id="support-amount"
                  type="number"
                  min="100"
                  max="1000000"
                  step="100"
                  inputMode="numeric"
                  required
                  value={supportAmount}
                  onChange={(event) => setSupportAmount(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-white/40"
                  aria-label="Gift amount in naira"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-white/50">Choose an amount above or enter a custom amount (₦100–₦1,000,000).</p>
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold text-white/90" htmlFor="support-email">Email for your receipt</label>
              <input
                id="support-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-amber-200/70"
              />
            </div>
            <button
              type="submit"
              disabled={supportLoading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-200 px-5 py-3.5 text-sm font-semibold text-stone-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70"
            >
              {supportLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Opening secure checkout…</> : <>Support Selah with ₦{(Number(supportAmount) || 0).toLocaleString("en-NG")} <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="mt-3 text-center text-[10px] leading-5 text-white/50">One-time contribution · No account required · Powered by Paystack</p>
            {supportNotice && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-4 rounded-xl px-3 py-2.5 text-xs leading-5 ${supportNotice.kind === "success" ? "bg-emerald-300/15 text-emerald-100" : supportNotice.kind === "error" ? "bg-rose-300/15 text-rose-100" : "bg-white/10 text-white/80"}`}
              >
                {supportNotice.message}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
};
