import React, { useEffect, useRef, useState } from "react";

const PUBLISHER_ID = "ca-pub-8913201913917754";
const GOOGLE_TCF_VENDOR_ID = "755";
const HOME_SLOT_ID = import.meta.env.VITE_ADSENSE_HOME_SLOT_ID?.trim();

type TcfData = {
  eventStatus?: string;
  purpose?: { consents?: Record<string, boolean> };
  vendor?: { consents?: Record<string, boolean> };
};

declare global {
  interface Window {
    __tcfapi?: (
      command: "addEventListener" | "getTCData",
      version: 2,
      callback: (data: TcfData | null, success: boolean) => void,
    ) => void;
    adsbygoogle?: Record<string, unknown>[];
  }
}

function hasRequiredConsent(data: TcfData | null, success: boolean): boolean {
  return Boolean(
    success &&
    data &&
    (data.eventStatus === "tcloaded" || data.eventStatus === "useractioncomplete") &&
    data.purpose?.consents?.["1"] === true &&
    data.vendor?.consents?.[GOOGLE_TCF_VENDOR_ID] === true,
  );
}

function loadAdSenseScript(): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>("script[data-selah-adsense]");
  if (existing?.dataset.loaded === "true") return Promise.resolve();
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("AdSense did not load.")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.selahAdsense = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
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
 * A single manual display unit, only on the Home dashboard. It is not requested
 * until a TCF CMP reports consent for storage (Purpose 1) and Google (vendor 755).
 * No publisher slot is configured in source: set VITE_ADSENSE_HOME_SLOT_ID after
 * creating/approving the matching unit in AdSense.
 */
export const AdSenseSlot: React.FC = () => {
  const [consentGranted, setConsentGranted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const slotRef = useRef<HTMLModElement | null>(null);
  const requestSentRef = useRef(false);

  useEffect(() => {
    if (!HOME_SLOT_ID || typeof window === "undefined") return;

    let active = true;
    let registrationAttempts = 0;
    let retryTimer = 0;

    const onConsentUpdate = (data: TcfData | null, success: boolean) => {
      if (!active) return;
      const allowed = hasRequiredConsent(data, success);
      setConsentGranted(allowed);
      if (!allowed) {
        requestSentRef.current = false;
        return;
      }
      void loadAdSenseScript()
        .then(() => {
          if (active) setScriptReady(true);
        })
        .catch(() => {
          if (active) setScriptReady(false);
        });
    };

    const registerCmpListener = () => {
      if (!window.__tcfapi) return false;
      window.__tcfapi("addEventListener", 2, onConsentUpdate);
      window.__tcfapi("getTCData", 2, onConsentUpdate);
      return true;
    };

    if (!registerCmpListener()) {
      retryTimer = window.setInterval(() => {
        registrationAttempts += 1;
        if (registerCmpListener() || registrationAttempts >= 40) {
          window.clearInterval(retryTimer);
        }
      }, 500);
    }

    return () => {
      active = false;
      if (retryTimer) window.clearInterval(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (!consentGranted || !scriptReady || requestSentRef.current || !slotRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const slot = slotRef.current;
      if (!slot || slot.clientWidth === 0) return;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        requestSentRef.current = true;
      } catch {
        // Keep the rest of Selah usable if the ad service or slot is unavailable.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [consentGranted, scriptReady]);

  if (!HOME_SLOT_ID) return null;

  return (
    <aside aria-label="Advertisement" className="mx-auto mt-6 w-full max-w-5xl border-t border-border/70 pt-4">
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">Advertisement</p>
      {consentGranted ? (
        <ins
          ref={slotRef}
          className="adsbygoogle mx-auto block min-h-0 w-full max-w-3xl"
          style={{ display: "block" }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={HOME_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div aria-hidden="true" className="mx-auto h-0 w-full max-w-3xl" />
      )}
    </aside>
  );
};
