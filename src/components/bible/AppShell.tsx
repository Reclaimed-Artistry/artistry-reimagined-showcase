import React, { lazy, Suspense, useEffect, useState } from "react";
import { Command, Flame, Search, Smartphone } from "lucide-react";
import { useBibleApp } from "@/context/useBibleApp";
import {
  type BeforeInstallPromptEvent,
  initMobileRuntime,
  isStandaloneInstalled,
  subscribeAndroidBackButton,
  syncStatusBarWithTheme,
  triggerHaptic,
} from "@/lib/nativeMobile";
import { SelahIcon } from "./SelahIcon";
import { TypographyPopover } from "./TypographyPopover";
import { HomeDashboard } from "./HomeDashboard";
import { ExplainerView } from "./ExplainerView";
import { preloadSpeechVoices } from "@/lib/speechVoices";
import type { AppSection } from "@/types/bible";

const AiCompanionPanel = lazy(() => import("./AiCompanionPanel").then((module) => ({ default: module.AiCompanionPanel })));
const AudioReadAlongBar = lazy(() => import("./AudioReadAlongBar").then((module) => ({ default: module.AudioReadAlongBar })));
const BibleReaderView = lazy(() => import("./BibleReaderView").then((module) => ({ default: module.BibleReaderView })));
const CommandPaletteModal = lazy(() => import("./CommandPaletteModal").then((module) => ({ default: module.CommandPaletteModal })));
const DailyReflectionView = lazy(() => import("./DailyReflectionView").then((module) => ({ default: module.DailyReflectionView })));
const MobileAppModal = lazy(() => import("./MobileAppModal").then((module) => ({ default: module.MobileAppModal })));
const ReadingPlansView = lazy(() => import("./ReadingPlansView").then((module) => ({ default: module.ReadingPlansView })));
const SearchAndStudyView = lazy(() => import("./SearchAndStudyView").then((module) => ({ default: module.SearchAndStudyView })));
const VerseArtModal = lazy(() => import("./VerseArtModal").then((module) => ({ default: module.VerseArtModal })));
const VerseCompareDrawer = lazy(() => import("./VerseCompareDrawer").then((module) => ({ default: module.VerseCompareDrawer })));
const VersionVaultView = lazy(() => import("./VersionVaultView").then((module) => ({ default: module.VersionVaultView })));
const KidsStoriesView = lazy(() => import("./KidsStoriesView").then((module) => ({ default: module.KidsStoriesView })));

const preloadSectionModules = () => Promise.allSettled([
  import("./BibleReaderView"),
  import("./VersionVaultView"),
  import("./ReadingPlansView"),
  import("./DailyReflectionView"),
  import("./SearchAndStudyView"),
  import("./KidsStoriesView"),
]);

type SectionErrorBoundaryProps = {
  resetKey: AppSection;
  onReturnHome: () => void;
  children: React.ReactNode;
};

class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: SectionErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section role="alert" className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Selah space unavailable</p>
          <h1 className="mt-3 font-display text-2xl font-semibold">We couldn’t open this section.</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your saved reading and notes are still here. Try again, or return to Home and open another section.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">Reload Selah</button>
            <button type="button" onClick={this.props.onReturnHome} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">Return to Home</button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

type SectionLoadingFallbackProps = {
  onSelectSection: (section: AppSection) => void;
  onOpenCompanion: () => void;
};

const SectionLoadingFallback: React.FC<SectionLoadingFallbackProps> = ({
  onSelectSection,
  onOpenCompanion,
}) => {
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoadingTooLong(true), 10000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {loadingTooLong && (
        <div
          role="status"
          className="mx-auto mt-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <span>This section is taking longer than expected. You can use Home while it finishes loading.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-10 rounded-lg border border-border bg-card px-3 font-semibold hover:bg-accent"
          >
            Reload Selah
          </button>
        </div>
      )}
      <HomeDashboard onSelectSection={onSelectSection} onOpenCompanion={onOpenCompanion} />
    </>
  );
};

