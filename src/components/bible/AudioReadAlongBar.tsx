import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useBibleApp } from "@/context/useBibleApp";

function getVoiceGender(voice: SpeechSynthesisVoice): "female" | "male" | null {
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);

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
    () => voices.filter((voice) => getVoiceGender(voice) === "female"),
    [voices]
  );
  const maleVoices = useMemo(
    () => voices.filter((voice) => getVoiceGender(voice) === "male"),
    [voices]
  );
  const otherVoices = useMemo(
    () => voices.filter((voice) => getVoiceGender(voice) === null),
    [voices]
  );

  useEffect(() => {
    if (studioKeys.length > 0 && !studioKeys.includes(studioReaderKey)) {
      const maleStudioReader = studioKeys.find((key) => /dan hays/i.test(key));
      setStudioReaderKey(maleStudioReader || studioKeys[0]);
    } else if (studioKeys.length === 0 && engineMode === "studio") {
      setEngineMode("speech");
    }
  }, [studioKeys, studioReaderKey, engineMode]);

  // Load browser neural / speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const updateVoices = () => {
      const list = window.speechSynthesis.getVoices() || [];
      setVoices(list);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

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
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (verses.length === 0) return;

      window.speechSynthesis.cancel();
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
        const utter = new SpeechSynthesisUtterance(utterText);
        utter.rate = prefs.speechRate || 1.0;

        const langPrefix = (activeVersion.languageCode || "en").slice(0, 2).toLowerCase();
        const languageVoices = voices.filter((voice) =>
          voice.lang.toLowerCase().startsWith(langPrefix)
        );
        const matchingGenderVoices =
          prefs.preferredVoiceGender === "auto"
            ? languageVoices
            : languageVoices.filter(
                (voice) => getVoiceGender(voice) === prefs.preferredVoiceGender
              );
        const selectedVoice = voices.find(
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
      voices,
      activeVersion.languageCode,
      nextChapter,
      setActiveAudioVerse,
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
  const voiceLanguagePrefix = (activeVersion.languageCode || "en").slice(0, 2).toLowerCase();
  const hasFemaleVoiceForLanguage = femaleVoices.some((voice) =>
    voice.lang.toLowerCase().startsWith(voiceLanguagePrefix)
  );
  const hasMaleVoiceForLanguage = maleVoices.some((voice) =>
    voice.lang.toLowerCase().startsWith(voiceLanguagePrefix)
  );

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
                : "AI Voice Read-Along • Synced Verse Highlighting"}
            </div>
          </div>
        </div>

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

          {engineMode === "speech" && voices.length > 0 && (
            <select
              value={
                prefs.preferredVoiceURI && voices.some((voice) => voice.voiceURI === prefs.preferredVoiceURI)
                  ? `voice:${prefs.preferredVoiceURI}`
                  : `gender:${prefs.preferredVoiceGender || "auto"}`
              }
              onChange={(event) => {
                const value = event.target.value;
                stopAllPlayback();
                if (value.startsWith("gender:")) {
                  updatePrefs({
                    preferredVoiceGender: value.slice(7) as "auto" | "female" | "male",
                    preferredVoiceURI: "",
                  });
                  return;
                }
                const voiceURI = value.slice(6);
                const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);
                updatePrefs({
                  preferredVoiceURI: voiceURI,
                  preferredVoiceGender: selectedVoice ? getVoiceGender(selectedVoice) || "auto" : "auto",
                });
              }}
              className="max-w-[185px] truncate rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none"
              title="Choose an AI reading voice or voice gender"
              aria-label="Choose AI reading voice or gender"
            >
              <option value="gender:auto">Auto voice</option>
              <option value="gender:female" disabled={!hasFemaleVoiceForLanguage}>
                Female voice{hasFemaleVoiceForLanguage ? "" : " (not available for this language)"}
              </option>
              <option value="gender:male" disabled={!hasMaleVoiceForLanguage}>
                Male voice{hasMaleVoiceForLanguage ? "" : " (not available for this language)"}
              </option>
              {femaleVoices.length > 0 && (
                <optgroup label="Female voices">
                  {femaleVoices.slice(0, 25).map((voice) => (
                    <option key={voice.voiceURI} value={`voice:${voice.voiceURI}`}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {maleVoices.length > 0 && (
                <optgroup label="Male voices">
                  {maleVoices.slice(0, 25).map((voice) => (
                    <option key={voice.voiceURI} value={`voice:${voice.voiceURI}`}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {otherVoices.length > 0 && (
                <optgroup label="Other device voices">
                  {otherVoices.slice(0, 25).map((voice) => (
                    <option key={voice.voiceURI} value={`voice:${voice.voiceURI}`}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
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
