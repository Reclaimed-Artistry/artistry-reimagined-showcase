import { getNativeVoices, needsNativeTts, type NativeSpeechVoice } from "./nativeSpeech";

/**
 * A voice the read-along can use. On the web these are real
 * `SpeechSynthesisVoice` objects; in the native app they come from the Android
 * text-to-speech engine, where `nativeIndex` is the position the engine expects
 * when selecting a voice.
 */
export type AppSpeechVoice = SpeechSynthesisVoice & { nativeIndex?: number };

type VoiceSubscriber = (voices: AppSpeechVoice[]) => void;

let cachedVoices: AppSpeechVoice[] = [];
const subscribers = new Set<VoiceSubscriber>();
const retryTimers: number[] = [];
let listeningForVoiceChanges = false;

function publish(voices: AppSpeechVoice[]) {
  cachedVoices = voices;
  subscribers.forEach((subscriber) => subscriber(cachedVoices));
}

function refreshSpeechVoices() {
  if (typeof window === "undefined") return;

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
