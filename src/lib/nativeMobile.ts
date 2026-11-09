import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import type { ReaderTheme } from "@/types/bible";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getDevicePlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {
    // ignore
  }
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      return "ios";
    }
    if (/Android/i.test(ua)) {
      return "android";
    }
  }
  return "web";
}

export function isStandaloneInstalled(): boolean {
  if (isNativeCapacitor()) return true;
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)").matches === true ||
    nav.standalone === true
  );
}

/**
 * Request persistent browser/WebView storage so iOS & Android never evict
 * downloaded offline Bibles in IndexedDB under low-memory conditions.
 */
export async function initMobileRuntime(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Non-fatal
  }

  if (isNativeCapacitor()) {
    try {
      await SplashScreen.hide({ fadeOutDuration: 250 });
    } catch {
      // Non-fatal
    }
  }
}

/**
 * Synchronize iOS/Android native StatusBar + browser theme-color meta tag
 * whenever the user switches between Light, Sepia, and Night themes.
 */
export async function syncStatusBarWithTheme(theme: ReaderTheme): Promise<void> {
  const hexByTheme: Record<ReaderTheme, string> = {
    parchment: "#F6F4EF",
    sepia: "#EDE3D2",
    night: "#101813",
  };
  const hex = hexByTheme[theme] || "#F6F4EF";

  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", hex);
    }
  }

  if (isNativeCapacitor()) {
    try {
      await StatusBar.setStyle({
        style: theme === "night" ? Style.Light : Style.Dark,
      });
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: hex });
      }
    } catch {
      // Ignore on unsupported webviews
    }
  }
}

export async function triggerHaptic(kind: "light" | "medium" | "success" = "light"): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    if (kind === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.impact({
        style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light,
      });
    }
  } catch {
    // Ignore
  }
}

export async function shareScriptureNative(opts: {
  title: string;
  text: string;
  url?: string;
  pngDataUrl?: string;
  fileName?: string;
}): Promise<"shared" | "copied" | "cancelled"> {
  const shareUrl = opts.url || (typeof window !== "undefined" ? window.location.origin : undefined);

  // 1. Web Share API Level 2 with PNG file support (works natively on iOS Safari 15+ & Android Chrome!)
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (opts.pngDataUrl && typeof navigator.canShare === "function") {
        const res = await fetch(opts.pngDataUrl);
        const blob = await res.blob();
        const file = new File([blob], opts.fileName || "selah-verse.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: opts.title,
            text: opts.text,
            files: [file],
          });
          return "shared";
        }
      }
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: shareUrl,
      });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  // 2. Capacitor Native Share plugin (for iOS / Android native binary builds)
  if (isNativeCapacitor()) {
    try {
      const can = await Share.canShare();
      if (can.value) {
        await Share.share({
          title: opts.title,
          text: opts.text,
          url: shareUrl,
          dialogTitle: opts.title,
        });
        return "shared";
      }
    } catch {
      return "cancelled";
    }
  }

  // 3. Clipboard fallback
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(opts.text);
    return "copied";
  }
  return "cancelled";
}

/**
 * Register Android hardware Back button handler inside Capacitor native builds.
 */
export function subscribeAndroidBackButton(onBack: () => boolean): () => void {
  if (!isNativeCapacitor()) return () => {};
  let removeFn: (() => void) | null = null;

  CapApp.addListener("backButton", ({ canGoBack }) => {
    const handled = onBack();
    if (!handled && !canGoBack) {
      CapApp.minimizeApp().catch(() => {});
    }
  })
    .then((handle) => {
      removeFn = () => {
        handle.remove().catch(() => {});
      };
    })
    .catch(() => {});

  return () => {
    if (removeFn) removeFn();
  };
}
