import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildThreads,
  deleteGroupPost,
  initials,
  loadGroupAuthors,
  loadGroupPosts,
  postToGroup,
  relativeTime,
  watchGroupPosts,
  type GroupPost,
  type GroupThread,
} from "@/lib/groupChat";
import {
  disableGroupNotifications,
  enableGroupNotifications,
  groupNotificationPermission,
} from "@/lib/groupPush";

type Permission = "granted" | "denied" | "default" | "unsupported";

type GroupForumProps = {
  groupId: string;
  groupTitle: string;
  currentUserId: string;
  /** Existing author names, so the thread does not flicker while loading. */
  knownNames?: Record<string, string>;
};

const describePermission = (permission: Permission): string => {
  switch (permission) {
    case "granted":
      return "Notifications are on for this device. You will hear about new questions, answers, progress, and new members.";
    case "denied":
      return "Notifications are blocked for Selah in this device's settings. Everything still appears here, but nothing will pop up until you allow it again.";
    case "unsupported":
      return "This device cannot receive push notifications. You will still see new posts here whenever you open the group.";
    default:
      return "Turn on notifications so you hear when someone asks a question, answers one, or moves forward in the plan.";
  }
};

const Avatar: React.FC<{ name: string; isYou: boolean }> = ({ name, isYou }) => (
  <div
    aria-hidden
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
      isYou ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
    }`}
  >
    {initials(name)}
  </div>
);

export const GroupForum: React.FC<GroupForumProps> = ({
  groupId,
  groupTitle,
  currentUserId,
  knownNames,
}) => {
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [names, setNames] = useState<Record<string, string>>(knownNames ?? {});
  const [question, setQuestion] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<Permission>("unsupported");
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [rows, authorNames] = await Promise.all([
        loadGroupPosts(groupId),
        loadGroupAuthors(groupId),
      ]);
      setPosts(rows);
      setNames((current) => ({ ...current, ...authorNames }));
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load the group conversation.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    // Live posts from other members, so the thread does not need a refresh tap.
    return watchGroupPosts(groupId, () => void refresh());
  }, [groupId, refresh]);

  useEffect(() => {
    let cancelled = false;
    void groupNotificationPermission().then((value) => {
      if (!cancelled) setPermission(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const threads: GroupThread[] = useMemo(() => buildThreads(posts), [posts]);
  const nameFor = (userId: string) =>
    userId === currentUserId ? "You" : names[userId] || "A reader";

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    if (posting || !question.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await postToGroup(groupId, question);
      setQuestion("");
      await refresh();
      window.requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
      toast.success("Question posted", { description: "Everyone in the group will be told." });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not post that question.");
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (event: React.FormEvent, parentId: string) => {
    event.preventDefault();
    if (posting || !replyBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await postToGroup(groupId, replyBody, parentId);
      setReplyBody("");
      setReplyTo(null);
      await refresh();
      toast.success("Answer posted", { description: "The group has been notified." });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not post that answer.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deleteGroupPost(postId);
      await refresh();
      toast.success("Removed");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not remove that post.");
    }
  };

  const handleToggleNotifications = async () => {
    setAsking(true);
    try {
      if (permission === "granted") {
        await disableGroupNotifications();
        setPermission(await groupNotificationPermission());
        toast.success("Group notifications turned off for this device");
        return;
      }
      const result = await enableGroupNotifications();
      if (result.status === "granted") {
        setPermission("granted");
        toast.success("Notifications on", { description: "The whole group will now reach this device." });
      } else if (result.status === "denied") {
        setPermission("denied");
        toast.error("Notifications were not allowed", {
          description: "You can allow them in this device's settings for Selah.",
        });
      } else if (result.status === "unsupported") {
        setPermission("unsupported");
      } else {
        toast.error("Could not turn on notifications", { description: result.reason });
      }
    } finally {
      setAsking(false);
    }
  };

  const renderReplies = (thread: GroupThread) => {
    if (thread.replies.length === 0) {
      return (
        <p className="mt-2 pl-1 text-[11px] italic text-muted-foreground">
          No answers yet. Be the first to help.
        </p>
      );
    }
    return (
      <div className="mt-3 space-y-2.5 border-l-2 border-border/70 pl-3">
        {thread.replies.map((reply) => (
          <div key={reply.id} className="flex gap-2.5">
            <Avatar name={names[reply.author_id] || "A reader"} isYou={reply.author_id === currentUserId} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-semibold">
                  {nameFor(reply.author_id)}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {relativeTime(reply.created_at)}
                </span>
                {(reply.author_id === currentUserId) && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(reply.id)}
                    className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                    title="Remove your answer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                {reply.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/60 p-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {permission === "granted" ? (
            <Bell className="h-3.5 w-3.5 text-primary" />
          ) : (
            <BellOff className="h-3.5 w-3.5" />
          )}
          <span className="max-w-[42ch]">{describePermission(permission)}</span>
        </div>
        {permission !== "unsupported" && (
          <button
            type="button"
            onClick={() => void handleToggleNotifications()}
            disabled={asking || permission === "denied"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent disabled:opacity-50"
          >
            {asking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : permission === "granted" ? (
              <BellOff className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            {permission === "granted" ? "Turn notifications off" : "Turn notifications on"}
          </button>
        )}
      </div>

      <form onSubmit={handleAsk} className="rounded-2xl border border-border/70 bg-background/60 p-3">
        <label htmlFor={`group-question-${groupId}`} className="text-xs font-semibold">
          Ask the group a question
        </label>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Everyone in <strong>{groupTitle}</strong> can read it and answer.
        </p>
        <textarea
          id={`group-question-${groupId}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="What are you wondering about as you read?"
          className="mt-2 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">{question.length}/4000</span>
          <button
            type="submit"
            disabled={posting || !question.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post question
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the conversation…
        </p>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <MessagesSquare className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-xs font-semibold">No questions yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ask the first one above. Everyone in the group is notified when you do.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <article
              key={thread.id}
              className="rounded-2xl border border-border/70 bg-background/60 p-3.5"
            >
              <div className="flex gap-2.5">
                <Avatar
                  name={names[thread.author_id] || "A reader"}
                  isYou={thread.author_id === currentUserId}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold">{nameFor(thread.author_id)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(thread.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <MessageCircle className="h-2.5 w-2.5" />
                      {thread.replies.length} {thread.replies.length === 1 ? "answer" : "answers"}
                    </span>
                    {thread.author_id === currentUserId && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(thread.id)}
                        className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                        title="Remove your question"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                    {thread.body}
                  </p>
                </div>
              </div>

              {renderReplies(thread)}

              {replyTo === thread.id ? (
                <form onSubmit={(event) => void handleReply(event, thread.id)} className="mt-3 pl-3">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    rows={2}
                    maxLength={4000}
                    autoFocus
                    placeholder="Write your answer…"
                    className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="submit"
                      disabled={posting || !replyBody.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Post answer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyBody("");
                      }}
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(thread.id);
                    setReplyBody("");
                  }}
                  className="mt-2 ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <MessageCircle className="h-3 w-3" /> Answer this
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};