export const AppShell: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    catalog,
    streakCount,
    prefs,
    aiPanelOpen,
    setAiPanelOpen,
    commandPaletteOpen,
    setCommandPaletteOpen,
    compareDrawerOpen,
    setCompareDrawerOpen,
    verseArtModalOpen,
    setVerseArtModalOpen,
  } = useBibleApp();

  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [navigationVisible, setNavigationVisible] = useState(true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Initialize native mobile runtime + PWA shortcut deep-link support
  useEffect(() => {
    void initMobileRuntime();

    const currentUrl = new URL(window.location.href);
    const isLegacyPrivacyPath = currentUrl.pathname.replace(/\/+$/, "") === "/privacy";
    if (isLegacyPrivacyPath) {
      currentUrl.pathname = "/";
      currentUrl.searchParams.set("section", "about");
      currentUrl.hash = "privacy-and-advertising";
      window.history.replaceState(null, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }
    const params = new URLSearchParams(window.location.search);
    const sec = (isLegacyPrivacyPath ? "about" : params.get("section")) as AppSection | null;
    if (
      sec &&
      ["home", "reader", "companion", "versions", "plans", "reflection", "study", "kids", "about"].includes(sec)
    ) {
      if (sec === "companion" && prefs.showBibleCompanion) {
        setActiveSection("companion");
        setAiPanelOpen(true);
      } else {
        setActiveSection(sec);
      }
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [prefs.showBibleCompanion, setActiveSection, setAiPanelOpen]);

  // Ask the browser to enumerate its installed TTS voices at app startup so
  // the AI voice picker is ready before the user opens the audio player.
  useEffect(() => {
    preloadSpeechVoices();
  }, []);

  // Warm section modules after first paint so navigation is immediate on
  // normal connections. Respect data-saver and very slow mobile connections.
  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || /(^|-)2g$/i.test(connection?.effectiveType || "")) return;

    let cancelled = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const warmSections = () => {
      if (!cancelled) void preloadSectionModules();
    };

    if (idleWindow.requestIdleCallback) {
      const idleHandle = idleWindow.requestIdleCallback(warmSections, { timeout: 1800 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutHandle = window.setTimeout(warmSections, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutHandle);
    };
  }, []);

  // Reveal the global menus as the reader scrolls, then tuck them away after
  // the user pauses. Keep focused navigation available for keyboard users.
  useEffect(() => {
    let hideTimer: number | undefined;
    const navigationHasFocus = () =>
      document.activeElement instanceof Element &&
      document.activeElement.closest("[data-global-navigation]") !== null;
    const clearHideTimer = () => {
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
      hideTimer = undefined;
    };
    const scheduleHide = () => {
      clearHideTimer();
      if (window.scrollY <= 16 || navigationHasFocus()) return;
      hideTimer = window.setTimeout(() => {
        if (window.scrollY > 16 && !navigationHasFocus()) setNavigationVisible(false);
      }, 2600);
    };
    const onScroll = () => {
      setNavigationVisible(true);
      scheduleHide();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-global-navigation]")) {
        clearHideTimer();
        setNavigationVisible(true);
      }
    };
    const onFocusOut = () => window.setTimeout(scheduleHide, 0);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearHideTimer();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Sync iOS/Android StatusBar & browser theme-color whenever theme changes
  useEffect(() => {
    void syncStatusBarWithTheme(prefs.theme);
  }, [prefs.theme]);

  useEffect(() => {
    if (!prefs.showBibleCompanion) {
      setAiPanelOpen(false);
      if (activeSection === "companion") setActiveSection("reader");
    }
  }, [prefs.showBibleCompanion, activeSection, setActiveSection, setAiPanelOpen]);

  useEffect(() => {
    if (activeSection === "companion" && !aiPanelOpen) setActiveSection("reader");
  }, [activeSection, aiPanelOpen, setActiveSection]);

  useEffect(() => {
    const openReader = () => setActiveSection("reader");
    window.addEventListener("selah:open-reader", openReader);
    return () => window.removeEventListener("selah:open-reader", openReader);
  }, [setActiveSection]);

  // Handle Android hardware Back button inside native Capacitor APK/AAB builds
  useEffect(() => {
    return subscribeAndroidBackButton(() => {
      if (mobileModalOpen) {
        setMobileModalOpen(false);
        return true;
      }
      if (commandPaletteOpen) {
        setCommandPaletteOpen(false);
        return true;
      }
      if (verseArtModalOpen) {
        setVerseArtModalOpen(false);
        return true;
      }
      if (compareDrawerOpen) {
        setCompareDrawerOpen(false);
        return true;
      }
      if (aiPanelOpen) {
        setAiPanelOpen(false);
        return true;
      }
      if (activeSection !== "home") {
        setActiveSection("home");
        return true;
      }
      return false;
    });
  }, [
    mobileModalOpen,
    commandPaletteOpen,
    setCommandPaletteOpen,
    verseArtModalOpen,
    setVerseArtModalOpen,
    compareDrawerOpen,
    setCompareDrawerOpen,
    aiPanelOpen,
    setAiPanelOpen,
    activeSection,
    setActiveSection,
  ]);

  const navItems: {
    id: AppSection;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: "home",
      label: "Home",
      shortLabel: "Home",
      icon: <SelahIcon name="home" className="h-4 w-4" />,
    },
    {
      id: "reader",
      label: "Read",
      shortLabel: "Read",
      icon: <SelahIcon name="read" className="h-4 w-4" />,
    },
    {
      id: "versions",
      label: "Vault",
      shortLabel: "Vault",
      icon: <SelahIcon name="vault" className="h-4 w-4" />,
      badge: `${catalog.length.toLocaleString()}+`,
    },
    {
      id: "plans",
      label: "Reading Plans",
      shortLabel: "Plans",
      icon: <SelahIcon name="plans" className="h-4 w-4" />,
    },
    {
      id: "reflection",
      label: "Reflect",
      shortLabel: "Reflect",
      icon: <SelahIcon name="reflect" className="h-4 w-4" />,
    },
    {
      id: "study",
      label: "Study",
      shortLabel: "Study",
      icon: <SelahIcon name="study" className="h-4 w-4" />,
    },
    {
      id: "kids",
      label: "Kids’ Storybook",
      shortLabel: "Kids",
      icon: <SelahIcon name="kids" className="h-4 w-4" />,
    },
    {
      id: "about",
      label: "How Selah Works",
      shortLabel: "About",
      icon: <SelahIcon name="about" className="h-4 w-4" />,
    },
  ];

  const handleSelectSection = (id: AppSection) => {
    void triggerHaptic("light");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
    if (id === "companion") {
      if (!prefs.showBibleCompanion) return;
      setActiveSection("companion");
      setAiPanelOpen(true);
      return;
    }
    if (id !== "reader" || activeSection === "companion") setAiPanelOpen(false);
    setActiveSection(id);
  };

  const appShellStyle = {
    "--app-wallpaper-color": prefs.appearanceBackgroundColor || (prefs.theme === "night" ? "#101813" : prefs.theme === "sepia" ? "#EDE6D5" : "#F6F4EF"),
    "--app-wallpaper-image": prefs.appearanceBackgroundImage
      ? `url("${prefs.appearanceBackgroundImage}")`
      : "none",
    "--app-wallpaper-darken": prefs.appearanceBackgroundImage
      ? String(Math.max(0, Math.min(80, prefs.appearanceImageDarken)) / 100)
      : "0",
  } as React.CSSProperties;
  const isStandaloneApp = isStandaloneInstalled();

  return (
    <div className="app-shell flex min-h-screen w-full min-w-0 flex-col text-foreground" style={appShellStyle}>
      {/* Top Global Sanctuary Bar (with iPhone Notch / Dynamic Island safe-top padding) */}
      <header
        data-global-navigation
        aria-hidden={!navigationVisible}
        className={`safe-top sticky top-0 z-30 w-full border-b border-border bg-sidebar transition-transform duration-300 ease-out ${
          navigationVisible ? "translate-y-0" : "pointer-events-none -translate-y-full"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl min-w-0 items-center justify-between gap-2.5 px-3 sm:px-6">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => handleSelectSection("home")}
            className="flex min-w-0 items-center gap-2.5 text-left"
            title="Selah Multi version Bible"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <svg
                viewBox="0 0 32 32"
                className="h-5 w-5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 8C10 7 13.8 8 16 10.2C18.2 8 22 7 26 8V24.5C22 23.5 18.2 24.5 16 26.7C13.8 24.5 10 23.5 6 24.5V8Z"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 10.2V26.7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="truncate whitespace-nowrap font-display text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
                Selah
              </div>
              <div className="hidden text-[10px] font-medium tracking-[.12em] uppercase text-muted-foreground sm:block">
                Read · Reflect · Rest
              </div>
            </div>
          </button>

          {/* Desktop Navigation Pills */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => handleSelectSection(item.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Utility Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground sm:px-3"
              title="Quick Jump to Verse or Version (Cmd/Ctrl + K)"
            >
              <Search className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Jump / Search</span>
              <kbd className="hidden items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] md:inline-flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            <TypographyPopover />

            {!isStandaloneApp && (
              <button
                type="button"
                onClick={() => setMobileModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent"
                title="Install on iPhone or Android / App Store & Play Store"
              >
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                <span className="hidden md:inline">iOS &amp; Android</span>
              </button>
            )}

            <div
              className="hidden items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 sm:inline-flex"
              title="Daily Reading Streak"
            >
              <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{streakCount}d</span>
            </div>

            {prefs.showBibleCompanion && (
              <button
                type="button"
                onClick={() => aiPanelOpen ? setAiPanelOpen(false) : handleSelectSection("companion")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                  aiPanelOpen
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-primary/35 bg-primary/12 text-primary hover:bg-primary/20"
                }`}
                title="Toggle Selah Bible Companion"
                aria-label="Toggle Selah Bible Companion"
                aria-expanded={aiPanelOpen}
              >
                <SelahIcon name="companion" className="h-4 w-4" />
                <span className="hidden sm:inline">Bible Companion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace + Selah Bible Companion Sidebar */}
      <div className="flex w-full min-w-0 flex-1">
        <main className="pb-mobile-safe w-full min-w-0 flex-1">
          <SectionErrorBoundary
            resetKey={activeSection}
            onReturnHome={() => {
              setAiPanelOpen(false);
              setActiveSection("home");
            }}
          >
            <Suspense
              fallback={
                <SectionLoadingFallback
                  onSelectSection={handleSelectSection}
                  onOpenCompanion={() => handleSelectSection("companion")}
                />
              }
            >
              {activeSection === "home" && (
                <HomeDashboard
                  onSelectSection={handleSelectSection}
                  onOpenCompanion={() => handleSelectSection("companion")}
                />
              )}
              {(activeSection === "reader" || activeSection === "companion") && <BibleReaderView />}
              {activeSection === "versions" && <VersionVaultView />}
              {activeSection === "plans" && <ReadingPlansView />}
              {activeSection === "reflection" && <DailyReflectionView />}
              {activeSection === "study" && <SearchAndStudyView />}
              {activeSection === "kids" && <KidsStoriesView />}
              {activeSection === "about" && <ExplainerView />}
            </Suspense>
          </SectionErrorBoundary>
        </main>

        <Suspense fallback={null}>{prefs.showBibleCompanion && <AiCompanionPanel />}</Suspense>
      </div>

      {/* Synchronized Audio Read-Along Dock */}
      <Suspense fallback={null}><AudioReadAlongBar /></Suspense>

      {/* Persistent bottom navigation (with iPhone Home Indicator safe-bottom padding) */}
      <nav
        data-global-navigation
        aria-label="Main navigation"
        aria-hidden={!navigationVisible}
        className={`safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pt-1.5 shadow-[0_-8px_24px_rgba(18,34,25,.045)] transition-transform duration-300 ease-out ${
          navigationVisible ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="mx-auto grid w-full max-w-2xl grid-cols-8 items-center gap-0 px-1 sm:gap-1 sm:px-3 lg:gap-2">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => handleSelectSection(item.id)}
                className={`flex min-h-11 w-full min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 text-[9px] font-semibold transition lg:flex-row lg:gap-2 lg:rounded-lg lg:px-2 lg:py-2 lg:text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.icon}
                <span className="max-w-full truncate whitespace-nowrap">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Drawers & Modals */}
      <Suspense fallback={null}>
        <VerseCompareDrawer />
        <VerseArtModal />
        <CommandPaletteModal />
        {!isStandaloneApp && (
          <MobileAppModal
            open={mobileModalOpen}
            onOpenChange={setMobileModalOpen}
            deferredPrompt={deferredInstallPrompt}
            onInstalled={() => setDeferredInstallPrompt(null)}
          />
        )}
      </Suspense>
    </div>
  );
};
