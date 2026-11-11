import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/cloudWorkspace";

export type GroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  edited_at: string | null;
};

/** A question, with the answers written under it. */
export type GroupThread = GroupPost & { replies: GroupPost[] };

export type GroupNotification = {
  id: string;
  group_id: string;
  kind: "post" | "progress" | "member_joined" | "member_left";
  title: string;
  body: string;
  url: string;
  created_at: string;
  read_at: string | null;
};

/** Who wrote a post. Resolved from `auth.users` metadata by the RPC below. */
export type GroupAuthor = { user_id: string; display_name: string };

const PAGE_SIZE = 50;

/**
 * Build the forum view: posts in the order they were written, each question
 * carrying its replies. Replies whose question is not in this page are dropped
 * rather than promoted to questions, which would show an answer with no
 * question above it.
 */
export function buildThreads(posts: GroupPost[]): GroupThread[] {
  const byId = new Map<string, GroupThread>();
  for (const post of posts) {
    if (post.parent_id === null) byId.set(post.id, { ...post, replies: [] });
  }
  const orphans: GroupPost[] = [];
  for (const post of posts) {
    if (post.parent_id === null) continue;
    const parent = byId.get(post.parent_id);
    if (parent) parent.replies.push(post);
    else orphans.push(post);
  }
  return [...byId.values()].map((thread) => ({
    ...thread,
    replies: thread.replies.sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}

export async function loadGroupPosts(groupId: string, limit = PAGE_SIZE): Promise<GroupPost[]> {
  if (!supabase) throw new Error("Cloud sync is not configured in this build.");
  const { data, error } = await supabase
    .from("reading_group_posts")
    .select("id,group_id,author_id,body,parent_id,created_at,edited_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as GroupPost[]).reverse();
}

/**
 * Display names for the people in a thread.
 *
 * `auth.users` is not readable from the browser, so the names come from a
 * security-definer function that only ever exposes members of a group the
 * caller already belongs to.
 */
export async function loadGroupAuthors(groupId: string): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data, error } = await supabase.rpc("group_member_names", { p_group_id: groupId });
  if (error || !data) return {};
  const names: Record<string, string> = {};
  for (const row of data as GroupAuthor[]) names[row.user_id] = row.display_name;
  return names;
}

export async function postToGroup(groupId: string, body: string, parentId?: string | null) {
  if (!supabase) throw new Error("Cloud sync is not configured in this build.");
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Sign in with Google to post in a group.");

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write something first.");
  if (trimmed.length > 4000) throw new Error("That post is too long. Keep it under 4000 characters.");

  const { data, error } = await supabase
    .from("reading_group_posts")
    .insert({ group_id: groupId, author_id: userId, body: trimmed, parent_id: parentId ?? null })
    .select("id,group_id,author_id,body,parent_id,created_at,edited_at")
    .single();
  if (error) throw error;
  return data as GroupPost;
}

export async function deleteGroupPost(postId: string) {
  if (!supabase) throw new Error("Cloud sync is not configured in this build.");
  const { error } = await supabase.from("reading_group_posts").delete().eq("id", postId);
  if (error) throw error;
}

/**
 * Live updates for one group's forum.
 *
 * Realtime only delivers rows the subscriber is allowed to read, so the channel
 * filter on group_id is a convenience, not the security boundary: the RLS
 * policy on reading_group_posts is what stops a non-member subscribing.
 */
export function watchGroupPosts(groupId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel: RealtimeChannel = supabase
    .channel(`group-posts-${groupId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reading_group_posts", filter: `group_id=eq.${groupId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}

export async function loadUnreadNotifications(limit = 30): Promise<GroupNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("group_notifications")
    .select("id,group_id,kind,title,body,url,created_at,read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as GroupNotification[];
}

export async function countUnreadNotifications(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("unread_group_notification_count");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

export async function markNotificationsRead(groupId?: string): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("mark_group_notifications_read", {
    p_group_id: groupId ?? null,
  });
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

/**
 * Live notification push for the bell, so the unread count moves without a
 * refresh. Same RLS guarantee as above.
 */
export function watchNotifications(userId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel: RealtimeChannel = supabase
    .channel(`group-notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "group_notifications", filter: `recipient_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}

/** `3m`, `2h`, `4d` — compact enough for a thread gutter. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Initials for the avatar circle next to a post. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
