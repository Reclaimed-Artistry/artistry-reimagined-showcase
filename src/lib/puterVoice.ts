import { Capacitor } from "@capacitor/core";

/**
 * Puter.js neural text-to-speech.
 *
 * This path is deliberately **Android-only**: it is the one platform where the
 * app has no acceptable built-in voice. The Android System WebView ships an
 * empty `speechSynthesis` stub, so the fallback is whatever voice pack the
 * device happens to have installed — and many phones have none, or only the
 * robotic compact one. Puter gives every Android phone the same consistent,
 * natural-sounding male and female narrator without bundling a neural model
 * (hundreds of MB) or provisioning a paid API key.
 *
 * Everything here is loaded lazily, so the web build never downloads the SDK
 * and never touches `window.puter`.
 *
 * Puter synthesises in the cloud, so a data connection is required. The UI is
 * responsible for telling the reader that; see `describePuterVoiceFailure`.
 */

const PUTER_SCRIPT_SRC = "https://js.puter.com/v2/";
const SCRIPT_MARKER = "data-selah-puter";

/** Puter rejects a single synthesis request over 3000 characters. */
const PUTER_MAX_INPUT_CHARS = 2800;

/** How long one chunk may take before we fall back to the device voice. */
const SYNTHESIS_TIMEOUT_MS = 20_000;

type PuterTextToSpeech = (
  text: string,
  options?: Record<string, unknown>,
) => Promise<HTMLAudioElement>;

type PuterSdk = {
  ai?: { txt2speech?: PuterTextToSpeech };
  auth?: {
    isSignedIn?: () => boolean;
    signIn?: () => Promise<unknown>;
  };
};

declare global {
  interface Window {
    puter?: PuterSdk;
  }
}

export type PuterVoiceFailure =
  | "offline"
  | "slow-network"
  | "sign-in"
  | "quota"
  | "unsupported-language"
  | "cancelled"
  | "unavailable";

export class PuterVoiceError extends Error {
  readonly reason: PuterVoiceFailure;

  constructor(reason: PuterVoiceFailure, message: string) {
    super(message);
    this.name = "PuterVoiceError";
    this.reason = reason;
  }
}

export type PuterVoiceOption = {
  gender: "male" | "female";
  /** Shown in the voice picker next to the gender. */
  label: string;
  provider: string;
  model: string;
  voice: string;
};

/**
 * Two narrators, one of each gender, chosen because they read long-form prose
 * evenly. Scripture is neither a notification nor a slogan.
 */
export const PUTER_VOICES: Record<"male" | "female", PuterVoiceOption> = {
  male: {
    gender: "male",
    label: "Onyx",
    provider: "openai",
    model: "gpt-4o-mini-tts",
    voice: "onyx",
  },
  female: {
    gender: "female",
    label: "Nova",
    provider: "openai",
    model: "gpt-4o-mini-tts",
    voice: "nova",
  },
};

/**
 * "Auto" follows the studio narration default, which is the male reader, so the
 * AI voice and the studio recordings sound like the same app.
 */
export function resolvePuterVoice(gender: "auto" | "female" | "male"): PuterVoiceOption {
  return gender === "female" ? PUTER_VOICES.female : PUTER_VOICES.male;
}

export function isPuterVoicePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export function isDeviceOnline(): boolean {
  try {
    return navigator.onLine !== false;
  } catch {
    return true;
  }
}

const offlineError = () =>
  new PuterVoiceError("offline", "AI voices need a data connection.");

let sdkPromise: Promise<PuterSdk> | null = null;

