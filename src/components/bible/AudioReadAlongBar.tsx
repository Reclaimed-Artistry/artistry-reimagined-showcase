import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Headphones,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { getBookMeta } from "@/data/canonicalBooks";
import {
  subscribeToSpeechVoices,
  type AppSpeechVoice,
} from "@/lib/speechVoices";
import {
  needsNativeTts,
  nativeVoiceGender,
  openNativeTtsInstall,
  resolveNativeVoiceIndex,
  speakNative,
  stopNativeSpeech,
  type NativeSpeechVoice,
} from "@/lib/nativeSpeech";
import {
  PUTER_VOICES,
  PuterVoiceError,
  describePuterVoiceFailure,
  haltPuterAudio,
  isDeviceOnline,
  loadPuterVoiceSdk,
  isPuterVoicePlatform,
  playPuterAudio,
  resolvePuterVoice,
  synthesizeWithPuter,
  type PuterVoiceFailure,
  type PuterVoiceOption,
} from "@/lib/puterVoice";
import { useBibleApp } from "@/context/useBibleApp";

/** True for the app's own cloud narrators, which the device plugin cannot drive. */
function isPuterVoice(voice: { source?: string }): boolean {
  return voice.source === "puter";
}

type VoicePickerPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

function getVoiceGender(voice: SpeechSynthesisVoice): "female" | "male" | null {
  const metadataGender = (voice as SpeechSynthesisVoice & { gender?: string }).gender?.toLowerCase();
  if (metadataGender && /female|woman|feminine/.test(metadataGender)) return "female";
  if (metadataGender && /male|man|masculine/.test(metadataGender)) return "male";

  // Android engine voices are named like `en-us-x-sfg#female_1-local`, so the
  // gender only appears in the voice URI there.
  const nativeGender = nativeVoiceGender({ name: voice.name, voiceURI: voice.voiceURI });
  if (nativeGender) return nativeGender;

  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (/\b(female|woman|feminine|girl)\b|samantha|victoria|karen|moira|tessa|zira|susan|allison|ava|aria|emma|jenny|hazel/.test(label)) {
    return "female";
  }
  if (/\b(male|man|masculine|boy)\b|daniel|david|alex|guy|fred|tom|mark|james|john|aaron|arthur|oliver|liam|ryan|matthew|thomas|george|andrew|jorge|juan|pablo|carlos|miguel|diego/.test(label)) {
    return "male";
  }
  return null;
}

