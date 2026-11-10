# Selah cloud sync, groups, and Bible Companion

## Cloud sync and reading groups

The web client uses the Supabase project configured in Vercel and the publishable browser key. The database migration is `supabase/migrations/202611060001_selah_cloud_sync_and_groups.sql`; it creates user-scoped study snapshots and shared reading-group tables with row-level security. The `join_reading_group` RPC accepts an invite code and adds the signed-in user without exposing a service-role credential to the browser.

Users opt in by signing in with Google from **Study → Sync & Groups**. Google is the only account provider: there is no password to create or remember, and the sign-up form that used to exist is gone because email confirmation could not be delivered (no SMTP is configured, and `mailer_autoconfirm` was off, so accounts were created but never usable).

### Sign-in flow

`src/lib/googleAuth.ts` owns it. One tap calls `supabase.auth.signInWithOAuth({ provider: "google" })` with `prompt=select_account`, so the reader chooses which Google account to sync.

- **Browser** — a normal redirect. The client stores the PKCE verifier in `localStorage` and `detectSessionInUrl` finishes the exchange when the browser returns to `/auth/callback`. `src/components/auth/AuthCallbackPage.tsx` renders that route, waits for the session, then sends the reader on to Study. `App.tsx` mounts it *before* the reader shell, which would otherwise treat the callback URL as an ordinary deep link.
- **Android / iOS** — the consent screen must open in the system browser. Google refuses to sign in from an embedded WebView, and the Android WebView keeps its own cookie jar, so a consent screen rendered inside the app can never complete. `startGoogleSignIn()` passes `skipBrowserRedirect` and opens the URL with `@capacitor/browser`; Supabase then redirects to `app.selahbible.multiversion://auth-callback`, which the AndroidManifest intent filter catches. The deep link carries a `code` that `detectSessionInUrl` cannot see, so `completeNativeSignIn()` exchanges it explicitly.

The allowed redirect list in Supabase Auth must contain both shapes:

```
https://selah-bible-alpha.vercel.app/**
https://selah-bible-*.vercel.app/**
http://localhost:8080/**
app.selahbible.multiversion://**
```

The custom scheme is defined once in `android/app/src/main/res/values/strings.xml` (`custom_url_scheme`) and is referenced by the intent filter; `APP_URL_SCHEME` in `googleAuth.ts` has to match it.

### Reading groups

Group data lives in `reading_groups`, `reading_group_members`, and `reading_group_progress`. The owner's membership row is created by the `reading_group_owner_membership` trigger, which is what makes the group visible to them at all — the SELECT policy is "you can see a group you are a member of", so a missing membership row makes a freshly created group invisible to its own owner.

`join_reading_group(invite_code)` adds the caller as a member and returns the group without exposing a service key. Progress is published per plan and only when the numbers actually change: the sync keeps a signature of the last push, because writing a fresh `updated_at` back into state used to re-trigger the effect and produce a continuous write loop.

Existing device data is merged with the cloud snapshot. Later edits auto-save after a short debounce; writes merge with the latest cloud snapshot and use an `updated_at` compare-and-swap retry so concurrent devices don't simply overwrite distinct edits. Deleted bookmarks, notes, highlights, prayers, and memory cards use synced deletion markers so a removed item is not reintroduced by another device. A JSON export/import remains available for manual transfer.

Public Vercel build variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the Supabase publishable key; safe to embed, with access controlled by RLS)

Never add a Supabase secret/service-role key to a `VITE_` variable or the client bundle.

## Selah Bible Companion

Selah Bible Companion is a local, retrieval-based Bible study assistant. It does not call OpenAI or another hosted language model, has no provider API key, and does not require sign-in. Its evidence comes from complete Bible editions bundled with the app (KJV and BSB), any full translations the user has downloaded/imported on that device, the visible chapter, canonical book metadata, curated topical reading paths, cross-references, and selected Hebrew/Greek word-study notes. It links relevant references back to the reader and preserves recent conversation turns for follow-up searches.

The companion searches only translations available locally on that device; copyrighted editions are not redistributed by Selah and may remain publisher-hosted or require the user to obtain/download an authorized copy. Original-language material is a curated study aid, not a complete scholarly lexicon. Sermon requests use curated frameworks for common themes and local verse matching for other topics to prepare a big idea, purpose, three-point outline, exposition, application, and linked Bible portions. When no close topical match exists, the draft identifies that limitation and uses the current reading only as a clearly labeled starting point. Because this is a deterministic local study/search engine rather than a generative language model, answers are grounded in retrieved Bible text and study notes; it does not claim that every modern subject is directly addressed by a selected passage.

Account sign-in remains available separately under **Study → Sync & Groups** for optional cloud backup and shared reading plans. It is not used by the local Selah Bible Companion. No OpenAI provider key is needed or stored in Vercel.

## Audio behavior

Audio uses browser speech synthesis or streams the Bible provider's studio narration. Media Session metadata and lock-screen controls are registered when the browser supports them. Sleep timer choices cycle through 15, 30, 45, and 60 minutes. Studio narration is not cached or offered as an offline download because third-party recording redistribution licenses are not verified.
