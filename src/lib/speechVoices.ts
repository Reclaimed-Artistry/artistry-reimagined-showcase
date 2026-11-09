import { getNativeVoices, needsNativeTts, type NativeSpeechVoice } from "./nativeSpeech";
import { PUTER_VOICES, isPuterVoicePlatform } from "./puterVoice";

/**
 * A voice the read-along can use. On the web these are real
 * `SpeechSynthesisVoice` objects; in the native app they come from the Android
 * text-to-speech engine, where `nativeIndex` is the position the engine expects
 * when selecting a voice.
 *
 * `source: "puter"` marks one of the app's own neural narrators, which are
 * synthesised in the cloud rather than on the device.
 */
export type AppSpeechVoice = SpeechSynthesisVoice & {
  nativeIndex?: number;
  source?: "device" | "puter";
  puterVoiceId?: "male" | "female";
};

type VoiceSubscriber = (voices: AppSpeechVoice[]) => void;

let cachedVoices: AppSpeechVoice[] = [];
const subscribers = new Set<VoiceSubscriber>();
const retryTimers: number[] = [];
let listeningForVoiceChanges = false;

function publish(voices: AppSpeechVoice[]) {
  cachedVoices = voices;
  subscribers.forEach((subscriber) => subscriber(cachedVoices));
}

/**
 * The app's own AI narrators. They are offered on Android only and are listed
 * first so they read as the default, which is the honest order: on that
 * platform they sound better than anything the device ships with.
 */
function puterVoices(): AppSpeechVoice[] {
  if (!isPuterVoicePlatform()) return [];
  return (["male", "female"] as const).map((id) => {
    const option = PUTER_VOICES[id];
    const label = `${option.label} (AI ${option.gender})`;
    return {
      name: label,
      voiceURI: `puter:${id}`,
      lang: "en-US",
      localService: false,
      default: false,
      source: "puter",
      puterVoiceId: id,
    } as unknown as AppSpeechVoice;
  });
}

function refreshSpeechVoices() {
  if (typeof window === "undefined") return;

  if (isPuterVoicePlatform()) {
    // Android: the neural narrators, plus whatever the device engine has, for
    // when there is no data connection or the AI allowance is spent.
    void getNativeVoices().then((voices) => {
      const device = (voices as unknown as AppSpeechVoice[]).map((voice) => ({
        ...voice,
        source: "device" as const,
      }));
      const merged = [...puterVoices(), ...device];
      if (merged.length > 0 || cachedVoices.length === 0) publish(merged);
    });
    return;
  }

  // In the native app ask the operating system engine for its installed
  // voices. The Android WebView usually exposes speechSynthesis as an empty
  // stub, so its own voice list must not be trusted.
  if (needsNativeTts()) {
    void getNativeVoices().then((voices) => {
      if (voices.length > 0 || cachedVoices.length === 0) {
        publish(voices as unknown as AppSpeechVoice[]);
      }
    });
    return;
  }

  if (!("speechSynthesis" in window)) return;

  try {
    publish((window.speechSynthesis.getVoices() || []) as AppSpeechVoice[]);
  } catch {
    // Voice enumeration is browser-managed and may be unavailable temporarily.
  }
}

/** Ask the platform to populate its installed voice list before audio controls open. */
export function preloadSpeechVoices() {
  if (typeof window === "undefined") return;

  if ("speechSynthesis" in window && !listeningForVoiceChanges) {
    window.speechSynthesis.addEventListener("voiceschanged", refreshSpeechVoices);
    listeningForVoiceChanges = true;
  }

  refreshSpeechVoices();
  // The neural narrators are known immediately, so a retry loop is only useful
  // for the device engine's own (slower) enumeration.
  if (cachedVoices.length > 0 || retryTimers.length > 0) return;

  // Some mobile browsers populate their voice list a short time after the first
  // getVoices() call and do not reliably dispatch voiceschanged. The native
  // engine also needs a moment to bind to its service before it lists voices.
  for (const delay of [250, 800, 1600, 3200]) {
    let timer = 0;
    timer = window.setTimeout(() => {
      const index = retryTimers.indexOf(timer);
      if (index >= 0) retryTimers.splice(index, 1);
      refreshSpeechVoices();
    }, delay);
    retryTimers.push(timer);
  }
}

export function subscribeToSpeechVoices(subscriber: VoiceSubscriber) {
  preloadSpeechVoices();
  subscribers.add(subscriber);
  subscriber(cachedVoices);
  return () => subscribers.delete(subscriber);
}

export type { NativeSpeechVoice };
