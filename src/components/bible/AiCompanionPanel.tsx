import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FileText,
  HelpCircle,
  Languages,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { formatReference, getBookMeta } from "@/data/canonicalBooks";
import { useBibleApp } from "@/context/useBibleApp";
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

/**
 * A short, warm verdict for a finished quiz.
 *
 * The remarks avoid scolding a low score: this is a reading check inside a
 * devotional app, and someone who missed two of three is still someone who read
 * the chapter carefully. Each band also names what to do next.
 */
const quizRemark = (score: number, total: number): { title: string; line: string } => {
  if (total > 0 && score === total) {
    return {
      title: "A perfect run",
      line: "Every answer landed. You were reading closely, and it shows.",
    };
  }
  // A quiz is three questions, so compare in whole questions rather than
  // percentages: 2/3 is 0.667, which a ">= 0.67" test would reject and demote a
  // near-perfect run to the middle band.
  const remaining = total - score;
  if (total > 0 && remaining === 1) {
    return {
      title: "Beautifully done",
      line: "You caught the heart of the passage. The one you missed is worth a second look.",
    };
  }
  if (score > 0) {
    return {
      title: "A good start",
      line: "The chapter is starting to settle. Read those lines once more and the details will hold.",
    };
  }
  return {
    title: "You showed up, and that counts",
    line: "This chapter has more to give. Sit with the verses again, then try a fresh set.",
  };
};

type QuizInteractiveWidgetProps = {
  quiz: AiQuizQuestion[];
  /** Seed so the final set number can be shown; the panel tracks the runs. */
  setNumber?: number;
  /** Ask for a new set of questions from the same chapter. */
  onAnotherSet?: () => void;
  /** Close the quiz and stop asking. */
  onQuit?: () => void;
};

