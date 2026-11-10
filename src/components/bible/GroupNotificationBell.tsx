import React, { useCallback, useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import {
  countUnreadNotifications,
  loadUnreadNotifications,
  markNotificationsRead,
  relativeTime,
  watchNotifications,
  type GroupNotification,
} from "@/lib/groupChat";

const kindLabel: Record<GroupNotification["kind"], string> = {
  post: "New in a group",
  progress: "Reading progress",
  member_joined: "New member",
  member_left: "Member left",
};

/**
 * Unread group activity for the signed-in reader.
 *
 * Counts come from a security-definer RPC rather than a client-side filter, so
 * the badge cannot drift from what the reader is actually allowed to see, and
 * the list only ever contains their own rows.
 */
export const GroupNotificationBell: React.FC<{ userId: string; onOpenGroup?: (groupId: string) => void }> = ({
  userId,
  onOpenGroup,
}) => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<GroupNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(() => {
    void countUnreadNotifications().then(setUnread);
  }, []);

  useEffect(() => {
    refreshCount();
    return watchNotifications(userId, refreshCount);
  }, [userId, refreshCount]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    const rows = await loadUnreadNotifications();
    setItems(rows);
    setUnread(rows.filter((row) => !row.read_at).length);
    setLoading(false);
    if (rows.some((row) => !row.read_at)) {
      await markNotificationsRead();
      setUnread(0);
      setItems(rows.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() })));
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleOpen()}
        aria-expanded={open}
        aria-label={unread > 0 ? `${unread} unread group notifications` : "Group notifications"}
        className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {unread > 0 ? <BellRing className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold">Group activity</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {loading ? (
            <p className="px-2 py-3 text-[11px] text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-muted-foreground">
              Nothing yet. When someone posts, answers, or moves forward in a shared plan, it shows up here.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenGroup?.(item.group_id);
                    }}
                    className="w-full rounded-xl px-2 py-2 text-left hover:bg-accent"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {kindLabel[item.kind]}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