/** Injects `js.puter.com/v2` once and resolves with the global SDK. */
export function loadPuterVoiceSdk(): Promise<PuterSdk> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new PuterVoiceError("unavailable", "Puter is not available here."));
  }

  if (window.puter?.ai?.txt2speech) return Promise.resolve(window.puter);
  if (sdkPromise) return sdkPromise;
  if (!isDeviceOnline()) return Promise.reject(offlineError());

  sdkPromise = new Promise<PuterSdk>((resolve, reject) => {
    const failed = (reason: PuterVoiceFailure, message: string) => {
      // Drop the dead tag as well, or a later Retry would find it, wait on a
      // script that already errored, and never load the SDK again.
      try {
        document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`)?.remove();
      } catch {
        // Nothing to clean up.
      }
      sdkPromise = null;
      reject(new PuterVoiceError(reason, message));
    };

    const settle = () => {
      const sdk = window.puter;
      if (sdk?.ai?.txt2speech) resolve(sdk);
      else failed("unavailable", "The AI voice service could not be loaded.");
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`);
    if (existing) {
      if (window.puter?.ai?.txt2speech) {
        resolve(window.puter);
        return;
      }
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener(
        "error",
        () => failed("unavailable", "The AI voice service could not be loaded."),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PUTER_SCRIPT_SRC;
    script.async = true;
    script.setAttribute(SCRIPT_MARKER, "true");
    script.addEventListener("load", settle, { once: true });
    script.addEventListener(
      "error",
      () =>
        failed(
          isDeviceOnline() ? "unavailable" : "offline",
          "The AI voice service could not be reached.",
        ),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return sdkPromise;
}

/** Puter rejects with plain objects as often as with `Error`s. */
function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  const record = error as {
    message?: unknown;
    msg?: unknown;
    error?: unknown;
    code?: unknown;
    status?: unknown;
  };
  const nested =
    record.error && typeof record.error === "object"
      ? (record.error as { message?: unknown; code?: unknown; status?: unknown })
      : null;
  return [
    record.message,
    record.msg,
    typeof record.error === "string" ? record.error : undefined,
    record.code,
    record.status,
    nested?.message,
    nested?.code,
    nested?.status,
  ]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(" ");
}

export function toPuterVoiceError(error: unknown): PuterVoiceError {
  if (error instanceof PuterVoiceError) return error;

  const text = messageOf(error);
  const lower = text.toLowerCase();

  // Checked before the network patterns: "not available in this app" style
  // messages mention the network too and would otherwise read as offline.
  if (
    /popup_blocked|auth_canceled|auth_window_closed|auth_timeout|not_available_in_app|unsupported_origin|sign.?in|unauthor|token_auth_failed/.test(
      lower,
    )
  ) {
    return new PuterVoiceError("sign-in", "Puter sign-in was not completed.");
  }
  if (
    /insufficient_funds|subscription_required|usage_limit|not enough (funding|credit)|balance/.test(
      lower,
    ) ||
    /(^|\s)402(\s|$)/.test(lower)
  ) {
    return new PuterVoiceError("quota", "The AI voice allowance is used up.");
  }
  // Only trust an explicit language complaint; "unsupported" alone also appears
  // in browser-support messages.
  if (/language .*not (supported|available)|not supported language|unsupported language/.test(lower)) {
    return new PuterVoiceError(
      "unsupported-language",
      "This language is not available as an AI voice.",
    );
  }
  if (!isDeviceOnline()) return offlineError();
  if (
    /network|failed to fetch|networkerror|err_internet|err_connection|err_name|err_address|offline|cors/.test(
      lower,
    )
  ) {
    return offlineError();
  }
  if (/time(d)? ?out|abort/.test(lower)) {
    return new PuterVoiceError("slow-network", "The AI voice service timed out.");
  }
  return new PuterVoiceError("unavailable", text || "The AI voice service is unavailable.");
}

/** Splits at a sentence or word boundary so nothing is cut mid-word. */
export function chunkForPuter(text: string, limit = PUTER_MAX_INPUT_CHARS): string[] {
  const value = (text || "").trim();
  if (!value) return [];
  if (value.length <= limit) return [value];

  const chunks: string[] = [];
  let rest = value;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const breakAt = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("; "),
      window.lastIndexOf(", "),
      window.lastIndexOf(" "),
    );
    const cut = breakAt > limit * 0.5 ? breakAt + 1 : limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * Synthesises every chunk of `text` and resolves with the audio elements in
 * reading order. Almost always a single element — a verse is far under the
 * 3000-character ceiling — but a long verse split across chunks still reads
 * continuously.
 */
export async function synthesizeWithPuter(
  text: string,
  options: { voice: PuterVoiceOption; language?: string },
): Promise<HTMLAudioElement[]> {
  const chunks = chunkForPuter(text);
  if (chunks.length === 0) {
    throw new PuterVoiceError("unavailable", "There is nothing to read.");
  }
  if (!isDeviceOnline()) throw offlineError();

  const sdk = await loadPuterVoiceSdk();
  const txt2speech = sdk.ai?.txt2speech;
  if (typeof txt2speech !== "function") {
    throw new PuterVoiceError("unavailable", "The AI voice service is unavailable.");
  }

  const language = (options.language || "").trim();
  // The narrator voices are English; only send a language for other translations.
  const sendLanguage = Boolean(language) && !language.toLowerCase().startsWith("en");

  const elements: HTMLAudioElement[] = [];
  for (const chunk of chunks) {
    let timer: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(
        () =>
          reject(
            new PuterVoiceError("slow-network", "The AI voice service timed out."),
          ),
        SYNTHESIS_TIMEOUT_MS,
      );
    });

    try {
      const request = txt2speech.call(sdk.ai, chunk, {
        provider: options.voice.provider,
        model: options.voice.model,
        voice: options.voice.voice,
        ...(sendLanguage ? { language } : {}),
      });
      // A timed-out request can still settle later; swallow it so it never
      // surfaces as an unhandled rejection.
      request.catch(() => {});

      const audio = await Promise.race([request, timeout]);
      if (!audio || typeof audio.play !== "function") {
        throw new PuterVoiceError("unavailable", "The AI voice returned no audio.");
      }
      elements.push(audio);
    } catch (error) {
      throw toPuterVoiceError(error);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  return elements;
}

/** Plays one audio element and resolves when it ends. Rejects if it cannot. */
export function playPuterAudio(audio: HTMLAudioElement, rate: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      audio.playbackRate = Math.min(2, Math.max(0.5, rate || 1));
    } catch {
      // Some WebViews refuse playbackRate changes before metadata is loaded.
    }

    const cleanup = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new PuterVoiceError("unavailable", "The AI voice audio could not be played."));
    };

    audio.addEventListener("ended", onEnded, { once: true });
    audio.addEventListener("error", onError, { once: true });

    try {
      const started = audio.play();
      if (started && typeof started.catch === "function") {
        started.catch((error: unknown) => {
          cleanup();
          reject(toPuterVoiceError(error));
        });
      }
    } catch (error) {
      cleanup();
      reject(toPuterVoiceError(error));
    }
  });
}

