import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  CheckCircle2,
  Cloud,
  Download,
  Link2,
  Loader2,
  LockKeyhole,
  LogOut,
  MessagesSquare,
  RefreshCw,
  Share2,
  ShieldCheck,
  Upload,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useBibleApp } from "@/context/useBibleApp";
import {
  cloudSyncConfigured,
  EMPTY_STUDY_SNAPSHOT,
  isValidStudySnapshot,
  mergeStudySnapshots,
  supabase,
  type StudySnapshot,
} from "@/lib/cloudWorkspace";
import {
  AuthError,
  accountAvatar,
  accountLabel,
  closeSignInBrowser,
  isAuthCallbackUrl,
  listenForAuthCallback,
  startGoogleSignIn,
} from "@/lib/googleAuth";
import { GroupForum } from "@/components/bible/GroupForum";
import { GroupActivityCard } from "@/components/bible/GroupActivityCard";
import { GroupJourney } from "@/components/bible/GroupJourney";
import { NotificationSettings } from "@/components/bible/NotificationSettings";
import { describePassage, localTimeZone } from "@/lib/groupJourney";
import { DEFAULT_PREFERENCES, saveNotificationPreferences } from "@/lib/notificationPrefs";
import { BOOK_BY_NUMBER } from "@/data/canonicalBooks";
import { GroupNotificationBell } from "@/components/bible/GroupNotificationBell";
import type { ReadingPlanDefinition } from "@/types/bible";

type GroupProgress = {
  user_id: string;
  completed_days: number[];
  current_day: number;
  updated_at: string;
};

type ReadingGroup = {
  id: string;
  title: string;
  invite_code: string;
  owner_id: string;
  plan: ReadingPlanDefinition;
  created_at: string;
  progress: GroupProgress[];
};

/** The four-colour Google "G", drawn inline so sign-in needs no image request. */
const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);

