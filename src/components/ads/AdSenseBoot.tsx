import { useEffect } from "react";
import {
  adsAllowed,
  isAdEligibleSection,
  loadAdSenseScript,
  markAdsNonPersonalized,
  unloadAdSenseScript,
} from "@/lib/adsense";

/**
 * Loads the AdSense publisher script, but only while an ad-eligible section is
 * open.
 *
 * The snippet belongs in the document, and this is a single-page app: one HTML
 * document holds every route. Two ways to load it were possible, and they are
 * not equivalent:
 *
 * - Load once and never unload. Simple, and wrong here. Auto ads are enabled in
 *   the AdSense dashboard, and they serve wherever the script is present — not
 *   only where a manual `<ins>` sits. A script left loaded means Google can put
 *   an ad on the Kids stories or the privacy policy, which is both a policy
 *   problem ("ads on screens without publisher content") and simply the wrong
 *   thing to do to a children's page.
 * - Load per section, and unload on leaving. The script is present exactly on
 *   the screens that may carry ads, so auto ads and the manual units agree.
 *
 * Unloading stops further placement. It cannot retract a unit the script has
 * already rendered, which is why the gate is checked before load rather than
 * after.
 */
export const AdSenseBoot: React.FC<{ section: string }> = ({ section }) => {
  useEffect(() => {
    if (!adsAllowed() || !isAdEligibleSection(section)) {
      unloadAdSenseScript();
      return;
    }

    markAdsNonPersonalized();
    void loadAdSenseScript().catch(() => {
      // Blocked by an extension, or offline. Ads are optional; the app is not.
    });
  }, [section]);

  return null;
};
