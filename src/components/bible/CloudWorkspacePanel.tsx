import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  CheckCircle2,
  Cloud,
  Download,
  Link2,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("On this device only");
  const [groupTitle, setGroupTitle] = useState("My reading group");
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
      setGroupError(error.message);
      return;
    }
    const groupRows = (data || []) as Omit<ReadingGroup, "progress">[];
    const ids = groupRows.map((group) => group.id);
    const progressResult = ids.length
      ? await supabase.from("reading_group_progress").select("group_id,user_id,completed_days,current_day,updated_at").in("group_id", ids)
      : { data: [], error: null };
    if (progressResult.error) {
      setGroupError(progressResult.error.message);
      return;
    }
    const progress = (progressResult.data || []) as (GroupProgress & { group_id: string })[];
    setGroups(groupRows.map((group) => ({ ...group, progress: progress.filter((row) => row.group_id === group.id) })));
  }, [session?.user.id]);

  useEffect(() => {
    if (session?.user.id) void refreshGroups();
    else setGroups([]);
  }, [session?.user.id, refreshGroups]);

  useEffect(() => {
    if (!supabase || !session?.user.id || !syncReady || groups.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const group of groups) {
        const enrollment = enrollments.find((item) => item.planId === group.plan.id);
        if (!enrollment) continue;
        const progressRow = {
          group_id: group.id,
          user_id: session.user.id,
          completed_days: enrollment.completedDays,
          current_day: Math.max(1, enrollment.lastReadDay),
          updated_at: new Date().toISOString(),
        };
        void supabase.from("reading_group_progress").upsert(progressRow, { onConflict: "group_id,user_id" })
          .then(({ error }) => {
            if (error) return;
            setGroups((currentGroups) => currentGroups.map((current) => {
              if (current.id !== group.id) return current;
              const existing = current.progress.find((item) => item.user_id === session.user.id);
              const same = existing && existing.current_day === progressRow.current_day &&
                existing.completed_days.length === progressRow.completed_days.length &&
                existing.completed_days.every((day, index) => day === progressRow.completed_days[index]);
              if (same) return current;
              const nextProgress: GroupProgress = {
                user_id: session.user.id,
                completed_days: progressRow.completed_days,
                current_day: progressRow.current_day,
                updated_at: progressRow.updated_at,
              };
              return { ...current, progress: [...current.progress.filter((item) => item.user_id !== session.user.id), nextProgress] };
            }));
          });
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [groups, enrollments, session?.user.id, syncReady]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setBackupError(null);
    const result = authMode === "signup"
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.href },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setBackupError(result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setSyncStatus("Check your email to confirm your Selah account, then sign in here.");
      toast.success("Confirmation email sent");
    } else {
      setSession(result.data.session);
      toast.success(authMode === "signup" ? "Account created" : "Signed in");
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) setBackupError(error.message);
    else {
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
      setGroupError(error.message);
      return;
    }
    if (!enrollments.some((enrollment) => enrollment.planId === plan.id)) enrollInPlan(plan.id);
    await refreshGroups();
    toast.success("Reading group created");
  };

  const handleJoinGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !session?.user.id) return;
    setBusy(true);
    setGroupError(null);
    const { data, error } = await supabase.rpc("join_reading_group", { p_invite_code: inviteCode.trim() });
    setBusy(false);
    if (error) {
      setGroupError(error.message);
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
                <div>
                  <div className="text-sm font-semibold">{session.user.email}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{syncStatus}</div>
                </div>
                <button type="button" onClick={handleSignOut} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAuthMode("signin")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${authMode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign in</button>
                  <button type="button" onClick={() => setAuthMode("signup")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${authMode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Create account</button>
                </div>
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                <input required minLength={8} type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (8+ characters)" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
                <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}{authMode === "signup" ? "Create secure account" : "Sign in and sync"}</button>
              </form>
            ) : (
              <div className="flex items-start gap-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>Cloud sync is not configured yet. Your data remains safely on this device; export a backup below to transfer it manually.</p></div>
            )}
            {backupError && <p role="alert" className="mt-3 text-xs text-destructive">{backupError}</p>}
          </div>

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
            {groups.length > 0 && <div className="mt-5 space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Your groups ({groups.length})</h3><button type="button" onClick={() => void refreshGroups()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><RefreshCw className="h-3.5 w-3.5" />Refresh</button></div>
              {groups.map((group) => {
                const myProgress = group.progress.find((item) => item.user_id === session.user.id);
                return <article key={group.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold">{group.title}</h4><p className="text-xs text-muted-foreground">{group.plan?.title || "Shared plan"} • {group.progress.length} member{group.progress.length === 1 ? "" : "s"}</p></div>
                    <button type="button" onClick={() => void shareGroup(group)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"><Share2 className="h-3.5 w-3.5" />Invite</button></div>
                  <div className="mt-3 flex flex-wrap gap-2">{group.progress.map((item) => <span key={item.user_id} className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px]"><strong>{item.user_id === session.user.id ? "You" : `Reader ${item.user_id.slice(0, 5)}`}</strong> • {item.completed_days.length}/{group.plan.durationDays} days</span>)}{!myProgress && <span className="text-xs text-muted-foreground">Progress appears after you start this plan.</span>}</div>
                  {group.plan?.id && <button type="button" onClick={() => { if (group.plan.isCustom && !allPlans.some((plan) => plan.id === group.plan.id)) addCustomPlan(group.plan); if (!enrollments.some((entry) => entry.planId === group.plan.id)) enrollInPlan(group.plan.id); }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><CheckCircle2 className="h-3.5 w-3.5" />Add shared plan to my plans</button>}
                </article>;
              })}
            </div>}
          </>
        )}
      </section>
    </div>
  );
};
