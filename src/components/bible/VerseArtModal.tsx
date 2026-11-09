import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Image as ImageIcon, Share2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { formatReference } from "@/data/canonicalBooks";
import { useBibleApp } from "@/context/useBibleApp";
import { shareScriptureNative } from "@/lib/nativeMobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CardTheme {
  id: string;
  label: string;
  bgStart: string;
  bgEnd: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

const CARD_THEMES: CardTheme[] = [
  {
    id: "parchment",
    label: "Heirloom Parchment",
    bgStart: "#FAF6EE",
    bgEnd: "#EFE6D4",
    textColor: "#1E1915",
    accentColor: "#A65A18",
    borderColor: "#DACBB1",
  },
  {
    id: "obsidian",
    label: "Midnight Gold",
    bgStart: "#171513",
    bgEnd: "#25201B",
    textColor: "#F5EFE6",
    accentColor: "#E0A458",
    borderColor: "#3D342B",
  },
  {
    id: "olive",
    label: "Olive Grove",
    bgStart: "#1F2E22",
    bgEnd: "#2E4332",
    textColor: "#F2F5EE",
    accentColor: "#C8D9A3",
    borderColor: "#46634B",
  },
  {
    id: "terracotta",
    label: "Sinai Dusk",
    bgStart: "#4A251D",
    bgEnd: "#2E1612",
    textColor: "#FBF2EE",
    accentColor: "#F2B680",
    borderColor: "#6E3B30",
  },
  {
    id: "ocean",
    label: "Galilee Dawn",
    bgStart: "#13293D",
    bgEnd: "#1F425C",
    textColor: "#F0F6FA",
    accentColor: "#8CC8EC",
    borderColor: "#2E5B7B",
  },
];

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const VerseArtModal: React.FC = () => {
  const {
    verseArtModalOpen,
    setVerseArtModalOpen,
    bookNumber,
    chapter,
    selectedVerses,
    primaryChapterData,
    activeVersion,
  } = useBibleApp();

  const [themeId, setThemeId] = useState<string>("obsidian");
  const [aspect, setAspect] = useState<"square" | "story">("square");
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const sortedVerses = useMemo(
    () => (selectedVerses.length > 0 ? [...selectedVerses].sort((a, b) => a - b) : [1]),
    [selectedVerses]
  );

  const verseText = useMemo(() => {
    if (!primaryChapterData) return "";
    return primaryChapterData.verses
      .filter((v) => sortedVerses.includes(v.verse))
      .map((v) => v.text)
      .join(" ");
  }, [primaryChapterData, sortedVerses]);

  const refLabel = formatReference(
    bookNumber,
    chapter,
    sortedVerses[0],
    sortedVerses.length > 1 ? sortedVerses[sortedVerses.length - 1] : undefined
  );

  const activeTheme = CARD_THEMES.find((t) => t.id === themeId) || CARD_THEMES[0];

  const handleBackgroundImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Please choose an image smaller than 12 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      setUploadedImage(image);
      setUploadedImageName(file.name);
      toast.success("Picture added as the Verse Art background.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("That image could not be opened.");
    };
    image.src = objectUrl;
  };

  useEffect(() => {
    if (!verseArtModalOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = aspect === "story" ? 1620 : 1080;
    canvas.width = width;
    canvas.height = height;

    // Use an uploaded picture as a cover background, or fall back to the selected color theme.
    if (uploadedImage?.naturalWidth && uploadedImage.naturalHeight) {
      const scale = Math.max(width / uploadedImage.naturalWidth, height / uploadedImage.naturalHeight);
      const drawWidth = uploadedImage.naturalWidth * scale;
      const drawHeight = uploadedImage.naturalHeight * scale;
      ctx.drawImage(uploadedImage, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      ctx.fillStyle = themeId === "parchment" ? "rgba(255, 250, 240, 0.48)" : "rgba(8, 12, 18, 0.42)";
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, activeTheme.bgStart);
      grad.addColorStop(1, activeTheme.bgEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle inset frame
    ctx.strokeStyle = activeTheme.borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(56, 56, width - 112, height - 112);

    // Top ornament cross/mark
    ctx.fillStyle = activeTheme.accentColor;
    ctx.font = "600 26px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("✦  SELAH SCRIPTURE  ✦", width / 2, 136);

    // Verse body
    const clipped = verseText.length > 420 ? `${verseText.slice(0, 418)}…` : verseText;
    const fontSize = clipped.length > 240 ? 40 : clipped.length > 140 ? 48 : 56;
    ctx.font = `italic 500 ${fontSize}px Georgia, "Lora", serif`;
    ctx.fillStyle = activeTheme.textColor;

    const lines = wrapCanvasLines(ctx, `“${clipped}”`, width - 220);
    const lineHeight = fontSize * 1.48;
    const totalTextHeight = lines.length * lineHeight;
    let y = height / 2 - totalTextHeight / 2 + fontSize / 2;

    for (const line of lines) {
      ctx.fillText(line, width / 2, y);
      y += lineHeight;
    }

    // Reference & Translation Footer
    ctx.fillStyle = activeTheme.accentColor;
    ctx.font = `700 30px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`${refLabel.toUpperCase()}  •  ${activeVersion.shortName}`, width / 2, y + 48);
  }, [verseArtModalOpen, activeTheme, themeId, aspect, verseText, refLabel, activeVersion.shortName, uploadedImage]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `selah-${refLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
    toast.success("Downloaded high-resolution Verse Card (.png)!");
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(`“${verseText}” — ${refLabel} (${activeVersion.shortName})`);
    toast.success("Copied formatted quote!");
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    const pngDataUrl = canvas ? canvas.toDataURL("image/png") : undefined;
    const fileName = `selah-${refLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    const quote = `“${verseText}” — ${refLabel} (${activeVersion.shortName})`;
    const res = await shareScriptureNative({
      title: `${refLabel} (${activeVersion.shortName})`,
      text: quote,
      pngDataUrl,
      fileName,
    });
    if (res === "copied") {
      toast.success("Copied verse quote to clipboard!");
    }
  };

  return (
    <Dialog open={verseArtModalOpen} onOpenChange={setVerseArtModalOpen}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold sm:text-2xl">
            <ImageIcon className="h-5 w-5 text-primary" />
            Shareable Scripture Art Studio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleBackgroundImage}
              aria-label="Upload a background picture"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload picture
            </button>
            {uploadedImageName ? (
              <>
                <span className="max-w-[180px] truncate text-xs text-muted-foreground" title={uploadedImageName}>
                  {uploadedImageName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedImage(null);
                    setUploadedImageName("");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Remove uploaded background picture"
                >
                  <X className="h-3 w-3" />Remove
                </button>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground">PNG, JPEG, or WebP • up to 12 MB</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {CARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  className={`rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
                    themeId === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex rounded-xl border border-border bg-card p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAspect("square")}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  aspect === "square" ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                Square 1:1
              </button>
              <button
                type="button"
                onClick={() => setAspect("story")}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  aspect === "story" ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                Story 2:3
              </button>
            </div>
          </div>

          <div className="flex min-h-0 justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 p-2 sm:p-3">
            <canvas
              ref={canvasRef}
              className="h-auto max-h-[38dvh] max-w-full w-auto rounded-xl object-contain shadow-md sm:max-h-[min(42dvh,380px)]"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Text
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/12 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share (iOS / Android)
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            >
              <Download className="h-3.5 w-3.5" />
              Save PNG
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
