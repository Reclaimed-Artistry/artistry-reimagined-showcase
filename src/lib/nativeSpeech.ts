import { Capacitor } from "@capacitor/core";

/**
 * Android System WebView does not implement the Web Speech API
 * (`window.speechSynthesis` is undefined inside a Capacitor app), so the
 * read-along voice has to go through the operating system's own TTS engine.
 * The web build keeps using the browser API.
 */

type NativeVoice = {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
};

type NativeTextToSpeech = {
  speak: (options: {
    text: string;
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: number;
    queueStrategy?: number;
  }) => Promise<void>;
  stop: () => Promise<void>;
  getSupportedVoices: () => Promise<{ voices: NativeVoice[] }>;
  isLanguageSupported: (options: { lang: string }) => Promise<{ supported: boolean }>;
  openInstall: () => Promise<void>;
};

let pluginPromise: Promise<NativeTextToSpeech | null> | null = null;

export function isNativeTtsPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** True when the platform has to speak through the native engine instead of Web Speech. */
export function needsNativeTts(): boolean {
  if (!isNativeTtsPlatform()) return false;
  if (typeof window === "undefined") return false;
  return !("speechSynthesis" in window);
}

async function loadPlugin(): Promise<NativeTextToSpeech | null> {
  if (!isNativeTtsPlatform()) return null;
  if (!pluginPromise) {
    // Kept dynamic so the web bundle never loads the native plugin.
    pluginPromise = import("@capacitor-community/text-to-speech")
      .then((module) => (module.TextToSpeech as unknown as NativeTextToSpeech) ?? null)
      .catch(() => null);
  }
  return pluginPromise;
}

/**
 * The plugin's `speak` rejects when the engine is missing or the language is
 * not installed, but a Gradle build that never picked up the plugin rejects
 * with Capacitor's "not implemented" message. Distinguish the two so the UI can
 * tell the user to rebuild instead of sending them to device settings.
 */
const NOT_BUILT_PATTERN = /not implemented|unimplemented|plugin.*not available/i;

export type NativeSpeechVoice = {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
  /** Position in the engine's own ordered voice list; the plugin selects by index. */
  nativeIndex: number;
};

export async function getNativeVoices(): Promise<NativeSpeechVoice[]> {
  const plugin = await loadPlugin();
  if (!plugin) return [];
  try {
    const { voices } = await plugin.getSupportedVoices();
    return (voices || []).map((voice, index) => ({
      name: voice.name || voice.voiceURI,
      lang: voice.lang || "und",
      voiceURI: voice.voiceURI || voice.name,
      localService: voice.localService !== false,
      default: Boolean(voice.default),
      nativeIndex: index,
    }));
  } catch {
    return [];
  }
}

export async function isNativeLanguageSupported(lang: string): Promise<boolean> {
  const plugin = await loadPlugin();
  if (!plugin) return false;
  try {
    const { supported } = await plugin.isLanguageSupported({ lang });
    return Boolean(supported);
  } catch {
    return false;
  }
}

/**
 * Speaks one chunk and resolves when the engine finishes. Rejects when the
 * engine is missing, the language is not installed, or synthesis fails.
 */
export async function speakNative(
  text: string,
  lang: string,
  rate: number,
  voiceIndex?: number,
): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) throw new Error("Text-to-speech is not available in this build.");

  try {
    await plugin.speak({
      text,
      lang,
      rate: Math.min(4, Math.max(0.1, rate || 1)),
      pitch: 1,
      volume: 1,
      ...(typeof voiceIndex === "number" && voiceIndex >= 0 ? { voice: voiceIndex } : {}),
      // 0 = Flush: starting a verse stops the previous one instead of queueing it.
      queueStrategy: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (NOT_BUILT_PATTERN.test(message)) {
      throw new Error("Text-to-speech is not available in this build.");
    }
    throw error;
  }
}

export async function stopNativeSpeech(): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.stop();
  } catch {
    // Nothing is speaking.
  }
}

/** Opens the Android Text-to-speech settings screen so missing voices can be installed. */
export async function openNativeTtsInstall(): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.openInstall();
  } catch {
    // Some devices do not expose the install intent.
  }
}

/**
 * Picks the engine voice that best matches the user's preference. The plugin
 * selects voices by index, so a saved URI has to be resolved to a position in
 * the same ordered list the engine reports.
 */
export function resolveNativeVoiceIndex(
  voices: NativeSpeechVoice[],
  options: { languagePrefix: string; preferredVoiceURI?: string; preferredVoiceGender?: "auto" | "female" | "male" },
): number | undefined {
  if (voices.length === 0) return undefined;
  const prefix = options.languagePrefix.toLowerCase();
  const forLanguage = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  const pool = forLanguage.length > 0 ? forLanguage : voices;

  const saved = options.preferredVoiceURI
    ? pool.find((voice) => voice.voiceURI === options.preferredVoiceURI)
    : undefined;
  if (saved) return saved.nativeIndex;

  const gender = options.preferredVoiceGender || "auto";
  if (gender !== "auto") {
    const gendered = pool.filter((voice) => nativeVoiceGender(voice) === gender);
    if (gendered.length > 0) return preferredFirst(gendered).nativeIndex;
  }

  return preferredFirst(pool).nativeIndex;
}

const HIGH_QUALITY_VOICE = /natural|neural|enhanced|premium|network/i;

/**
 * Android's engine usually lists several voices per language. The higher
 * quality ones (`*-network`, `#female_2-local` on newer engines) sound far
 * closer to natural speech than the compact fallback, so prefer them and only
 * drop to a local voice when the device has no enhanced one installed.
 */
function preferredFirst(voices: NativeSpeechVoice[]): NativeSpeechVoice {
  const enhanced = voices.find((voice) => HIGH_QUALITY_VOICE.test(voice.voiceURI));
  if (enhanced) return enhanced;

  const local = voices.filter((voice) => voice.localService);
  return (local.length > 0 ? local : voices)[0];
}

/**
 * Android engine voices are named like `en-us-x-sfg#female_1-local`, so the
 * gender is in the voice URI, not the human-readable name.
 */
export function nativeVoiceGender(voice: { name: string; voiceURI: string }): "female" | "male" | null {
  const label = `${voice.voiceURI} ${voice.name}`.toLowerCase();
  if (/#female|_female|\bfemale\b|woman|feminine/.test(label)) return "female";
  if (/#male|_male|\bmale\b|\bman\b|masculine/.test(label.replace(/#female|_female/g, ""))) return "male";
  return null;
}
