type VoiceSubscriber = (voices: SpeechSynthesisVoice[]) => void;

let cachedVoices: SpeechSynthesisVoice[] = [];
const subscribers = new Set<VoiceSubscriber>();
const retryTimers: number[] = [];
let listeningForVoiceChanges = false;

function refreshSpeechVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    cachedVoices = window.speechSynthesis.getVoices() || [];
    subscribers.forEach((subscriber) => subscriber(cachedVoices));

    if (cachedVoices.length > 0) {
      while (retryTimers.length > 0) window.clearTimeout(retryTimers.pop());
    }
  } catch {
    // Voice enumeration is browser-managed and may be unavailable temporarily.
  }
}

/** Ask the browser to populate its installed voice list before audio controls open. */
export function preloadSpeechVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  if (!listeningForVoiceChanges) {
    window.speechSynthesis.addEventListener("voiceschanged", refreshSpeechVoices);
    listeningForVoiceChanges = true;
  }

  refreshSpeechVoices();
  if (cachedVoices.length > 0 || retryTimers.length > 0) return;

  // Some mobile browsers populate their voice list a short time after the first
  // getVoices() call and do not reliably dispatch voiceschanged.
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
