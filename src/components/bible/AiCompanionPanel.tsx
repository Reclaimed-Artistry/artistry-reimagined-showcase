import React, { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Compass,
  HelpCircle,
  Languages,
  Link2,
  Loader2,
  LogOut,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { formatReference, getBookMeta } from "@/data/canonicalBooks";
import { useBibleApp } from "@/context/BibleAppContext";
import { supabase } from "@/lib/cloudWorkspace";
import {
  AiCompanionMessage,
  AiQuickAction,
  AiQuizQuestion,
  generateAiBibleResponse,
} from "@/lib/aiBibleCompanion";

function renderFormattedMarkdownText(raw: string): React.ReactNode {
  const lines = raw.split("\n");
  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="font-display text-base font-bold text-foreground pt-1">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-primary bg-primary/8 py-1.5 pl-3 pr-2 font-scripture italic text-foreground/90 rounded-r-lg"
            >
              {renderInlineBold(trimmed.slice(2))}
            </blockquote>
          );
        }
        if (trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
          return (
            <div key={i} className="pl-2 text-foreground/90">
              {renderInlineBold(trimmed)}
            </div>
          );
        }
        return (
          <p key={i} className="text-foreground/90">
            {renderInlineBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const QuizInteractiveWidget: React.FC<{ quiz: AiQuizQuestion[] }> = ({ quiz }) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  return (
    <div className="mt-3 space-y-3">
      {quiz.map((q, qIdx) => {
        const picked = answers[qIdx];
        const answered = picked !== undefined;
        return (
          <div
            key={qIdx}
            className="rounded-xl border border-border bg-background/80 p-3 text-xs"
          >
            <p className="mb-2 font-medium whitespace-pre-line text-foreground">{q.question}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {q.options.map((opt, oIdx) => {
                const isCorrect = oIdx === q.correctIndex;
                const isPicked = picked === oIdx;
                let style = "border-border bg-card hover:bg-accent";
                if (answered) {
                  if (isCorrect) {
                    style = "border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-800 dark:text-emerald-300";
                  } else if (isPicked) {
                    style = "border-destructive bg-destructive/15 text-destructive";
                  }
                }
                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={answered}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const AiCompanionPanel: React.FC = () => {
  const {
    aiPanelOpen,
    setAiPanelOpen,
    bookNumber,
    chapter,
    selectedVerses,
    primaryChapterData,
    activeVersion,
    navigateTo,
    startAudioFromVerse,
    prefs,
  } = useBibleApp();

  const [messages, setMessages] = useState<AiCompanionMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const bookMeta = getBookMeta(bookNumber);

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true);
      return;
    }
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setSessionReady(true);
    }).catch(() => {
      if (mounted) setSessionReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      setAuthError("Online AI sign-in is not configured in this app.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href },
      });
      if (error) {
        const providerDisabled = /provider.*(not enabled|unsupported)|not enabled.*provider/i.test(error.message);
        setAuthError(providerDisabled
          ? "Google sign-in is not enabled yet. The Selah administrator must configure Google OAuth in Supabase Auth."
          : error.message);
      }
    } catch {
      setAuthError("Could not start Google sign-in. Please check your connection and try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  };

  const activeRefLabel =
    selectedVerses.length > 0
      ? formatReference(
          bookNumber,
          chapter,
          Math.min(...selectedVerses),
          selectedVerses.length > 1 ? Math.max(...selectedVerses) : undefined
        )
      : `${bookMeta.name} ${chapter}`;

  // Seed initial welcome walkthrough on first open
  useEffect(() => {
    if (aiPanelOpen && sessionReady && messages.length === 0 && primaryChapterData) {
      handleTriggerAction("walkthrough", "Walk me through this chapter");
    }
    // Wait for the chapter data too, in case the panel opens before the reader finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPanelOpen, primaryChapterData, messages.length, sessionReady]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleTriggerAction = async (actionOrText: AiQuickAction | string, userLabel?: string) => {
    const userMsg: AiCompanionMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userLabel || actionOrText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await generateAiBibleResponse(actionOrText, {
        bookNumber,
        chapter,
        selectedVerses,
        chapterData: primaryChapterData,
        versionMeta: activeVersion,
        aiSettings: prefs.aiSettings,
        userPrompt: userLabel || actionOrText,
        conversationHistory: messages.slice(-6).map(({ role, content }) => ({ role, content })),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          ...reply,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "I couldn’t complete that study just now. Please try again; your question is still here, and your reading progress is unchanged.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    handleTriggerAction(q);
  };

  if (!aiPanelOpen) return null;

  const quickActions: { id: AiQuickAction; label: string; icon: React.ReactNode; promptLabel: string }[] = [
    {
      id: "walkthrough",
      label: "Walkthrough",
      icon: <Compass className="h-3 w-3" />,
      promptLabel: `Walk me through ${bookMeta.name} ${chapter}`,
    },
    {
      id: "explain",
      label: "Explain Simply",
      icon: <BookOpen className="h-3 w-3" />,
      promptLabel: `Explain ${activeRefLabel} in simple everyday words`,
    },
    {
      id: "context",
      label: "Historical Context",
      icon: <Sparkles className="h-3 w-3" />,
      promptLabel: `Historical & literary background of ${bookMeta.name}`,
    },
    {
      id: "word_study",
      label: "Greek / Hebrew",
      icon: <Languages className="h-3 w-3" />,
      promptLabel: `Original Hebrew/Greek word insights in ${activeRefLabel}`,
    },
    {
      id: "cross_refs",
      label: "Cross-Refs",
      icon: <Link2 className="h-3 w-3" />,
      promptLabel: `Show connected passages across Scripture for ${activeRefLabel}`,
    },
    {
      id: "quiz",
      label: "Quiz Me",
      icon: <HelpCircle className="h-3 w-3" />,
      promptLabel: `Quiz me on ${bookMeta.name} ${chapter}`,
    },
  ];

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl xl:static xl:z-10 xl:w-[390px] xl:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold leading-none text-foreground">
              Selah AI Companion
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Reading <strong>{activeRefLabel}</strong> ({activeVersion.shortName})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => startAudioFromVerse(selectedVerses[0] || 1)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-primary"
            title="Read Chapter Aloud"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAiPanelOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Close AI Panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-border bg-secondary/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {session ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">
                {session ? "Online Selah AI is ready" : "Sign in to use online Selah AI"}
              </p>
              <p className="mt-0.5 max-w-xl text-[11px] leading-4 text-muted-foreground">
                {session
                  ? `Signed in as ${session.user.email || "your account"}. Your question and passage are sent securely to Selah’s AI service.`
                  : "Sign in with Google for conversational online answers. Offline study remains available without signing in."}
              </p>
            </div>
          </div>
          {session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={authBusy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"
            >
              {authBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={authBusy || !supabase}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {authBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-white text-[11px] font-bold text-[#4285F4]">G</span>}
              Continue with Google
            </button>
          )}
        </div>
        {authError && <p role="alert" className="mt-2 text-xs text-destructive">{authError}</p>}
      </div>

      {/* Quick Study Chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 bg-background/60 p-3">
        {quickActions.map((qa) => (
          <button
            key={qa.id}
            type="button"
            disabled={loading}
            onClick={() => handleTriggerAction(qa.id, qa.promptLabel)}
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50"
          >
            <span className="text-primary">{qa.icon}</span>
            {qa.label}
          </button>
        ))}
      </div>

      {/* Conversation Stream */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl p-3.5 ${
              m.role === "user"
                ? "ml-8 bg-primary text-primary-foreground text-xs font-medium"
                : "border border-border/80 bg-background/80 shadow-sm"
            }`}
          >
            {m.role === "user" ? (
              <p>{m.content}</p>
            ) : (
              <>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.source === "online" ? "Online Selah AI" : m.quiz ? "Interactive Bible quiz" : session ? "Offline fallback" : "Offline study"}
                </div>
                {session && !m.source && !m.quiz && (
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    The online model was unavailable for this turn, so this response uses Selah’s offline study tools. You can retry your question.
                  </p>
                )}
                {renderFormattedMarkdownText(m.content)}

                {m.clarifyingQuestion && (
                  <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground">
                    <strong>To tailor this:</strong> {m.clarifyingQuestion}
                  </p>
                )}

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-3 border-t border-border/60 pt-2.5">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">You could ask</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions.map((suggestion, idx) => (
                        <button
                          key={`${m.id}-suggestion-${idx}`}
                          type="button"
                          disabled={loading}
                          onClick={() => handleTriggerAction(suggestion)}
                          className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-left text-[11px] text-primary transition hover:bg-primary/10 disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {m.quiz && m.quiz.length > 0 && <QuizInteractiveWidget quiz={m.quiz} />}

                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
                    {m.citations.map((cit, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => navigateTo(cit.bookNumber, cit.chapter, cit.verse)}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                      >
                        {cit.label}
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/80 p-3.5 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Searching Scripture and preparing a response...
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Input Footer */}
      <form
        onSubmit={handleSubmitForm}
        className="border-t border-border bg-muted/30 p-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Selah anything or explore Scripture..."
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-95 disabled:opacity-40"
            title="Ask Selah AI"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