function saveBlob(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const CloudWorkspacePanel: React.FC = () => {
  const {
    bookmarks,
    highlights,
    notes,
    readChapters,
    streakDates,
    enrollments,
    allPlans,
    reflections,
    prayers,
    memoryCards,
    studyDeletionMarkers,
    applyStudySnapshot,
    addCustomPlan,
    enrollInPlan,
  } = useBibleApp();

  const localSnapshot = useMemo<StudySnapshot>(() => ({
    version: 1,
    bookmarks,
    highlights,
    notes,
    readChapters,
    streakDates,
    enrollments,
    customPlans: allPlans.filter((plan) => plan.isCustom),
    reflections,
    prayers,
    memoryCards,
    deletedItems: studyDeletionMarkers,
  }), [bookmarks, highlights, notes, readChapters, streakDates, enrollments, allPlans, reflections, prayers, memoryCards, studyDeletionMarkers]);
  const localSnapshotRef = useRef(localSnapshot);
  localSnapshotRef.current = localSnapshot;

  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("On this device only");
  const [groupTitle, setGroupTitle] = useState("My reading group");
  /** Which group's conversation is expanded; one at a time keeps the panel calm. */
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(allPlans[0]?.id || "");
  const [inviteCode, setInviteCode] = useState(() => new URLSearchParams(window.location.search).get("group") || "");
  const [groups, setGroups] = useState<ReadingGroup[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  /*
   * Record this device's time zone as soon as a session exists.
   *
   * The daily verse is queued at 06:00 and 21:00 in the reader's own zone. With
   * no stored preference the scheduler falls back to UTC, so someone in Lagos
   * would get 7am and 10pm instead. Writing the row at sign-in means the very
   * first verse is already correctly timed, without requiring a visit to the
   * notifications screen.
   */
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !supabase) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase
          .from("notification_preferences")
          .select("verse_time_zone")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (data?.verse_time_zone) return;
        await saveNotificationPreferences(userId, {
          ...DEFAULT_PREFERENCES,
          verseTimeZone: localTimeZone(),
        });
      } catch {
        // The scheduler falls back to UTC; nothing here is worth interrupting.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const uploadSnapshot = useCallback(async (userId: string, payload: StudySnapshot) => {
    if (!supabase) return;
    // Read/merge/write with an updated_at compare-and-swap so concurrent devices don't
    // silently replace one another's distinct edits. A conflict retries with fresh cloud data.
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: current, error: readError } = await supabase
        .from("user_sync_snapshots")
        .select("payload,updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (readError) throw readError;
      const remote = isValidStudySnapshot(current?.payload) ? current.payload : EMPTY_STUDY_SNAPSHOT;
      const merged = mergeStudySnapshots(payload, remote);
      const updatedAt = new Date().toISOString();
      if (!current) {
        const { error: insertError } = await supabase.from("user_sync_snapshots").insert({
          user_id: userId,
          payload: merged,
          updated_at: updatedAt,
        });
        if (!insertError) {
          if (JSON.stringify(merged) !== JSON.stringify(payload)) applyStudySnapshot(merged);
          return;
        }
        if (insertError.code === "23505") continue;
        throw insertError;
      }
      const { data: updated, error: updateError } = await supabase
        .from("user_sync_snapshots")
        .update({ payload: merged, updated_at: updatedAt })
        .eq("user_id", userId)
        .eq("updated_at", current.updated_at)
        .select("user_id");
      if (updateError) throw updateError;
      if (updated?.length) {
        if (JSON.stringify(merged) !== JSON.stringify(payload)) applyStudySnapshot(merged);
        return;
      }
    }
    throw new Error("Another device is syncing at the same time. Please retry in a moment.");
  }, [applyStudySnapshot]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setSyncReady(false);
      setSyncStatus("On this device only");
      return;
    }
    let cancelled = false;
    setSyncReady(false);
    setSyncStatus("Merging this device with your cloud backup…");
    void (async () => {
      const { data, error } = await supabase
        .from("user_sync_snapshots")
        .select("payload")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncStatus(`Cloud sync unavailable: ${error.message}`);
        setSyncReady(true);
        return;
      }
      const remoteSnapshot = isValidStudySnapshot(data?.payload) ? data?.payload : EMPTY_STUDY_SNAPSHOT;
      const merged = mergeStudySnapshots(localSnapshotRef.current, remoteSnapshot);
      applyStudySnapshot(merged);
      try {
        await uploadSnapshot(session.user.id, merged);
        if (!cancelled) setSyncStatus(`Synced just now • ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
      } catch (syncError) {
        if (!cancelled) setSyncStatus(syncError instanceof Error ? `Sync failed: ${syncError.message}` : "Sync failed");
      }
      if (!cancelled) setSyncReady(true);
    })();
    return () => { cancelled = true; };
    // Run once per authenticated user; live edits are handled by the debounced effect below.
  }, [session?.user.id, applyStudySnapshot, uploadSnapshot]);

  useEffect(() => {
    if (!supabase || !session?.user.id || !syncReady) return;
    const timer = window.setTimeout(() => {
      setSyncStatus("Saving changes to your cloud backup…");
      void uploadSnapshot(session.user.id, localSnapshot)
        .then(() => setSyncStatus(`Synced just now • ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`))
        .catch((error: unknown) => setSyncStatus(error instanceof Error ? `Sync failed: ${error.message}` : "Sync failed"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [session?.user.id, syncReady, localSnapshot, uploadSnapshot]);

  const refreshGroups = useCallback(async () => {
    if (!supabase || !session?.user.id) return;
    setGroupError(null);
    const { data, error } = await supabase.from("reading_groups").select("id,title,invite_code,owner_id,plan,created_at").order("created_at", { ascending: false });
    if (error) {
      setGroupError(describeGroupFailure(error.message));
      return;
    }
    const groupRows = (data || []) as Omit<ReadingGroup, "progress">[];
    const ids = groupRows.map((group) => group.id);
    const progressResult = ids.length
      ? await supabase.from("reading_group_progress").select("group_id,user_id,completed_days,current_day,updated_at").in("group_id", ids)
      : { data: [], error: null };
    if (progressResult.error) {
      setGroupError(describeGroupFailure(progressResult.error.message));
      return;
    }
    const progress = (progressResult.data || []) as (GroupProgress & { group_id: string })[];
    setGroups(groupRows.map((group) => ({ ...group, progress: progress.filter((row) => row.group_id === group.id) })));
  }, [session?.user.id]);

  useEffect(() => {
    if (session?.user.id) void refreshGroups();
    else setGroups([]);
  }, [session?.user.id, refreshGroups]);

  // Publish this device's plan progress to each group it belongs to.
  //
  // The signature of what was last pushed is kept in a ref rather than compared
  // against `groups`: writing a fresh `updated_at` back into state used to
  // change `groups`, which re-ran this effect, which saw the new timestamp as a
  // difference and wrote again — a write storm that ran for as long as the
  // reader stayed signed in.
  const pushedProgressRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!supabase || !session?.user.id || !syncReady || groups.length === 0) return;
    const userId = session.user.id;
    const timer = window.setTimeout(() => {
      for (const group of groups) {
        const enrollment = enrollments.find((item) => item.planId === group.plan.id);
        if (!enrollment) continue;
        const completedDays = [...enrollment.completedDays].sort((a, b) => a - b);
        const currentDay = Math.max(1, enrollment.lastReadDay);
        const signature = `${currentDay}|${completedDays.join(",")}`;
        if (pushedProgressRef.current[group.id] === signature) continue;
        pushedProgressRef.current[group.id] = signature;

        void supabase
          .from("reading_group_progress")
          .upsert(
            {
              group_id: group.id,
              user_id: userId,
              completed_days: completedDays,
              current_day: currentDay,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "group_id,user_id" },
          )
          .then(({ error }) => {
            if (error) {
              // Let the next change retry rather than pretending it landed.
              delete pushedProgressRef.current[group.id];
              return;
            }
            setGroups((currentGroups) =>
              currentGroups.map((current) => {
                if (current.id !== group.id) return current;
                const existing = current.progress.find((item) => item.user_id === userId);
                const same =
                  existing &&
                  existing.current_day === currentDay &&
                  existing.completed_days.length === completedDays.length &&
                  existing.completed_days.every((day, index) => day === completedDays[index]);
                if (same) return current;
                const nextProgress: GroupProgress = {
                  user_id: userId,
                  completed_days: completedDays,
                  current_day: currentDay,
                  updated_at: new Date().toISOString(),
                };
                return {
                  ...current,
                  progress: [...current.progress.filter((item) => item.user_id !== userId), nextProgress],
                };
              }),
            );
          });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [groups, enrollments, session?.user.id, syncReady]);

  /** RLS refusals surface as a bare "row-level security policy" message. */
  const describeGroupFailure = (message: string): string => {
    if (/row-level security|permission denied|violates row/i.test(message)) {
      return "You need to be signed in with Google to do that. Sign in above, then try again.";
    }
    if (/invite code not found/i.test(message)) {
      return "That invite code does not match any group. Check the code and try again.";
    }
    if (/failed to fetch|network/i.test(message)) {
      return "Could not reach the cloud. Check your connection and try again.";
    }
    return message;
  };

  const describeAuthFailure = (error: unknown): string => {
    if (error instanceof AuthError) {
      switch (error.reason) {
        case "cancelled":
          return "Google sign-in was cancelled. You can try again whenever you are ready.";
        case "popup":
          return "The Google sign-in window was blocked. Allow pop-ups for Selah, then try again.";
        case "network":
          return "Google sign-in could not reach the network. Check your data connection and try again.";
        case "not-configured":
          return "Cloud sync is not configured in this build.";
        default:
          return error.message;
      }
    }
    return error instanceof Error ? error.message : "Google sign-in could not be started.";
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setBusy(true);
    setAuthError(null);
    setBackupError(null);
    try {
      await startGoogleSignIn();
      // The browser navigates away here; on Android the system browser opened
      // and the deep link listener finishes the exchange.
    } catch (error) {
      setAuthError(describeAuthFailure(error));
    } finally {
      setBusy(false);
    }
  };

  // Android/iOS only: the OS hands the sign-in result back as a deep link.
  useEffect(() => {
    return listenForAuthCallback((error) => {
      if (error) {
        setAuthError(describeAuthFailure(error));
        return;
      }
      toast.success("Signed in with Google");
    });
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    void closeSignInBrowser();
    if (error) setBackupError(error.message);
    else {
      setAuthError(null);
      setSession(null);
      setSyncReady(false);
      setSyncStatus("Signed out • your data remains on this device");
      toast.success("Signed out");
    }
  };

  const handleExportBackup = () => {
    saveBlob(`selah-study-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(localSnapshot, null, 2));
    toast.success("Study backup downloaded");
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBackupError(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidStudySnapshot(parsed)) throw new Error("This file is not a valid Selah study backup.");
      const merged = mergeStudySnapshots(localSnapshot, parsed);
      applyStudySnapshot(merged);
      if (supabase && session?.user.id) await uploadSnapshot(session.user.id, merged);
      toast.success("Backup restored and merged with this device");
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Could not read this backup file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !session?.user.id) return;
    const plan = allPlans.find((item) => item.id === selectedPlanId);
    if (!plan) return;
    setBusy(true);
    setGroupError(null);
    const { error } = await supabase.from("reading_groups").insert({
      title: groupTitle.trim(),
      plan,
      owner_id: session.user.id,
    });
    setBusy(false);
    if (error) {
      setGroupError(describeGroupFailure(error.message));
      return;
    }
    if (!enrollments.some((enrollment) => enrollment.planId === plan.id)) enrollInPlan(plan.id);
    await refreshGroups();
    toast.success("Reading group created", {
      description: "Tap Invite to share the group link with the people reading alongside you.",
    });
  };

  const handleJoinGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !session?.user.id) return;
    setBusy(true);
    setGroupError(null);
    const { data, error } = await supabase.rpc("join_reading_group", { p_invite_code: inviteCode.trim() });
    setBusy(false);
    if (error) {
      setGroupError(describeGroupFailure(error.message));
      return;
    }
    const group = Array.isArray(data) ? data[0] as ReadingGroup | undefined : data as ReadingGroup | undefined;
    if (group?.plan) {
      if (group.plan.isCustom && !allPlans.some((plan) => plan.id === group.plan.id)) addCustomPlan(group.plan);
      if (!enrollments.some((enrollment) => enrollment.planId === group.plan.id)) enrollInPlan(group.plan.id);
    }
    await refreshGroups();
    toast.success("Joined reading group");
  };

  const shareGroup = async (group: ReadingGroup) => {
    const url = new URL(window.location.href);
    url.searchParams.set("section", "study");
    url.searchParams.set("group", group.invite_code);
    const shareData = { title: `${group.title} • Selah Multi version Bible`, text: `Join my ${group.plan.title} reading group on Selah Multi version Bible. Invite code: ${group.invite_code}`, url: url.toString() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast.success("Invite link copied");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Could not share this invite");
    }
  };

  /**
   * The reading the owner's reminder should point at.
   *
   * Each member sits on a different day, so "today's scripture" is the owner's
   * own position in the plan. When they have not started, day one is the honest
   * answer — it is what everyone is about to read.
   */
  const todayPassageFor = (group: ReadingGroup, mine: GroupProgress | undefined): string => {
    const days = group.plan?.days ?? [];
    if (days.length === 0) return "";
    const dayIndex = Math.min(Math.max((mine?.current_day ?? 1) - 1, 0), days.length - 1);
    return describePassage(days[dayIndex]?.passages ?? [], (bookNumber) =>
      BOOK_BY_NUMBER.get(bookNumber)?.name ?? "",
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-primary/12 p-3 text-primary"><Cloud className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-2xl font-bold">Sync &amp; device backup</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Bookmarks, highlights, study notes, reading progress, plans, reflections, prayer entries, and memory cards stay local by default. Sign in to sync them securely across devices.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            {session ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <LockKeyhole className="h-3.5 w-3.5" />}
            {session ? "Account connected" : "Private until you sign in"}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            {cloudSyncConfigured && supabase ? session ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {accountAvatar(session.user) ? (
                    <img
                      src={accountAvatar(session.user) as string}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                      {accountLabel(session.user).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{accountLabel(session.user)}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{session.user.email}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{syncStatus}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                <GroupNotificationBell
                  userId={session.user.id}
                  onOpenGroup={(groupId) => {
                    setOpenGroupId(groupId);
                    // The bell lives at the top of the panel; bring the open
                    // conversation into view instead of leaving it offscreen.
                    window.requestAnimationFrame(() => {
                      document
                        .getElementById(`group-${groupId}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }}
                />
                <button type="button" onClick={handleSignOut} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
                </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold">Sign in to sync your study</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    One tap with your Google account. No new password to create or remember, and nothing to leave this device until you sign in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
                  {busy ? "Opening Google…" : "Continue with Google"}
                </button>
                {authError && (
                  <p role="alert" className="text-xs text-destructive">{authError}</p>
                )}
                <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Selah only receives your name, email address, and profile picture.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>Cloud sync is not configured yet. Your data remains safely on this device; export a backup below to transfer it manually.</p></div>
            )}
            {backupError && <p role="alert" className="mt-3 text-xs text-destructive">{backupError}</p>}
          </div>

          {session && (
            <NotificationSettings userId={session.user.id} />
          )}

          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <h3 className="font-semibold">Manual backup &amp; transfer</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Export a portable copy, then import it on another device. Imports merge by item and keep the newest edits.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={handleExportBackup} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"><Download className="h-4 w-4" />Export backup</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"><Upload className="h-4 w-4" />Import &amp; merge</button>
              <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={handleImportBackup} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-primary/12 p-3 text-primary"><UsersRound className="h-5 w-5" /></span>
          <div><h2 className="font-display text-2xl font-bold">Shared reading groups</h2><p className="text-xs text-muted-foreground">Invite people to the same plan and follow each member’s completed days.</p></div>
        </div>
        {!session ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">Sign in above to create a group, join by invite code, and sync your reading progress with the group.</div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <form onSubmit={handleCreateGroup} className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-4">
                <h3 className="text-sm font-semibold">Create a group</h3>
                <input required minLength={2} maxLength={100} value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Group name" />
                <select required value={selectedPlanId || allPlans[0]?.id || ""} onChange={(event) => setSelectedPlanId(event.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Plan to share">
                  {allPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title} • {plan.durationDays} days</option>)}
                </select>
                <button disabled={busy || allPlans.length === 0} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"><UsersRound className="h-4 w-4" />Create group</button>
              </form>
              <form onSubmit={handleJoinGroup} className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-4">
                <h3 className="text-sm font-semibold">Join a group</h3>
                <p className="text-xs text-muted-foreground">Paste the invite code or open a shared link that includes it.</p>
                <input required value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="Invite code" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs" aria-label="Invite code" />
                <button disabled={busy || !inviteCode.trim()} type="submit" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"><Link2 className="h-4 w-4" />Join group</button>
              </form>
            </div>
            {groupError && <p role="alert" className="mt-3 text-xs text-destructive">{groupError}</p>}
            {!groupError && groups.length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                No groups yet. Create one above, or join with an invite code someone shared with you.
              </p>
            )}
            {groups.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Your groups ({groups.length})</h3>
                  <button type="button" onClick={() => void refreshGroups()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
                </div>
                {groups.map((group) => {
                  const myProgress = group.progress.find((item) => item.user_id === session.user.id);
                  const open = openGroupId === group.id;
                  return (
                    <article id={`group-${group.id}`} key={group.id} className="scroll-mt-4 rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{group.title}</h4>
                          <p className="text-xs text-muted-foreground">{group.plan?.title || "Shared plan"} • {group.progress.length} member{group.progress.length === 1 ? "" : "s"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => setOpenGroupId(open ? null : group.id)} aria-expanded={open} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${open ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-accent"}`}><MessagesSquare className="h-3.5 w-3.5" />{open ? "Hide conversation" : "Open conversation"}</button>
                          <button type="button" onClick={() => void shareGroup(group)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"><Share2 className="h-3.5 w-3.5" />Invite</button>
                        </div>
                      </div>
                      <GroupActivityCard
                        groupId={group.id}
                        groupTitle={group.title}
                        currentUserId={session.user.id}
                        onRecorded={() => void refreshGroups()}
                      />
                      <GroupJourney
                        groupId={group.id}
                        groupTitle={group.title}
                        currentUserId={session.user.id}
                        isOwner={group.owner_id === session.user.id}
                        planDays={group.plan?.durationDays ?? 0}
                        todayPassage={todayPassageFor(group, myProgress)}
                        refreshKey={group.progress.length}
                      />
                      {!myProgress && <p className="mt-2 text-xs text-muted-foreground">Your own progress appears here once you start this plan.</p>}
                      {group.plan?.id && <button type="button" onClick={() => { if (group.plan.isCustom && !allPlans.some((plan) => plan.id === group.plan.id)) addCustomPlan(group.plan); if (!enrollments.some((entry) => entry.planId === group.plan.id)) enrollInPlan(group.plan.id); }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><CheckCircle2 className="h-3.5 w-3.5" />Add shared plan to my plans</button>}
                      {open && (
                        <GroupForum
                          groupId={group.id}
                          groupTitle={group.title}
                          currentUserId={session.user.id}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