/** Stops an element mid-playback without rejecting its `playPuterAudio` caller. */
export function haltPuterAudio(audio: HTMLAudioElement | null | undefined): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // Element already released.
  }
}

/**
 * Wording for the read-along banner. `offline` and `slow-network` are the two
 * the reader can act on, so they are phrased as an instruction with a next
 * step rather than a status line.
 */
export function describePuterVoiceFailure(reason: PuterVoiceFailure): string {
  switch (reason) {
    case "offline":
      return "AI voices need mobile data. Turn on data (or Wi-Fi) and tap Retry AI voice. Reading with the device voice until then.";
    case "slow-network":
      return "The AI voice needs more data than this connection can carry right now. Check your signal and tap Retry AI voice. Reading with the device voice until then.";
    case "sign-in":
      return "AI voices need a one-time Puter sign-in and this screen could not finish it. Reading with the device voice. Tap Retry AI voice to try the sign-in again.";
    case "quota":
      return "This device's AI voice allowance is used up for now. Reading with the device voice instead.";
    case "unsupported-language":
      return "AI voices are not available for this language yet. Reading with the device voice instead.";
    case "cancelled":
      return "";
    case "unavailable":
    default:
      return "The AI voice service is unavailable right now. Reading with the device voice instead.";
  }
}
