import React, { useEffect, useRef, useState } from "react";
import {
  ADSENSE_CLIENT,
  adsAllowed,
  loadAdSenseScript,
  markAdsNonPersonalized,
  slotIdFor,
} from "@/lib/adsense";

type AdSlotProps = {
  /** Which page this sits on. Selects an optional per-page slot id. */
  placement: string;
  className?: string;
};

/**
 * One manual ad unit, for use on any page.
 *
 * Behaviour worth knowing:
 *
 * - **Renders nothing until it can work.** No slot id configured, native app,
 *   or a script that fails to load, and this collapses to an empty element
 *   rather than leaving a hole or a broken frame in the layout.
 * - **Waits for a real width before requesting.** An `ins` inside a container
 *   that is display:none, or below the fold of a section that has not mounted,
 *   reports zero width; pushing there fails silently and burns one request.
 * - **Labelled "Advertisement".** Google permits no other label — not
 *   "Sponsored", not "Resources", and never wording that invites a click.
 * - **Reset per page.** React remounts this on navigation via `key`, so each
 *   page gets its own request instead of trying to reuse a filled unit.
 */
export const AdSlot: React.FC<AdSlotProps> = ({ placement, className }) => {
  const slotId = slotIdFor(placement);
  const [ready, setReady] = useState(false);
  const slotRef = useRef<HTMLModElement | null>(null);
  const requestSent = useRef(false);

  useEffect(() => {
    if (!slotId || !adsAllowed()) return;
    let active = true;

    void (async () => {
      markAdsNonPersonalized();
      try {
        await loadAdSenseScript();
        if (active) setReady(true);
      } catch {
        if (active) setReady(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slotId]);

  useEffect(() => {
    if (!ready || requestSent.current || !slotRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const slot = slotRef.current;
      if (!slot || slot.clientWidth === 0) return;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        requestSent.current = true;
      } catch {
        // An ad failing must never take the page down with it.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);

  if (!slotId || !adsAllowed()) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`mx-auto w-full max-w-5xl border-t border-border/70 pt-4 ${className ?? ""}`}
    >
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">
        Advertisement
      </p>
      <ins
        ref={slotRef}
        className="adsbygoogle mx-auto block min-h-0 w-full max-w-3xl"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
};
