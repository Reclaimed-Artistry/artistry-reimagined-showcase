import React, { useRef } from "react";
import {
  AlignJustify,
  ImagePlus,
  ListOrdered,
  Moon,
  RotateCcw,
  Sun,
  Sunrise,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { useBibleApp } from "@/context/useBibleApp";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { ReaderFont, ReaderTheme } from "@/types/bible";

const compressWallpaper = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDimension = 1440;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare the selected image."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let imageData = canvas.toDataURL("image/jpeg", 0.72);
      if (imageData.length > 1_000_000) imageData = canvas.toDataURL("image/jpeg", 0.52);
      resolve(imageData);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened."));
    };
    image.src = objectUrl;
  });

export const TypographyPopover: React.FC = () => {
  const { prefs, updatePrefs } = useBibleApp();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperColor =
    prefs.appearanceBackgroundColor ||
    (prefs.theme === "night" ? "#101813" : prefs.theme === "sepia" ? "#EDE6D5" : "#F6F4EF");

  const themes: { id: ReaderTheme; label: string; icon: React.ReactNode; swatch: string }[] = [
    {
      id: "parchment",
      label: "Light",
      icon: <Sun className="h-3.5 w-3.5" />,
      swatch: "bg-[#F6F4EF] text-[#23352C] border-[#D5D5C9]",
    },
    {
      id: "night",
      label: "Night",
      icon: <Moon className="h-3.5 w-3.5" />,
      swatch: "bg-[#101813] text-[#E8E6D9] border-[#28392F]",
    },
    {
      id: "sepia",
      label: "Sepia",
      icon: <Sunrise className="h-3.5 w-3.5" />,
      swatch: "bg-[#EFE6D5] text-[#2B2118] border-[#CDBFA7]",
    },
  ];

  const fonts: { id: ReaderFont; label: string; sampleClass: string }[] = [
    { id: "scripture", label: "Lora Serif", sampleClass: "font-scripture" },
    { id: "display", label: "Garamond", sampleClass: "font-display text-base" },
    { id: "sans", label: "Clean Sans", sampleClass: "font-sans" },
    { id: "mono", label: "Study Mono", sampleClass: "font-mono text-xs" },
  ];

  const handleWallpaperFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file to use as a background.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("That image is over 16 MB. Choose a smaller image.");
      return;
    }
    try {
      const image = await compressWallpaper(file);
      // Preflight local storage so the wallpaper is still there next time the app opens.
      const storedPrefs = JSON.parse(localStorage.getItem("selah_prefs_v1") || "{}");
      localStorage.setItem(
        "selah_prefs_v1",
        JSON.stringify({ ...storedPrefs, appearanceBackgroundImage: image })
      );
      updatePrefs({ appearanceBackgroundImage: image });
      toast.success("Your background image is saved on this device.");
    } catch {
      toast.error("Could not save that image. Try a smaller JPG, PNG, or WebP file.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open appearance settings"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/50 sm:px-3"
          title="Appearance: theme, background, font, and reading size"
        >
          <Type className="h-3.5 w-3.5 text-primary" />
          <span>Aa</span>
          <span className="hidden md:inline">Appearance</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="max-h-[82vh] w-[min(22rem,calc(100vw-1rem))] space-y-4 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="text-xs font-semibold">Selah Bible Companion</div>
            <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Show or hide the companion panel and its header shortcut.</div>
          </div>
          <Switch
            aria-label="Show Selah Bible Companion"
            checked={prefs.showBibleCompanion}
            onCheckedChange={(value) => updatePrefs({ showBibleCompanion: value })}
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => updatePrefs({ theme: theme.id })}
                className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                  theme.swatch
                } ${prefs.theme === theme.id ? "ring-2 ring-primary ring-offset-1" : "opacity-80 hover:opacity-100"}`}
              >
                {theme.icon}
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Background</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Saved privately on this device</div>
            </div>
            <input
              aria-label="Choose background colour"
              type="color"
              value={wallpaperColor}
              onChange={(event) => updatePrefs({ appearanceBackgroundColor: event.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
            />
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              void handleWallpaperFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-accent"
            >
              <ImagePlus className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{prefs.appearanceBackgroundImage ? "Change image" : "Add background image"}</span>
            </button>
            {(prefs.appearanceBackgroundImage || prefs.appearanceBackgroundColor) && (
              <button
                type="button"
                aria-label="Reset custom background"
                title="Reset to theme background"
                onClick={() => updatePrefs({ appearanceBackgroundColor: null, appearanceBackgroundImage: "", appearanceImageDarken: 28 })}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {prefs.appearanceBackgroundImage && (
            <label className="block rounded-xl border border-border bg-background/75 p-3">
              <span className="mb-2 flex items-center justify-between text-xs font-medium">
                <span>Darken image</span>
                <span className="font-mono text-muted-foreground">{prefs.appearanceImageDarken}%</span>
              </span>
              <input
                aria-label="Darken background image"
                type="range"
                min={0}
                max={80}
                step={1}
                value={prefs.appearanceImageDarken}
                onChange={(event) => updatePrefs({ appearanceImageDarken: Number(event.target.value) })}
                className="w-full accent-primary"
              />
              <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">Increase the overlay to keep text and controls easy to read.</span>
            </label>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reading font
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {fonts.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => updatePrefs({ fontFamily: font.id })}
                className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                  prefs.fontFamily === font.id
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                } ${font.sampleClass}`}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Text size</span>
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
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reading layout</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => updatePrefs({ layoutMode: "verse" })} className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${prefs.layoutMode === "verse" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}>
              <ListOrdered className="h-3.5 w-3.5" /> Verse-by-Verse
            </button>
            <button type="button" onClick={() => updatePrefs({ layoutMode: "paragraph" })} className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${prefs.layoutMode === "paragraph" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}>
              <AlignJustify className="h-3.5 w-3.5" /> Flowing Prose
            </button>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3 text-xs">
          <label className="flex cursor-pointer items-center justify-between"><span className="font-medium">Red-Letter Words of Jesus</span><Switch checked={prefs.redLetter} onCheckedChange={(value) => updatePrefs({ redLetter: value })} /></label>
          <label className="flex cursor-pointer items-center justify-between"><span className="font-medium">Section Headings</span><Switch checked={prefs.showHeadings} onCheckedChange={(value) => updatePrefs({ showHeadings: value })} /></label>
          <label className="flex cursor-pointer items-center justify-between"><span className="font-medium">Translator Footnotes</span><Switch checked={prefs.showFootnotes} onCheckedChange={(value) => updatePrefs({ showFootnotes: value })} /></label>
        </div>
      </PopoverContent>
    </Popover>
  );
};