const QuizInteractiveWidget: React.FC<QuizInteractiveWidgetProps> = ({
  quiz,
  setNumber,
  onAnotherSet,
  onQuit,
}) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(answers).length;
  const complete = quiz.length > 0 && answeredCount === quiz.length;
  const score = quiz.reduce(
    (total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0),
    0,
  );
  const remark = complete ? quizRemark(score, quiz.length) : null;

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

      {complete && remark && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-primary/25 bg-primary/5 p-3.5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-base font-bold text-foreground">{remark.title}</p>
            <p className="shrink-0 text-sm font-semibold text-primary">
              {score}/{quiz.length}
            </p>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{remark.line}</p>
          {typeof setNumber === "number" && setNumber > 1 && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Set {setNumber} complete
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {onAnotherSet && (
              <button
                type="button"
                onClick={onAnotherSet}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Another set
              </button>
            )}
            {onQuit && (
              <button
                type="button"
                onClick={onQuit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
              >
                Quit quiz
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Another set stays in {`this chapter`} and asks about different verses.
          </p>
        </div>
      )}
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
    catalog,
    offlineSummaries,
    navigateTo,
    startAudioFromVerse,
  } = useBibleApp();

  const [messages, setMessages] = useState<AiCompanionMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  /**
   * How many quiz sets have been asked for in this session. Every new set uses
   * a different slice of the chapter, so this is what stops "Another set" from
   * handing back the same three questions.
   */
  const quizRoundRef = useRef(0);

  const streamRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** The answer the reader has not seen yet, if any. */
  const pendingAnchorRef = useRef<string | null>(null);
  /** Answers already scrolled to, so a re-render never yanks the reader away. */
  const anchoredRef = useRef<Set<string>>(new Set());
  const bookMeta = getBookMeta(bookNumber);
  const availableOfflineVersions = catalog.filter(
    (version) => version.provider === "bundled" || offlineSummaries.some((summary) => summary.versionId === version.id)
  );

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
    if (aiPanelOpen && messages.length === 0 && primaryChapterData) {
      handleTriggerAction("walkthrough", "Walk me through this chapter");
    }
    // Wait for the chapter data too, in case the panel opens before the reader finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPanelOpen, primaryChapterData, messages.length]);

  // Show a fresh answer from its beginning.
  //
  // This used to scroll a sentinel at the very bottom of the stream, so a long
  // walkthrough opened on its final paragraph and the reader had to scroll back
  // up to read what was said. Each assistant reply is now anchored to the top of
  // the visible stream once, when it first appears. The "Thinking…" bubble is
  // deliberately not an anchor: it sits above the answer, and anchoring to it
  // would push the answer out of view.
  useEffect(() => {
    const anchorId = pendingAnchorRef.current;
    if (!anchorId || anchoredRef.current.has(anchorId)) return;

    const stream = streamRef.current;
    const node = messageRefs.current[anchorId];
    if (!stream || !node) return;

    anchoredRef.current.add(anchorId);
    pendingAnchorRef.current = null;

    // Measure against the stream rather than assuming a shared offsetParent, and
    // add back the current scroll so the result is a scrollTop, not a delta.
    const top =
      node.getBoundingClientRect().top - stream.getBoundingClientRect().top + stream.scrollTop - 8;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    stream.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, loading]);

  const handleTriggerAction = async (
    actionOrText: AiQuickAction | string,
    userLabel?: string,
    options?: { quizRound?: number },
  ) => {
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
        availableOfflineVersions,
        userPrompt: userLabel || actionOrText,
        conversationHistory: messages.slice(-6).map(({ role, content }) => ({ role, content })),
        quizRound: options?.quizRound,
      });

      const replyId = `a-${Date.now()}`;
      pendingAnchorRef.current = replyId;
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: "assistant",
          ...reply,
          source: "knowledge",
          timestamp: Date.now(),
        },
      ]);
    } catch {
      const failureId = `a-${Date.now()}`;
      pendingAnchorRef.current = failureId;
      setMessages((prev) => [
        ...prev,
        {
          id: failureId,
          role: "assistant",
          content: "I couldn’t complete that study just now. Please try again; your question is still here, and your reading progress is unchanged.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** Swap a finished quiz for a fresh set of questions from the same chapter. */
  const handleAnotherQuizSet = async (finishedMessageId: string) => {
    if (loading) return;
    quizRoundRef.current += 1;
    // Retire the finished set so the conversation does not fill up with old
    // score cards; the new questions land where the old ones were.
    setMessages((prev) => prev.filter((message) => message.id !== finishedMessageId));
    await handleTriggerAction("quiz", `Quiz me on ${bookMeta.name} ${chapter} again, please`, {
      quizRound: quizRoundRef.current,
    });
  };

  /**
   * End the quiz. The answer point was spent on the questions, so what is left
   * is a short closing word rather than a score repeated back to them.
   */
  const handleQuitQuiz = () => {
    const closingId = `a-${Date.now()}`;
    pendingAnchorRef.current = closingId;
    setMessages((prev) => [
      ...prev,
      {
        id: closingId,
        role: "assistant",
        content:
          "No pressure at all. Whenever you want to test yourself again, just say **quiz me** and I will build a new set.",
        source: "knowledge",
        timestamp: Date.now(),
      },
    ]);
    quizRoundRef.current = 0;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    if (messages.length === 0) {
      window.requestAnimationFrame(() => {
        streamRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
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
      id: "sermon",
      label: "Prepare Sermon",
      icon: <FileText className="h-3 w-3" />,
      promptLabel: `Prepare a sermon on ${activeRefLabel}`,
    },
    {
      id: "quiz",
      label: "Quiz Me",
      icon: <HelpCircle className="h-3 w-3" />,
      promptLabel: `Quiz me on ${bookMeta.name} ${chapter}`,
    },
  ];

  return (
    <aside className="fixed right-0 top-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl xl:static xl:z-10 xl:w-[390px] xl:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold leading-none text-foreground">
              Selah Bible Companion
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
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-foreground">Selah Bible Companion is ready</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Searches Bible text, prepares sermon drafts with linked passages, and uses curated study notes on this device. No AI sign-in, external model, or API key is needed.
            </p>
          </div>
        </div>
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
      <div ref={streamRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            ref={(node) => {
              messageRefs.current[m.id] = node;
            }}
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
                  {m.quiz ? "Interactive Bible quiz" : "Selah Bible Companion"}
                </div>
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

                {m.quiz && m.quiz.length > 0 && (
                  <QuizInteractiveWidget
                    quiz={m.quiz}
                    setNumber={m.quizSetNumber}
                    onAnotherSet={() => void handleAnotherQuizSet(m.id)}
                    onQuit={handleQuitQuiz}
                  />
                )}

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
            Searching installed Bible text and study notes...
          </div>
        )}

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
            placeholder="Ask about a Bible passage, person, word, or theme..."
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-95 disabled:opacity-40"
            title="Ask Selah Bible Companion"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
