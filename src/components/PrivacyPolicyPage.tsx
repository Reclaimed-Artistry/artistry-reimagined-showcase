import React from "react";

const sections = [
  {
    title: "Information stored on your device",
    body: "Selah stores preferences, reading position, bookmarks, notes, highlights, plans, and downloaded Bible text in your browser or device storage so the app can work offline. This information stays on that device unless you choose an optional cloud feature. You can remove downloaded editions in the Vault or clear Selah site data in your browser or device settings.",
  },
  {
    title: "Optional cloud features",
    body: "If you create or sign in to a Selah account for Sync & Groups, Supabase processes your account email and the study snapshot and group information needed to provide those features. Cloud sync is optional; the app remains usable without signing in. Shared reading-group progress is visible to members of that group.",
  },
  {
    title: "Advertising and Google AdSense",
    body: "Selah may show a clearly identified display advertisement on the Home screen. The app requests an ad only when a configured AdSense slot exists and the configured IAB TCF consent-management platform reports consent for device storage (Purpose 1) and Google (vendor 755). If the consent platform is unavailable or consent is not granted, Selah does not load the AdSense script or request the ad. Google may use cookies or similar technologies to serve, measure, and protect advertising, subject to your consent, Google’s policies, and your Google ad settings. Selah’s app code does not place ad units in the Bible reader, Bible Companion, or Kids Storybook. Auto ads must remain disabled in the AdSense account to preserve that placement limit.",
  },
  {
    title: "Other services you choose to use",
    body: "Google Fonts is used to display the app’s typography. If you choose to make a contribution, Paystack handles checkout and payment details; Selah does not receive your card number. Bible-provider requests may be made when you browse or download editions that are not bundled with the app. If you enable device reminders, a push subscription and reminder schedule are sent to the push service so it can deliver them; you can turn reminders off in Selah and revoke notification permission in device settings. Selah Bible Companion performs its retrieval locally and does not send prompts to a hosted AI provider. These third-party services process information under their own privacy notices.",
  },
  {
    title: "Your choices and consent",
    body: "You can decline or withdraw advertising consent in the consent message/settings provided by the configured CMP. You can also manage Google’s ad-personalization settings at myadcenter.google.com. Withdrawing consent prevents future ad requests from Selah; it does not undo processing that already occurred while consent was active. You may use local reading features without accepting advertising consent.",
  },
  {
    title: "Children and family content",
    body: "The Kids Storybook contains family-oriented content. Selah’s manual ad placement is outside that section. The publisher must keep AdSense Auto ads disabled to prevent ads there and assess any child-directed or age-related requirements that apply to its audience and account.",
  },
];

export const PrivacyPolicyPage: React.FC = () => {
  React.useEffect(() => {
    document.title = "Privacy & Advertising | Selah Bible";
    return () => { document.title = "Selah Bible — Read, Reflect & Study"; };
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <a href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">← Back to Selah</a>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-primary">Selah Bible</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Privacy &amp; advertising</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">This notice explains how Selah handles information when you use the web app. Features and third-party services may change; this page will be updated when they do.</p>
        <div className="mt-8 space-y-7">
          {sections.map(({ title, body }) => {
            const headingId = `privacy-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return (
              <section key={title} aria-labelledby={headingId}>
                <h2 id={headingId} className="font-display text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
              </section>
            );
          })}
        </div>
        <section className="mt-8 rounded-2xl border border-border bg-card p-5" aria-labelledby="third-party-notices">
          <h2 id="third-party-notices" className="font-display text-lg font-semibold">Third-party notices</h2>
          <ul className="mt-3 space-y-2 text-sm text-primary underline decoration-primary/30 underline-offset-4">
            <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a></li>
            <li><a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">How Google uses information from sites or apps that use its services</a></li>
            <li><a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google My Ad Center</a></li>
            <li><a href="https://paystack.com/privacy" target="_blank" rel="noreferrer">Paystack Privacy Notice</a></li>
          </ul>
        </section>
        <p className="mt-8 text-xs leading-5 text-muted-foreground">For privacy questions, use the project’s <a className="text-primary underline underline-offset-4" href="https://github.com/Reclaimed-Artistry/artistry-reimagined-showcase/issues" target="_blank" rel="noreferrer">GitHub contact page</a>. Please do not post private account, payment, or reading information in a public issue.</p>
      </article>
    </main>
  );
};
