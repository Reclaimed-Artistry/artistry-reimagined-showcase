import { Capacitor } from "@capacitor/core";

/**
 * AdSense, for the web build only.
 *
 * Two rules shape everything here:
 *
 * 1. **Never in the native app.** Selah ships the same bundle to Android and
 *    iOS. Google's publisher terms are explicit that AdSense display ad code
 *    must not run inside an app; apps are covered by AdMob instead. Loading it
 *    in the APK would put the account at risk, so every entry point checks the
 *    platform first.
 *
 * 2. **Non-personalized by default.** No certified consent-management platform
 *    (CMP) is configured, so there is no lawful basis here for personalized
 *    advertising in the EEA or UK. Rather than show nothing at all, or quietly
 *    personalize without consent, ad requests are marked non-personalized:
 *    they are chosen from page context instead of a profile of the reader.
 *    `requestNonPersonalizedAds` is sticky for the page, so it is set before
 *    the first ad request rather than per unit.
 *
 * The publisher id is public — it is in every ad request and in the page source
 * of every site running AdSense.
 */

export const ADSENSE_CLIENT = "ca-pub-8913201913917754";

const SCRIPT_FLAG = "data-selah-adsense";

/**
 * The display unit created in the AdSense dashboard ("Unit").
 *
 * Kept in source rather than only in an env var so ads work on a plain deploy
 * with no extra configuration. It is public in the same way the publisher id
 * is: it appears in the rendered markup of every page showing the unit. An env
 * var still wins, for pointing a deployment at a different unit.
 */
const DEFAULT_SLOT_ID = "2468757292";
const GOOGLE_TCF_VENDOR_ID = "755";

/**
 * Sections that may carry ads, and therefore may have the AdSense script loaded.
 *
 * This is a hard gate, not a styling preference. Auto ads (switched on in the
 * AdSense dashboard) serve wherever the script is present, with no slot id
 * involved — so a script left loaded across a single-page app will place ads on
 * whatever screen the reader happens to open. Google flags that as "ads on
 * screens without publisher content".
 *
 * Kids is written for children; About carries the privacy policy that explains
 * the ads. Neither may load it.
 */
const AD_ELIGIBLE_SECTIONS = new Set([
  "home",
  "reader",
  "companion",
  "versions",
  "plans",
  "reflection",
  "study",
]);

export function isAdEligibleSection(section: string): boolean {
  return AD_ELIGIBLE_SECTIONS.has(section);
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
    __tcfapi?: (
      command: "addEventListener" | "getTCData",
      version: 2,
      callback: (data: TcfData | null, success: boolean) => void,
    ) => void;
  }
}

type TcfData = {
  eventStatus?: string;
  purpose?: { consents?: Record<string, boolean> };
  vendor?: { consents?: Record<string, boolean> };
};

/** True inside the Capacitor shell, where AdSense must never run. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Whether ad code may run on this platform at all. */
export function adsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return false;
  return true;
}

/** Consent for personalized ads, if a CMP has supplied it. */
export function hasPersonalizedConsent(data: TcfData | null, success: boolean): boolean {
  return Boolean(
    success &&
      data &&
      (data.eventStatus === "tcloaded" || data.eventStatus === "useractioncomplete") &&
      data.purpose?.consents?.["1"] === true &&
      data.vendor?.consents?.[GOOGLE_TCF_VENDOR_ID] === true,
  );
}

/** Whether this reader has granted consent for personalized advertising. */
export function readPersonalizedConsent(): Promise<boolean> {
  if (typeof window === "undefined" || !window.__tcfapi) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      window.__tcfapi!("getTCData", 2, (data, success) => {
        resolve(hasPersonalizedConsent(data, success));
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Mark the page's ad requests as non-personalized.
 *
 * Must run before the first `adsbygoogle.push`, because the queue is drained by
 * the ad script the moment it loads.
 */
export function markAdsNonPersonalized(): void {
  if (typeof window === "undefined") return;
  window.adsbygoogle = window.adsbygoogle || [];
  (window.adsbygoogle as unknown as { requestNonPersonalizedAds?: number })
    .requestNonPersonalizedAds = 1;
}

/**
 * Load the site-level AdSense script once, for every page.
 *
 * This is the publisher tag from the AdSense dashboard. It is what enables
 * Auto ads; the manual units rendered by `<AdSlot>` use the same script.
 */
export function loadAdSenseScript(): Promise<void> {
  if (!adsAllowed()) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_FLAG}]`);
  if (existing?.dataset.loaded === "true") return Promise.resolve();
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("AdSense did not load.")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute(SCRIPT_FLAG, "true");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("AdSense did not load."));
    };
    document.head.appendChild(script);
  });
}

/**
 * Remove the publisher script.
 *
 * Called when the reader leaves an ad-eligible section. It stops any further
 * auto-ad placement; it cannot retract a unit the script already rendered.
 */
export function unloadAdSenseScript(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLScriptElement>(`script[${SCRIPT_FLAG}]`).forEach((script) => {
    script.remove();
  });
}

/**
 * Slot id for a placement.
 *
 * AdSense needs a slot id for every manual unit, and those are created in the
 * dashboard — they cannot be invented in source. A single `VITE_ADSENSE_SLOT_ID`
 * covers every page, and a per-placement override lets one page use its own
 * unit later without touching code.
 */
const PLACEMENT_ENV: Record<string, string | undefined> = {
  home: import.meta.env.VITE_ADSENSE_HOME_SLOT_ID,
  reader: import.meta.env.VITE_ADSENSE_READER_SLOT_ID,
  plans: import.meta.env.VITE_ADSENSE_PLANS_SLOT_ID,
  reflection: import.meta.env.VITE_ADSENSE_REFLECTION_SLOT_ID,
  study: import.meta.env.VITE_ADSENSE_STUDY_SLOT_ID,
  versions: import.meta.env.VITE_ADSENSE_VERSIONS_SLOT_ID,
};

export function slotIdFor(placement: string): string | undefined {
  const shared = import.meta.env.VITE_ADSENSE_SLOT_ID?.trim();
  const specific = PLACEMENT_ENV[placement]?.trim();
  return specific || shared || DEFAULT_SLOT_ID;
}
