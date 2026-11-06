import React, { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  PlusSquare,
  Share,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WifiOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type BeforeInstallPromptEvent,
  getDevicePlatform,
  isNativeCapacitor,
  isStandaloneInstalled,
} from "@/lib/nativeMobile";
import { toast } from "sonner";

interface MobileAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstalled: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({
  open,
  onOpenChange,
  deferredPrompt,
  onInstalled,
}) => {
  const platform = getDevicePlatform();
  const standalone = isStandaloneInstalled();
  const nativeCap = isNativeCapacitor();

  const [tab, setTab] = useState<"iphone" | "android" | "stores">(
    platform === "android" ? "android" : "iphone"
  );

  const handleInstallAndroidPwa = async () => {
    if (!deferredPrompt) {
      toast.info(
        "Open your browser menu (⋮) and tap 'Install app' or 'Add to Home screen'."
      );
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Selah Bible installed on your home screen!");
      onInstalled();
      onOpenChange(false);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard?.writeText(cmd);
    toast.success("Copied build command!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <Smartphone className="h-5 w-5 text-primary" />
            Selah Bible for iPhone &amp; Android
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Banner if already installed */}
          {standalone && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                {nativeCap
                  ? "Running as a native mobile app with full offline Bible Vault."
                  : "Installed on your device in full-screen standalone mode!"}
              </span>
            </div>
          )}

          {/* Core Mobile Highlights */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-muted/40 p-2.5">
              <WifiOff className="mx-auto mb-1 h-4 w-4 text-primary" />
              <div className="text-[11px] font-bold">100% Offline</div>
              <div className="text-[10px] text-muted-foreground">BSB + KJV Ready</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-2.5">
              <Sparkles className="mx-auto mb-1 h-4 w-4 text-primary" />
              <div className="text-[11px] font-bold">Embedded AI</div>
              <div className="text-[10px] text-muted-foreground">Zero API Setup</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-2.5">
              <ShieldCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
              <div className="text-[11px] font-bold">iOS &amp; Android</div>
              <div className="text-[10px] text-muted-foreground">Safe-Area Native</div>
            </div>
          </div>

          {/* Platform Switcher */}
          <div className="grid grid-cols-3 rounded-xl border border-border bg-muted/50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab("iphone")}
              className={`rounded-lg py-1.5 transition ${
                tab === "iphone"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              iPhone / iPad
            </button>
            <button
              type="button"
              onClick={() => setTab("android")}
              className={`rounded-lg py-1.5 transition ${
                tab === "android"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Android
            </button>
            <button
              type="button"
              onClick={() => setTab("stores")}
              className={`rounded-lg py-1.5 transition ${
                tab === "stores"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              App / Play Store
            </button>
          </div>

          {/* iPhone / iPad Tab */}
          {tab === "iphone" && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-bold text-foreground">
                Install Instantly on iPhone or iPad
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Install Selah Bible directly onto your iPhone Home Screen for full-screen Dynamic Island layout, instant launch, and offline Scripture access anywhere:
              </p>
              <ol className="space-y-2.5 text-xs">
                <li className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    1
                  </span>
                  <div>
                    Open this page in <strong>Safari</strong> and tap the{" "}
                    <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 font-semibold">
                      <Share className="h-3 w-3 text-primary" /> Share
                    </span>{" "}
                    button in the bottom toolbar.
                  </div>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    2
                  </span>
                  <div>
                    Scroll down and tap{" "}
                    <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 font-semibold">
                      <PlusSquare className="h-3 w-3 text-primary" /> Add to Home Screen
                    </span>
                    , then tap <strong>Add</strong>.
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Android Tab */}
          {tab === "android" && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-bold text-foreground">
                Install on Android Phone or Tablet
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Install Selah Bible as an Android app with native app-drawer icon, offline Bible storage, and full-screen reading:
              </p>

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallAndroidPwa}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-95"
                >
                  <Download className="h-4 w-4" />
                  Install Selah Bible App Now
                </button>
              ) : (
                <ol className="space-y-2 text-xs">
                  <li className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      1
                    </span>
                    <div>
                      Tap the <strong>⋮ Menu</strong> in Chrome, Edge, or Samsung Internet.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      2
                    </span>
                    <div>
                      Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>) to add Selah Bible to your Android app drawer.
                    </div>
                  </li>
                </ol>
              )}
            </div>
          )}

          {/* Apple App Store & Google Play Store Native Capacitor Builds */}
          {tab === "stores" && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  Native App Store &amp; Play Store Packaging
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  Capacitor 8
                </span>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                This repository includes native <strong>Xcode (`ios/`)</strong> and <strong>Android Gradle (`android/`)</strong> projects (`app.selahbible.multiversion`) plus an automated GitHub Actions build workflow for Google Play `.aab`/`.apk` and Apple App Store `.ipa` archives.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                  <div>
                    <div className="font-semibold text-foreground">Apple App Store (Xcode / iOS)</div>
                    <code className="font-mono text-[11px] text-muted-foreground">
                      npm run mobile:ios
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCommand("npm run mobile:ios")}
                    className="rounded-lg border border-border bg-card p-1.5 hover:bg-accent"
                    title="Copy iOS build command"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                  <div>
                    <div className="font-semibold text-foreground">Google Play Store (Android Studio / AAB)</div>
                    <code className="font-mono text-[11px] text-muted-foreground">
                      npm run mobile:android
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCommand("npm run mobile:android")}
                    className="rounded-lg border border-border bg-card p-1.5 hover:bg-accent"
                    title="Copy Android build command"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
