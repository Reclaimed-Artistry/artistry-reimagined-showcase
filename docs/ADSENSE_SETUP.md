# AdSense setup and policy safeguards

Selah uses the publisher ID `ca-pub-8913201913917754`. The repository now publishes `/ads.txt` for that publisher. The app no longer loads AdSense globally: it requests one labeled manual display unit on Home only, after a TCF consent signal allows storage (Purpose 1) and Google (vendor 755). It does not render an ad unit on Reader, Bible Companion, Kids Storybook, or About.

## Required account-side steps

1. In AdSense, confirm that `selah-bible-alpha.vercel.app` is added and approved as a site for this publisher ID.
2. In **Privacy & messaging**, configure and publish a Google-certified TCF CMP for visitors in the EEA, UK, and Switzerland, and configure any required US-state privacy messages. Install the exact CMP snippet supplied by AdSense in `index.html`. Do not replace it with a home-grown consent banner or a guessed script URL.
3. Keep **Auto ads disabled** for Selah. The site is a single-page Bible app with reading, study, and child/family sections; account-level Auto ads could place ads on those views despite the manual placement limit in the app.
4. Create and approve a responsive display ad unit intended for the Home screen. Set its numeric ad-slot ID as the Vercel Production environment variable `VITE_ADSENSE_HOME_SLOT_ID`, then redeploy. No slot ID is committed to source. Until this is set and the CMP emits the required consent signal, the app makes no AdSense request and shows no ad.
5. Confirm `https://selah-bible-alpha.vercel.app/ads.txt` returns the published file, then check the site's AdSense policy center and ads.txt status. Never click live ads to test them; use AdSense's test tooling or inspect request/render behavior without clicking.

## In-app safeguards

- The AdSense library is loaded only after the TCF API reports Purpose 1 consent and Google vendor 755 consent. If the CMP is absent, the user declines, or script loading fails, the app leaves the ad blank and all Bible features usable.
- The manual unit is labeled “Advertisement” and exists only after the Home content. It is not interleaved with Bible text or app controls.
- The privacy, advertising, and third-party disclosure lives only on the About page as an expandable section (`/?section=about#privacy-and-advertising`). There is no separate privacy page and no footer link; the legacy `/privacy` URL redirects to that About section.

These source changes improve policy readiness but cannot certify the publisher account, CMP configuration, ad content, or Google's final review. Verify the live account's Policy Center after completing the account-side steps.
