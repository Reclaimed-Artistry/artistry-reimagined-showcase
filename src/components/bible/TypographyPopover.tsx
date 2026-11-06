import React from "react";
import { AlignJustify, ListOrdered, Moon, Sun, Sunrise, Type } from "lucide-react";
import { useBibleApp } from "@/context/BibleAppContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { ReaderFont, ReaderTheme } from "@/types/bible";

export const TypographyPopover: React.FC = () => {
  const { prefs, updatePrefs } = useBibleApp();

  const themes: { id: ReaderTheme; label: string; icon: React.ReactNode; swatch: string }[] = [
    {
      id: "parchment",
      label: "Parchment",
      icon: <Sun className="h-3.5 w-3.5" />,
      swatch: "bg-[#FAF7F2] text-[#1C1917] border-[#DDD3C0]",
    },
    {
      id: "sepia",
      label: "Sepia",
      icon: <Sunrise className="h-3.5 w-3.5" />,
      swatch: "bg-[#EFE6D5] text-[#2B2118] border-[#CDBFA7]",
    },
    {
      id: "night",
      label: "Night",
      icon: <Moon className="h-3.5 w-3.5" />,
      swatch: "bg-[#151413] text-[#EDE6DA] border-[#302D2A]",
    },
  ];

  const fonts: { id: ReaderFont; label: string; sampleClass: string }[] = [
    { id: "scripture", label: "Lora Serif", sampleClass: "font-scripture" },
    { id: "display", label: "Garamond", sampleClass: "font-display text-base" },
    { id: "sans", label: "Clean Sans", sampleClass: "font-sans" },
    { id: "mono", label: "Study Mono", sampleClass: "font-mono text-xs" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/50"
          title="Reading Appearance & Typography"
        >
          <Type className="h-3.5 w-3.5 text-primary" />
          <span>Aa</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 space-y-4 p-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sanctuary Theme
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updatePrefs({ theme: t.id })}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
                  t.swatch
                } ${prefs.theme === t.id ? "ring-2 ring-primary ring-offset-1" : "opacity-80 hover:opacity-100"}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Typeface
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {fonts.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => updatePrefs({ fontFamily: f.id })}
                className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                  prefs.fontFamily === f.id
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                } ${f.sampleClass}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Text Size</span>
            <span className="font-mono text-[11px]">{prefs.fontSize}px</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updatePrefs({ fontSize: Math.max(14, prefs.fontSize - 1) })}
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-border bg-background text-xs font-bold hover:bg-accent"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => updatePrefs({ fontSize: 19 })}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => updatePrefs({ fontSize: Math.min(30, prefs.fontSize + 1) })}
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-border bg-background text-sm font-bold hover:bg-accent"
            >
              A+
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reading Layout
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => updatePrefs({ layoutMode: "verse" })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${
                prefs.layoutMode === "verse"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Verse-by-Verse
            </button>
            <button
              type="button"
              onClick={() => updatePrefs({ layoutMode: "paragraph" })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${
                prefs.layoutMode === "paragraph"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <AlignJustify className="h-3.5 w-3.5" />
              Flowing Prose
            </button>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3 text-xs">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="font-medium">Red-Letter Words of Jesus</span>
            <Switch
              checked={prefs.redLetter}
              onCheckedChange={(v) => updatePrefs({ redLetter: v })}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="font-medium">Section Headings</span>
            <Switch
              checked={prefs.showHeadings}
              onCheckedChange={(v) => updatePrefs({ showHeadings: v })}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="font-medium">Translator Footnotes</span>
            <Switch
              checked={prefs.showFootnotes}
              onCheckedChange={(v) => updatePrefs({ showFootnotes: v })}
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
};