export const AudioReadAlongBar: React.FC = () => {
  const {
    audioBarOpen,
    setAudioBarOpen,
    bookNumber,
    chapter,
    activeVersion,
    primaryChapterData,
    activeAudioVerse,
    setActiveAudioVerse,
    audioStartRequest,
    nextChapter,
    prefs,
    updatePrefs,
  } = useBibleApp();

  const [isPlaying, setIsPlaying] = useState(false);
  const [engineMode, setEngineMode] = useState<"speech" | "studio">("speech");
  const [studioReaderKey, setStudioReaderKey] = useState<string>("");
  const [voices, setVoices] = useState<AppSpeechVoice[]>([]);
  const [nativeSpeechUnavailable, setNativeSpeechUnavailable] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // AI voices are the app's own neural narrators, served by Puter. They need a
  // data connection; the device engine stays as the offline fallback.
  const aiVoiceAvailable = isPuterVoicePlatform();
  // Set when the AI voice fails mid-chapter. Session-only on purpose: a dropped
  // connection should not rewrite the reader's saved narrator choice.
  const [aiVoiceSuppressed, setAiVoiceSuppressed] = useState(false);
  const [online, setOnline] = useState<boolean>(() => isDeviceOnline());
  const [aiVoiceNotice, setAiVoiceNotice] = useState<{
    reason: PuterVoiceFailure;
    message: string;
  } | null>(null);
  const [aiVoicePending, setAiVoicePending] = useState(false);
  // `step()` retries the same verse the moment the AI voice fails, before React
  // has re-rendered, so the suppression has to be readable synchronously too.
  const aiSuppressedRef = useRef(false);
  const suppressAiVoice = useCallback((suppressed: boolean) => {
    aiSuppressedRef.current = suppressed;
    setAiVoiceSuppressed(suppressed);
  }, []);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [voicePickerPosition, setVoicePickerPosition] = useState<VoicePickerPosition | null>(null);
  const voicePickerRef = useRef<HTMLDivElement>(null);
  const voicePickerButtonRef = useRef<HTMLButtonElement>(null);
  const voicePickerPopoverRef = useRef<HTMLDivElement>(null);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);

  const voiceLanguagePrefix = (activeVersion.languageCode || "en").slice(0, 2).toLowerCase();
  // The neural narrators are English; other translations fall back to whatever
  // the device engine has installed for them.
  const aiVoiceForLanguage = aiVoiceAvailable && voiceLanguagePrefix === "en";
  const languageVoices = useMemo(
    () => voices.filter((voice) => voice.lang.toLowerCase().startsWith(voiceLanguagePrefix)),
    [voices, voiceLanguagePrefix]
  );
  const deviceLanguageVoices = useMemo(
    () => languageVoices.filter((voice) => voice.source !== "puter"),
    [languageVoices]
  );

  const speechSessionRef = useRef<number>(0);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientCtxRef = useRef<AudioContext | null>(null);
  const sleepTimeoutRef = useRef<number | null>(null);

  const bookMeta = getBookMeta(bookNumber);
  const verses = useMemo(() => primaryChapterData?.verses || [], [primaryChapterData]);
  const studioLinks = useMemo(
    () => primaryChapterData?.audioLinks || {},
    [primaryChapterData]
  );
  const studioKeys = useMemo(() => Object.keys(studioLinks), [studioLinks]);
  const femaleVoices = useMemo(
    () => deviceLanguageVoices.filter((voice) => getVoiceGender(voice) === "female"),
    [deviceLanguageVoices]
  );
  const maleVoices = useMemo(
    () => deviceLanguageVoices.filter((voice) => getVoiceGender(voice) === "male"),
    [deviceLanguageVoices]
  );
  const otherVoices = useMemo(
    () => deviceLanguageVoices.filter((voice) => getVoiceGender(voice) === null),
    [deviceLanguageVoices]
  );

  /**
   * Which narrator reads this chapter.
   *
   * The AI voices are the default on Android, because they are the only ones
   * guaranteed to sound the same on every phone. Choosing a voice from the
   * device list is an explicit downgrade to the phone's own engine, which is
   * the only option that works with no connection at all.
   */
  const preferredIsPuterVoice = prefs.preferredVoiceURI.startsWith("puter:");
  const preferredIsDeviceVoice = prefs.preferredVoiceURI !== "" && !preferredIsPuterVoice;
  const useAiVoice =
    aiVoiceForLanguage &&
    prefs.aiVoiceEnabled &&
    !aiVoiceSuppressed &&
    !preferredIsDeviceVoice;
  const aiVoiceGender: "male" | "female" = preferredIsPuterVoice
    ? prefs.preferredVoiceURI === "puter:female"
      ? "female"
      : "male"
    : prefs.preferredVoiceGender === "female"
      ? "female"
      : "male";

  useEffect(() => {
    if (studioKeys.length > 0 && !studioKeys.includes(studioReaderKey)) {
      const maleStudioReader = studioKeys.find((key) => /dan hays/i.test(key));
      setStudioReaderKey(maleStudioReader || studioKeys[0]);
    } else if (studioKeys.length === 0 && engineMode === "studio") {
      setEngineMode("speech");
    }
  }, [studioKeys, studioReaderKey, engineMode]);

  // Use the voice list preloaded by AppShell; it includes every voice the
  // browser/operating system exposes across its installed languages.
  useEffect(() => subscribeToSpeechVoices(setVoices), []);

  // Warm the AI voice SDK while the reader is still looking at the bar, so the
  // first verse is not held up by a script download.
  useEffect(() => {
    if (!audioBarOpen || !aiVoiceAvailable) return;
    void loadPuterVoiceSdk().catch(() => {
      // The error is reported with a retry button when playback needs the SDK.
    });
  }, [audioBarOpen, aiVoiceAvailable]);

  // AI voices are synthesised in the cloud, so follow the connection state. A
  // reader who turns data on mid-chapter gets the neural voice back without
  // reopening the reader.
  useEffect(() => {
    if (!aiVoiceAvailable) return;
    const handleOnline = () => {
      setOnline(true);
      setAiVoiceNotice(null);
      setSpeechError(null);
    };
    const handleOffline = () => {
      setOnline(false);
      setAiVoiceNotice({
        reason: "offline",
        message: describePuterVoiceFailure("offline"),
      });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [aiVoiceAvailable]);

  // An empty device engine is only a problem when the AI voice cannot cover for
  // it. On Android the neural narrators are always listed, so this no longer
  // fires just because the phone has no speech engine.
  useEffect(() => {
    if (!needsNativeTts()) return;
    // With AI voices on and data available, an empty device engine is harmless.
    const covered = useAiVoice && online;
    if (covered || deviceLanguageVoices.length > 0) {
      setNativeSpeechUnavailable(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (deviceLanguageVoices.length === 0) setNativeSpeechUnavailable(true);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [deviceLanguageVoices.length, useAiVoice, online]);

  useEffect(() => {
    if (!voicePickerOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !voicePickerRef.current?.contains(target) &&
        !voicePickerPopoverRef.current?.contains(target)
      ) {
        setVoicePickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVoicePickerOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [voicePickerOpen]);

  useEffect(() => {
    if (!voicePickerOpen) {
      setVoicePickerPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = voicePickerButtonRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const margin = 12;
      const gap = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.max(200, Math.min(352, viewportWidth - margin * 2));
      const left = Math.max(margin, Math.min(anchor.right - width, viewportWidth - width - margin));
      const spaceAbove = Math.max(0, anchor.top - gap - margin);
      const spaceBelow = Math.max(0, viewportHeight - anchor.bottom - gap - margin);
      const openAbove = spaceAbove >= spaceBelow;
      const maxHeight = Math.max(100, Math.min(480, openAbove ? spaceAbove : spaceBelow));

      setVoicePickerPosition({
        left,
        width,
        maxHeight,
        ...(openAbove
          ? { bottom: Math.max(margin, viewportHeight - anchor.top + gap) }
          : { top: Math.min(viewportHeight - margin, anchor.bottom + gap) }),
      });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [voicePickerOpen]);

  // Gentle WebAudio Contemplative Pad
  useEffect(() => {
    if (isPlaying && prefs.ambientSound && audioBarOpen) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        ambientCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.022, ctx.currentTime + 2.0);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(340, ctx.currentTime);

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        const freqs = [130.81, 196.0, 261.63, 329.63]; // Warm C major drone
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.25, ctx.currentTime);
          osc.connect(g);
          g.connect(filter);
          osc.start();
        });
      } catch {
        // Ignore WebAudio restriction
      }
    }

    return () => {
      if (ambientCtxRef.current) {
        ambientCtxRef.current.close().catch(() => {});
        ambientCtxRef.current = null;
      }
    };
  }, [isPlaying, prefs.ambientSound, audioBarOpen]);

  const stopAllPlayback = useCallback(() => {
    speechSessionRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (needsNativeTts()) {
      void stopNativeSpeech();
    }
    haltPuterAudio(aiAudioRef.current);
    aiAudioRef.current = null;
    setAiVoicePending(false);
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  // Sleep timer
  useEffect(() => {
    if (sleepTimeoutRef.current) {
      window.clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    if (sleepMinutes && sleepMinutes > 0 && isPlaying) {
      sleepTimeoutRef.current = window.setTimeout(() => {
        stopAllPlayback();
        setSleepMinutes(null);
      }, sleepMinutes * 60 * 1000);
    }
    return () => {
      if (sleepTimeoutRef.current) window.clearTimeout(sleepTimeoutRef.current);
    };
  }, [sleepMinutes, isPlaying, stopAllPlayback]);

  const speakFromIndex = useCallback(
    (startIndex: number) => {
      if (typeof window === "undefined") return;
      const useNative = needsNativeTts();
      // On the web speechSynthesis must exist; in the native app the operating
      // system engine speaks instead (the Android WebView has no Web Speech).
      if (!useNative && !("speechSynthesis" in window)) return;
      if (verses.length === 0) return;

      setSpeechError(null);
      setAiVoiceNotice(null);
      if (useNative) {
        void stopNativeSpeech();
      } else {
        // Keep the browser list fresh: a mobile browser may have populated it
        // since the bar opened. If it is still empty, Web Speech will be silent,
        // so say so instead of appearing to play.
        const availableVoices = window.speechSynthesis.getVoices() || [];
        if (availableVoices.length === 0) {
          setIsPlaying(false);
          setSpeechError(
            "This browser has no speech voices available. Open the app version, or install a text-to-speech engine for your device.",
          );
          return;
        }
        window.speechSynthesis.cancel();
      }
      const sessionId = ++speechSessionRef.current;
      setIsPlaying(true);

      const step = (idx: number) => {
        if (speechSessionRef.current !== sessionId) return;
        if (idx >= verses.length) {
          setIsPlaying(false);
          setActiveAudioVerse(null);
          if (prefs.autoAdvanceChapter) {
            nextChapter();
          }
          return;
        }

        const v = verses[idx];
        setActiveAudioVerse(v.verse);

        const utterText =
          idx === 0
            ? `${bookMeta.name}, chapter ${chapter}. ${v.text}`
            : v.text;

        // 1. The app's own neural narrators. They are synthesised in the cloud,
        //    so a missing connection is checked here rather than discovered as a
        //    failed request.
        if (useAiVoice && !aiSuppressedRef.current) {
          if (!isDeviceOnline()) {
            const reason: PuterVoiceFailure = "offline";
            setAiVoiceNotice({ reason, message: describePuterVoiceFailure(reason) });
            suppressAiVoice(true);
            step(idx);
            return;
          }
          const voiceOption: PuterVoiceOption = resolvePuterVoice(aiVoiceGender);
          setAiVoicePending(true);
          void synthesizeWithPuter(utterText, {
            voice: voiceOption,
            language: activeVersion.languageCode || "en",
          })
            .then(async (audioElements) => {
              if (speechSessionRef.current !== sessionId) {
                audioElements.forEach((el) => haltPuterAudio(el));
                return;
              }
              for (const audio of audioElements) {
                if (speechSessionRef.current !== sessionId) {
                  haltPuterAudio(audio);
                  return;
                }
                aiAudioRef.current = audio;
                try {
                  await playPuterAudio(audio, prefs.speechRate || 1);
                } catch (error) {
                  if (speechSessionRef.current !== sessionId) return;
                  const reason = error instanceof PuterVoiceError ? error.reason : "unavailable";
                  if (reason === "cancelled") return;
                  // Never leave the reader in silence: keep the chapter going
                  // with the device engine and say why the voice changed.
                  setAiVoiceNotice({ reason, message: describePuterVoiceFailure(reason) });
                  suppressAiVoice(true);
                  step(idx);
                  return;
                }
                aiAudioRef.current = null;
              }
              if (speechSessionRef.current === sessionId) step(idx + 1);
            })
            .catch((error: unknown) => {
              if (speechSessionRef.current !== sessionId) return;
              const reason = error instanceof PuterVoiceError ? error.reason : "unavailable";
              if (reason === "cancelled") return;
              setAiVoiceNotice({ reason, message: describePuterVoiceFailure(reason) });
              suppressAiVoice(true);
              // Restart this same verse with whatever engine is left.
              step(idx);
            })
            .finally(() => {
              if (speechSessionRef.current === sessionId) setAiVoicePending(false);
            });
          return;
        }

        // 2. The device engine (Android) or Web Speech (browser).
        if (useNative) {
          const nativeVoiceIndex = resolveNativeVoiceIndex(
            (voices as unknown as NativeSpeechVoice[]).filter(
              (voice) => !isPuterVoice(voice as unknown as AppSpeechVoice),
            ),
            {
              languagePrefix: voiceLanguagePrefix,
              preferredVoiceURI: prefs.preferredVoiceURI,
              preferredVoiceGender: prefs.preferredVoiceGender,
            },
          );
          const finishNative = () => {
            if (speechSessionRef.current === sessionId) step(idx + 1);
          };
          void speakNative(
            utterText,
            activeVersion.languageCode || "en",
            prefs.speechRate || 1,
            nativeVoiceIndex,
          )
            .then(finishNative)
            .catch((error: unknown) => {
              if (speechSessionRef.current !== sessionId) return;
              setIsPlaying(false);
              const message = error instanceof Error ? error.message : String(error || "");
              setSpeechError(
                /not available in this build/i.test(message)
                  ? "The speech engine is not available in this build. Rebuild the Android app so the Text-to-speech plugin is included."
                  : /not supported/i.test(message)
                    ? `No ${activeVersion.name} voice is installed on this device. Install the language in Android Text-to-speech settings.`
                    : "The device speech engine could not read this chapter.",
              );
            });
          return;
        }

        // Only reached on the web: the Android WebView has neither this
        // constructor nor speechSynthesis.
        const utter = new SpeechSynthesisUtterance(utterText);
        utter.lang = activeVersion.languageCode || "en";
        utter.rate = prefs.speechRate || 1.0;

        const matchingGenderVoices =
          prefs.preferredVoiceGender === "auto"
            ? languageVoices
            : languageVoices.filter(
                (voice) => getVoiceGender(voice) === prefs.preferredVoiceGender
              );
        const selectedVoice = languageVoices.find(
          (voice) => voice.voiceURI === prefs.preferredVoiceURI
        );

        if (
          selectedVoice &&
          (prefs.preferredVoiceGender === "auto" ||
            getVoiceGender(selectedVoice) === prefs.preferredVoiceGender)
        ) {
          utter.voice = selectedVoice;
        } else {
          const autoVoice =
            matchingGenderVoices.find((voice) =>
              /natural|neural|google|premium/i.test(voice.name)
            ) || matchingGenderVoices[0];
          if (autoVoice) utter.voice = autoVoice;
        }

        utter.onend = () => {
          if (speechSessionRef.current === sessionId) {
            step(idx + 1);
          }
        };
        utter.onerror = () => {
          if (speechSessionRef.current === sessionId) {
            setIsPlaying(false);
          }
        };

        window.speechSynthesis.speak(utter);
      };

      step(Math.max(0, startIndex));
    },
    [
      verses,
      bookMeta.name,
      chapter,
      prefs.speechRate,
      prefs.preferredVoiceURI,
      prefs.preferredVoiceGender,
      prefs.autoAdvanceChapter,
      languageVoices,
      voices,
      voiceLanguagePrefix,
      activeVersion.languageCode,
      activeVersion.name,
      nextChapter,
      setActiveAudioVerse,
      useAiVoice,
      aiVoiceGender,
      suppressAiVoice,
    ]
  );

  const playStudioAudio = useCallback(() => {
    const url = studioLinks[studioReaderKey];
    if (!url) {
      setEngineMode("speech");
      speakFromIndex(0);
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    let audio = htmlAudioRef.current;
    if (!audio) {
      audio = new Audio();
      // Stream-only: third-party narration licenses are not verified for offline redistribution.
      audio.preload = "none";
      htmlAudioRef.current = audio;
    }

    if (audio.src !== url) {
      audio.src = url;
    }
    audio.playbackRate = prefs.speechRate || 1.0;

    audio.ontimeupdate = () => {
      if (!audio || !audio.duration || verses.length === 0) return;
      const timings = primaryChapterData?.audioTimings?.[studioReaderKey];
      if (timings && timings.length > 0) {
        let vIdx = 0;
        for (let i = 0; i < timings.length; i++) {
          if (audio.currentTime >= timings[i]) vIdx = i;
        }
        const vObj = verses[Math.min(verses.length - 1, vIdx)];
        if (vObj) setActiveAudioVerse(vObj.verse);
      } else {
        const approxIdx = Math.min(
          verses.length - 1,
          Math.floor((audio.currentTime / audio.duration) * verses.length)
        );
        if (verses[approxIdx]) setActiveAudioVerse(verses[approxIdx].verse);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setActiveAudioVerse(null);
      if (prefs.autoAdvanceChapter) {
        nextChapter();
      }
    };

    audio.onerror = () => {
      // Graceful fallback to offline AI voice synthesis!
      setEngineMode("speech");
      speakFromIndex(0);
    };

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setEngineMode("speech");
        speakFromIndex(0);
      });
  }, [
    studioLinks,
    studioReaderKey,
    prefs.speechRate,
    prefs.autoAdvanceChapter,
    verses,
    primaryChapterData,
    nextChapter,
    setActiveAudioVerse,
    speakFromIndex,
  ]);

  // Respond to "Listen / Read From Here" trigger
  useEffect(() => {
    if (!audioStartRequest || !audioBarOpen || verses.length === 0) return;
    const vIdx = verses.findIndex((v) => v.verse === audioStartRequest.verse);
    if (engineMode === "studio" && audioStartRequest.verse === 1 && studioKeys.length > 0) {
      playStudioAudio();
    } else {
      setEngineMode("speech");
      speakFromIndex(vIdx >= 0 ? vIdx : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioStartRequest?.nonce, verses.length]);

  // Stop audio on unmount or bar close
  useEffect(() => {
    if (!audioBarOpen) {
      stopAllPlayback();
      setActiveAudioVerse(null);
    }
  }, [audioBarOpen, stopAllPlayback, setActiveAudioVerse]);

  const currentIdx = Math.max(
    0,
    verses.findIndex((v) => v.verse === (activeAudioVerse || 1))
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stopAllPlayback();
    } else if (engineMode === "studio" && studioKeys.length > 0) {
      playStudioAudio();
    } else {
      speakFromIndex(currentIdx);
    }
  }, [isPlaying, engineMode, studioKeys.length, stopAllPlayback, playStudioAudio, speakFromIndex, currentIdx]);

  const handlePrevVerse = useCallback(() => {
    const prevIdx = Math.max(0, currentIdx - 1);
    setEngineMode("speech");
    speakFromIndex(prevIdx);
  }, [currentIdx, speakFromIndex]);

  const handleNextVerse = useCallback(() => {
    const nextIdx = Math.min(verses.length - 1, currentIdx + 1);
    setEngineMode("speech");
    speakFromIndex(nextIdx);
  }, [verses.length, currentIdx, speakFromIndex]);

  // Media Session controls keep supported studio narration controllable from the lock screen
  // and operating-system media controls. Web Speech playback remains browser-dependent.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const mediaSession = navigator.mediaSession;
    if (!audioBarOpen) {
      mediaSession.metadata = null;
      mediaSession.playbackState = "none";
      return;
    }
    if (typeof MediaMetadata !== "undefined") {
      mediaSession.metadata = new MediaMetadata({
        title: `${bookMeta.name} ${chapter}`,
        artist: `Selah Multi version Bible • ${activeVersion.shortName}`,
        album: engineMode === "studio" ? "Bible narration" : "Scripture read-along",
      });
    }
    mediaSession.playbackState = isPlaying ? "playing" : "paused";
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => handleTogglePlay()],
      ["pause", () => stopAllPlayback()],
      ["stop", () => stopAllPlayback()],
      ["previoustrack", () => handlePrevVerse()],
      ["nexttrack", () => handleNextVerse()],
    ];
    for (const [action, handler] of actions) {
      try { mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
    }
    return () => {
      for (const [action] of actions) {
        try { mediaSession.setActionHandler(action, null); } catch { /* unsupported action */ }
      }
    };
    }, [audioBarOpen, isPlaying, engineMode, bookMeta.name, chapter, activeVersion.shortName, stopAllPlayback, handleTogglePlay, handlePrevVerse, handleNextVerse]);

  if (!audioBarOpen) return null;

  const speeds = [0.85, 1.0, 1.15, 1.3, 1.5];
  const hasFemaleVoiceForLanguage = femaleVoices.length > 0;
  const hasMaleVoiceForLanguage = maleVoices.length > 0;
  const otherLanguageVoiceCount = voices.length - languageVoices.length;
  const speechLanguageName = (() => {
    try {
      return new Intl.DisplayNames(
        [typeof navigator === "undefined" ? "en" : navigator.language],
        { type: "language" }
      ).of(voiceLanguagePrefix) || voiceLanguagePrefix.toUpperCase();
    } catch {
      return voiceLanguagePrefix.toUpperCase();
    }
  })();
  const selectedLanguageVoice = languageVoices.find(
    (voice) => voice.voiceURI === prefs.preferredVoiceURI
  );
  const selectedPuterVoice = aiVoiceForLanguage
    ? (languageVoices.find((voice) => voice.source === "puter" && voice.voiceURI === prefs.preferredVoiceURI) || null)
    : null;
  const pickerLabel = useAiVoice
    ? `${resolvePuterVoice(aiVoiceGender).label} (AI ${aiVoiceGender})`
    : selectedPuterVoice?.name ||
      (voices.length === 0
        ? nativeSpeechUnavailable
          ? "Device voice unavailable"
          : "Loading voices…"
        : selectedLanguageVoice?.name ||
          `${prefs.preferredVoiceGender === "auto" ? "Auto" : prefs.preferredVoiceGender} voice`);
  const chooseVoiceGender = (gender: "auto" | "female" | "male") => {
    stopAllPlayback();
    // Avoid the device engine if the reader has AI voices and this chapter is
    // in a language they cover; `useAiVoice` interprets an empty URI that way.
    updatePrefs({ preferredVoiceGender: gender, preferredVoiceURI: "" });
    setVoicePickerOpen(false);
  };
  const chooseAiVoice = (gender: "male" | "female") => {
    stopAllPlayback();
    suppressAiVoice(false);
    setAiVoiceNotice(null);
    updatePrefs({
      preferredVoiceURI: `puter:${gender}`,
      preferredVoiceGender: gender,
      aiVoiceEnabled: true,
    });
    setVoicePickerOpen(false);
    speakFromIndex(currentIdx);
  };
  const chooseDeviceVoice = (voice: SpeechSynthesisVoice) => {
    stopAllPlayback();
    // Picking a device voice is an explicit choice to stop using the AI voice,
    // so honour it even though AI voices are otherwise preferred.
    updatePrefs({
      preferredVoiceURI: voice.voiceURI,
      preferredVoiceGender: getVoiceGender(voice) || "auto",
      aiVoiceEnabled: false,
    });
    setVoicePickerOpen(false);
  };

  return (
    <div className="sticky z-20 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md" style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        {/* Left: Now Reading Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span>
                {bookMeta.name} {chapter}
                {activeAudioVerse ? `:${activeAudioVerse}` : ""}
              </span>
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {activeVersion.shortName}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {engineMode === "studio"
                ? `Human Studio Narration (${studioReaderKey})`
                : useAiVoice
                  ? `AI Voice Read-Along · ${resolvePuterVoice(aiVoiceGender).label} ${
                      aiVoicePending ? "· preparing…" : online ? "· AI voice" : "· needs data"
                    }`
                  : needsNativeTts()
                    ? "AI Voice Read-Along · device speech engine"
                    : `AI Voice Read-Along · ${voices.length} browser voice${voices.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        {aiVoiceNotice && engineMode === "speech" && (
          <div
            role="status"
            className="order-last flex w-full flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-foreground sm:order-none sm:w-auto"
          >
            <span>
              {aiVoiceNotice.reason === "offline" ? (
                <>
                  <strong className="font-semibold">Turn on data for AI voices.</strong>{" "}
                  {aiVoiceNotice.message}
                </>
              ) : (
                aiVoiceNotice.message
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setAiVoiceNotice(null);
                setSpeechError(null);
                if (!isDeviceOnline()) {
                  setOnline(false);
                  setAiVoiceNotice({
                    reason: "offline",
                    message: describePuterVoiceFailure("offline"),
                  });
                  return;
                }
                setOnline(true);
                suppressAiVoice(false);
                updatePrefs({ aiVoiceEnabled: true });
                speakFromIndex(currentIdx);
              }}
              className="rounded-lg border border-border bg-background px-2 py-1 font-semibold hover:bg-accent"
            >
              Retry AI voice
            </button>
            <button
              type="button"
              onClick={() => setAiVoiceNotice(null)}
              aria-label="Dismiss the AI voice notice"
              className="rounded-lg border border-border bg-background p-1 hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {(speechError || nativeSpeechUnavailable) && engineMode === "speech" && !aiVoiceNotice && (
          <div
            role="status"
            className="order-last flex w-full flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-foreground sm:order-none sm:w-auto"
          >
            <span>
              {speechError ||
                "This device has no speech engine available and AI voices need data, so Read Along cannot play. Studio narration still works where a recording exists."}
            </span>
            {needsNativeTts() && (
              <button
                type="button"
                onClick={() => void openNativeTtsInstall()}
                className="rounded-lg border border-border bg-background px-2 py-1 font-semibold hover:bg-accent"
              >
                Text-to-speech settings
              </button>
            )}
          </div>
        )}

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevVerse}
            className="rounded-xl border border-border bg-background p-2 text-foreground hover:bg-accent"
            title="Previous Verse"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:scale-105"
            title={isPlaying ? "Pause Reading" : "Start Reading Aloud"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleNextVerse}
            className="rounded-xl border border-border bg-background p-2 text-foreground hover:bg-accent"
            title="Next Verse"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Mode, Voice, Speed, Ambient Pad, Close */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {studioKeys.length > 0 && (
            <div className="flex rounded-xl border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => {
                  stopAllPlayback();
                  setEngineMode("speech");
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                  engineMode === "speech"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                AI Voice
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAllPlayback();
                  setEngineMode("studio");
                }}
                title="Streams third-party narration. Offline downloads are disabled unless the audio license permits redistribution."
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                  engineMode === "studio"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Studio MP3
              </button>
            </div>
          )}

          {engineMode === "speech" && (
            <div ref={voicePickerRef} className="relative">
              <button
                ref={voicePickerButtonRef}
                type="button"
                disabled={voices.length === 0 && !nativeSpeechUnavailable}
                onClick={() => {
                  setVoicePickerPosition(null);
                  setVoicePickerOpen((open) => !open);
                }}
                aria-haspopup="dialog"
                aria-expanded={voicePickerOpen}
                aria-label={`AI reading voice: ${pickerLabel}`}
                className="inline-flex max-w-[185px] items-center gap-1.5 truncate rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none disabled:opacity-60"
                title="Choose an AI reading voice"
              >
                <span className="truncate">{pickerLabel}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>

              {voicePickerOpen && voicePickerPosition && createPortal(
                <div
                  ref={voicePickerPopoverRef}
                  role="dialog"
                  aria-label="Choose an AI reading voice"
                  style={{
                    position: "fixed",
                    left: voicePickerPosition.left,
                    width: voicePickerPosition.width,
                    maxHeight: voicePickerPosition.maxHeight,
                    top: voicePickerPosition.top,
                    bottom: voicePickerPosition.bottom,
                  }}
                  className="z-[1000] overflow-y-auto rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-2xl"
                >
                  {aiVoiceForLanguage && (
                    <>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                        <Sparkles className="h-3 w-3 text-primary" />
                        AI voices
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["male", "female"] as const).map((gender) => {
                          const option = PUTER_VOICES[gender];
                          const isSelected = useAiVoice && aiVoiceGender === gender;
                          return (
                            <button
                              key={gender}
                              type="button"
                              onClick={() => chooseAiVoice(gender)}
                              aria-pressed={isSelected}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                              <span className="min-w-0 truncate">
                                {option.label}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {gender === "male" ? "Male" : "Female"}
                                </span>
                              </span>
                              {isSelected && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        Natural neural narration. Needs mobile data or Wi-Fi.
                        {!online && " Data is off right now."}
                      </p>
                      <div className="my-2.5 border-t border-border" />
                    </>
                  )}

                  <div className="mb-2 text-xs font-semibold">
                    {aiVoiceForLanguage ? `Device voices for ${speechLanguageName}` : `Voices for ${speechLanguageName}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => chooseVoiceGender("auto")}
                    aria-pressed={!useAiVoice && !selectedLanguageVoice && prefs.preferredVoiceGender === "auto"}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    <span>Auto device voice</span>
                    {!useAiVoice && !selectedLanguageVoice && prefs.preferredVoiceGender === "auto" && <Check className="h-4 w-4" />}
                  </button>
                  <div className="my-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!hasFemaleVoiceForLanguage}
                      onClick={() => chooseVoiceGender("female")}
                      aria-pressed={!useAiVoice && !selectedLanguageVoice && prefs.preferredVoiceGender === "female"}
                      className="rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Female{hasFemaleVoiceForLanguage ? "" : " · unavailable"}
                    </button>
                    <button
                      type="button"
                      disabled={!hasMaleVoiceForLanguage}
                      onClick={() => chooseVoiceGender("male")}
                      aria-pressed={!useAiVoice && !selectedLanguageVoice && prefs.preferredVoiceGender === "male"}
                      className="rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Male{hasMaleVoiceForLanguage ? "" : " · unavailable"}
                    </button>
                  </div>

                  {deviceLanguageVoices.length === 0 && !aiVoiceForLanguage ? (
                    <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                      <p className="font-medium text-foreground">No {speechLanguageName} voices are installed on this device.</p>
                      <p className="mt-1">Auto voice can still use the device default. To choose a {speechLanguageName} male or female voice, install voices for this language in your device’s Text-to-speech settings.</p>
                      {needsNativeTts() && (
                        <button
                          type="button"
                          onClick={() => void openNativeTtsInstall()}
                          className="mt-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                        >
                          Open Text-to-speech settings
                        </button>
                      )}
                      {otherLanguageVoiceCount > 0 && (
                        <p className="mt-2">{otherLanguageVoiceCount} installed voice{otherLanguageVoiceCount === 1 ? " is" : "s are"} for other languages, so they’re hidden here to avoid mispronouncing Scripture.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {femaleVoices.length > 0 && (
                        <div className="mt-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Female voices</div>
                          {femaleVoices.map((voice) => (
                            <button
                              key={voice.voiceURI}
                              type="button"
                              onClick={() => chooseDeviceVoice(voice)}
                              aria-pressed={prefs.preferredVoiceURI === voice.voiceURI}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            >
                              <span className="min-w-0 truncate">{voice.name} <span className="text-xs text-muted-foreground">({voice.lang})</span></span>
                              {prefs.preferredVoiceURI === voice.voiceURI && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                      {maleVoices.length > 0 && (
                        <div className="mt-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Male voices</div>
                          {maleVoices.map((voice) => (
                            <button
                              key={voice.voiceURI}
                              type="button"
                              onClick={() => chooseDeviceVoice(voice)}
                              aria-pressed={prefs.preferredVoiceURI === voice.voiceURI}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            >
                              <span className="min-w-0 truncate">{voice.name} <span className="text-xs text-muted-foreground">({voice.lang})</span></span>
                              {prefs.preferredVoiceURI === voice.voiceURI && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                      {otherVoices.length > 0 && (
                        <div className="mt-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Other voices</div>
                          {otherVoices.map((voice) => (
                            <button
                              key={voice.voiceURI}
                              type="button"
                              onClick={() => chooseDeviceVoice(voice)}
                              aria-pressed={prefs.preferredVoiceURI === voice.voiceURI}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                            >
                              <span className="min-w-0 truncate">{voice.name} <span className="text-xs text-muted-foreground">({voice.lang})</span></span>
                              {prefs.preferredVoiceURI === voice.voiceURI && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>,
                document.body
              )}
            </div>
          )}

          {engineMode === "studio" && studioKeys.length > 0 && (
            <select
              value={studioReaderKey || studioKeys[0]}
              onChange={(event) => {
                stopAllPlayback();
                setStudioReaderKey(event.target.value);
              }}
              className="max-w-[175px] truncate rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none"
              title="Choose studio reader"
              aria-label="Choose studio reader"
            >
              {studioKeys.map((key) => (
                <option key={key} value={key}>
                  {/dan hays/i.test(key) ? "Male Reader — Dan Hays (Studio)" : key}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              const idx = speeds.indexOf(prefs.speechRate);
              const nextSpeed = speeds[(idx + 1) % speeds.length];
              updatePrefs({ speechRate: nextSpeed });
              if (htmlAudioRef.current) htmlAudioRef.current.playbackRate = nextSpeed;
            }}
            className="rounded-xl border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] font-bold hover:bg-accent"
            title="Cycle Reading Speed"
          >
            {prefs.speechRate}x
          </button>

          <button
            type="button"
            onClick={() => updatePrefs({ ambientSound: !prefs.ambientSound })}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              prefs.ambientSound
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Peaceful Ambient Pad"
          >
            <Music2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Ambient</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSleepMinutes((prev) => prev === null ? 15 : prev === 15 ? 30 : prev === 30 ? 45 : prev === 45 ? 60 : null)
            }
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold ${
              sleepMinutes
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground"
            }`}
            title="Sleep Timer"
          >
            <Timer className="h-3.5 w-3.5" />
            {sleepMinutes ? `${sleepMinutes}m` : "Sleep"}
          </button>

          {!isPlaying && (
            <button
              type="button"
              onClick={() => {
                stopAllPlayback();
                setActiveAudioVerse(null);
                setAudioBarOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Close the paused audio player"
              aria-label="Close paused audio player"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
