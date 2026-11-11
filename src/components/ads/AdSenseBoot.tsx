import { useEffect } from "react";
import { adsAllowed, loadAdSenseScript, markAdsNonPersonalized } from "@/lib/adsense";

/**
 * Loads the AdSense publisher script once for the whole app.
 *
 * The snippet belongs in the document, but this is a single-page app: there is
 * one HTML document and every "page" is a route rendered into it. Putting the
 * tag in `index.html` would load it before the reader has shown up for any
 * content; mounting it here means it is present on every route after first
 * paint, still once per session, and never inside the native app.
 */
export const AdSenseBoot: React.FC = () => {
  useEffect(() => {
    if (!adsAllowed()) return;
    markAdsNonPersonalized();
    void loadAdSenseScript().catch(() => {
      // Blocked by an extension, or offline. Ads are optional; the app is not.
    });
  }, []);

  return null;
};
