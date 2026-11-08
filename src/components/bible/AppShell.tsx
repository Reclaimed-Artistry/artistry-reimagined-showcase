import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  BookHeart,
  BookOpen,
  Calendar,
  CircleHelp,
  Command,
  Database,
  Feather,
  Flame,
  House,
  Search,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useBibleApp } from "@/context/useBibleApp";
import {
  type BeforeInstallPromptEvent,
  initMobileRuntime,
  isStandaloneInstalled,
  subscribeAndroidBackButton,
  syncStatusBarWithTheme,
  triggerHaptic,
} from "@/lib/nativeMobile";
import { TypographyPopover } from "./TypographyPopover";
import { HomeDashboard } from "./HomeDashboard";
import { ReadingReminderScheduler } from "./ReadingReminderScheduler";
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
const ExplainerView = lazy(() => import("./ExplainerView").then((module) => ({ default: module.ExplainerView })));

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
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Initialize native mobile runtime + PWA shortcut deep-link support
  useEffect(() => {
    void initMobileRuntime();

    const params = new URLSearchParams(window.location.search);
    const sec = params.get("section") as AppSection | null;
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
      icon: <House className="h-4 w-4" />,
    },
    {
      id: "reader",
      label: "Read",
      shortLabel: "Read",
      icon: <BookOpen className="h-4 w-4" />,
    },
    ...(prefs.showBibleCompanion
      ? [{
          id: "companion" as const,
          label: "Selah Bible Companion",
          shortLabel: "Selah",
          icon: <Sparkles className="h-4 w-4" />,
        }]
      : []),
    {
      id: "versions",
      label: "Vault",
      shortLabel: "Vault",
      icon: <Database className="h-4 w-4" />,
      badge: `${catalog.length.toLocaleString()}+`,
    },
    {
      id: "plans",
      label: "Reading Plans",
      shortLabel: "Plans",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      id: "reflection",
      label: "Reflect",
      shortLabel: "Reflect",
      icon: <Feather className="h-4 w-4" />,
    },
    {
      id: "study",
      label: "Study",
      shortLabel: "Study",
      icon: <Search className="h-4 w-4" />,
    },
    {
      id: "kids",
      label: "Kids’ Storybook",
      shortLabel: "Kids",
      icon: <BookHeart className="h-4 w-4" />,
    },
    {
      id: "about",
      label: "How Selah Works",
      shortLabel: "About",
      icon: <CircleHelp className="h-4 w-4" />,
    },
  ];

  const handleSelectSection = (id: AppSection) => {
    void triggerHaptic("light");
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
    "--app-wallpaper-color": prefs.appearanceBackgroundColor || (prefs.theme === "night" ? "#050914" : prefs.theme === "sepia" ? "#EDE6D5" : "#FFFFFF"),
    "--app-wallpaper-image": prefs.appearanceBackgroundImage
      ? `url("${prefs.appearanceBackgroundImage}")`
      : "none",
    "--app-wallpaper-darken": prefs.appearanceBackgroundImage
      ? String(Math.max(0, Math.min(80, prefs.appearanceImageDarken)) / 100)
      : "0",
  } as React.CSSProperties;
  const isStandaloneApp = isStandaloneInstalled();

  return (
    <div className="app-shell flex min-h-screen flex-col text-foreground" style={appShellStyle}>
      <ReadingReminderScheduler />
      {/* Top Global Sanctuary Bar (with iPhone Notch / Dynamic Island safe-top padding) */}
      <header className="safe-top sticky top-0 z-30 border-b border-border/80 bg-sidebar/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => handleSelectSection("home")}
            className="flex items-center gap-2.5 text-left"
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
            <div>
              <div className="font-display text-base font-bold leading-none tracking-tight text-foreground sm:text-lg xl:text-xl">
                Selah Multi version Bible
              </div>
              <div className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
                Read • Reflect • Rest
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
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bible Companion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace + Selah Bible Companion Sidebar */}
      <div className="flex flex-1">
        <main className="pb-mobile-safe min-w-0 flex-1">
          <Suspense fallback={<div role="status" className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">Opening your Selah space…</div>}>
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
        </main>

        <Suspense fallback={null}>{prefs.showBibleCompanion && <AiCompanionPanel />}</Suspense>
      </div>

      {/* Synchronized Audio Read-Along Dock */}
      <Suspense fallback={null}><AudioReadAlongBar /></Suspense>

      {/* Persistent bottom navigation (with iPhone Home Indicator safe-bottom padding) */}
      <nav aria-label="Main navigation" className="safe-bottom hide-scrollbar fixed inset-x-0 bottom-0 z-40 flex items-center justify-start gap-0.5 overflow-x-auto border-t border-border bg-card/95 px-1 pt-1.5 backdrop-blur-md lg:justify-center lg:gap-2 lg:px-4">
        {navItems.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => handleSelectSection(item.id)}
              className={`flex min-h-11 min-w-[40px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-semibold transition lg:min-w-0 lg:flex-row lg:gap-2 lg:rounded-lg lg:px-3 lg:py-2 lg:text-xs ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.icon}
              <span className="lg:hidden">{item.shortLabel}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}
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
