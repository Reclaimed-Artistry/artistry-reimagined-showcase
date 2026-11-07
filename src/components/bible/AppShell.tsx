import React, { useEffect, useState } from "react";
import {
  BookHeart,
  BookOpen,
  Calendar,
  CircleHelp,
  Command,
  Database,
  Feather,
  Flame,
  Search,
  Smartphone,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useBibleApp } from "@/context/BibleAppContext";
import {
  type BeforeInstallPromptEvent,
  initMobileRuntime,
  subscribeAndroidBackButton,
  syncStatusBarWithTheme,
  triggerHaptic,
} from "@/lib/nativeMobile";
import { AiCompanionPanel } from "./AiCompanionPanel";
import { AudioReadAlongBar } from "./AudioReadAlongBar";
import { BibleReaderView } from "./BibleReaderView";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { DailyReflectionView } from "./DailyReflectionView";
import { MobileAppModal } from "./MobileAppModal";
import { ReadingPlansView } from "./ReadingPlansView";
import { SearchAndStudyView } from "./SearchAndStudyView";
import { VerseArtModal } from "./VerseArtModal";
import { VerseCompareDrawer } from "./VerseCompareDrawer";
import { VersionVaultView } from "./VersionVaultView";
import { KidsStoriesView } from "./KidsStoriesView";
import { ExplainerView } from "./ExplainerView";
import type { AppSection } from "@/types/bible";

export const AppShell: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    catalog,
    streakCount,
    prefs,
    updatePrefs,
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
      ["reader", "versions", "plans", "reflection", "study", "kids", "about"].includes(sec)
    ) {
      setActiveSection(sec);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [setActiveSection]);

  // Sync iOS/Android StatusBar & browser theme-color whenever theme changes
  useEffect(() => {
    void syncStatusBarWithTheme(prefs.theme);
  }, [prefs.theme]);

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
      if (activeSection !== "reader") {
        setActiveSection("reader");
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
      id: "reader",
      label: "Bible",
      shortLabel: "Read",
      icon: <BookOpen className="h-4 w-4" />,
    },
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
    setActiveSection(id);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Global Sanctuary Bar (with iPhone Notch / Dynamic Island safe-top padding) */}
      <header className="safe-top sticky top-0 z-30 border-b border-border/80 bg-sidebar/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => handleSelectSection("reader")}
            className="flex items-center gap-2.5 text-left"
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
              <div className="font-display text-xl font-bold leading-none tracking-tight text-foreground">
                Selah Bible
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

            <button
              type="button"
              onClick={() => updatePrefs({ theme: prefs.theme === "night" ? "parchment" : "night" })}
              aria-label={prefs.theme === "night" ? "Switch to light mode" : "Switch to dark mode"}
              title={prefs.theme === "night" ? "Switch to warm light mode" : "Switch to dark mode"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent hover:text-primary"
            >
              {prefs.theme === "night" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setMobileModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent"
              title="Install on iPhone or Android / App Store & Play Store"
            >
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              <span className="hidden md:inline">iOS &amp; Android</span>
            </button>

            <div
              className="hidden items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 sm:inline-flex"
              title="Daily Reading Streak"
            >
              <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{streakCount}d</span>
            </div>

            <button
              type="button"
              onClick={() => setAiPanelOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                aiPanelOpen
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-primary/35 bg-primary/12 text-primary hover:bg-primary/20"
              }`}
              title="Toggle Embedded AI Bible Companion"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Selah AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace + Embedded AI Sidebar */}
      <div className="flex flex-1">
        <main className="pb-mobile-safe min-w-0 flex-1 lg:pb-0">
          {activeSection === "reader" && <BibleReaderView />}
          {activeSection === "versions" && <VersionVaultView />}
          {activeSection === "plans" && <ReadingPlansView />}
          {activeSection === "reflection" && <DailyReflectionView />}
          {activeSection === "study" && <SearchAndStudyView />}
          {activeSection === "kids" && <KidsStoriesView />}
          {activeSection === "about" && <ExplainerView />}
        </main>

        <AiCompanionPanel />
      </div>

      {/* Synchronized Audio Read-Along Dock */}
      <AudioReadAlongBar />

      {/* Mobile Bottom Navigation Bar (with iPhone Home Indicator safe-bottom padding) */}
      <nav className="safe-bottom hide-scrollbar fixed inset-x-0 bottom-0 z-20 flex items-center justify-start gap-0.5 overflow-x-auto border-t border-border bg-card/95 px-1 pt-1.5 backdrop-blur-md lg:hidden">
        {navItems.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => handleSelectSection(item.id)}
              className={`flex min-w-[48px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[9px] font-semibold transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.icon}
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Drawers & Modals */}
      <VerseCompareDrawer />
      <VerseArtModal />
      <CommandPaletteModal />
      <MobileAppModal
        open={mobileModalOpen}
        onOpenChange={setMobileModalOpen}
        deferredPrompt={deferredInstallPrompt}
        onInstalled={() => setDeferredInstallPrompt(null)}
      />
    </div>
  );
};
