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

## Group forum

After signing in with Google, every reading group has a conversation: **Study → Sync & Groups → open a group → Open conversation**. Anyone in the group can ask a question, and anyone can answer it. Questions and answers live in `reading_group_posts`; a reply carries a `parent_id` pointing at the question it answers, and a database trigger refuses a reply whose parent is in a different group.

Display names come from `group_member_names()`, a security-definer function that returns names only for a group the caller already belongs to. `auth.users` is never exposed to the browser.

## Notifications

Every group event is written to `group_notifications`, once per recipient, by database triggers — a member can never forge a notice for somebody else:

| Event | Trigger |
|---|---|
| Someone asks a question or answers one | `notify_group_post` |
| A member completes another day of the shared plan | `notify_group_progress` |
| A member joins | `notify_group_membership` |

The author is excluded from their own notice. Recipients can read only their own rows, and a trigger limits them to changing the `read_at` flag — the text of a notice already queued cannot be rewritten from a browser.

Delivery is a cron job that runs every minute (`selah-push-reminders-every-minute`), calling the `push-reminders` edge function with `action: "send-due"`. It claims the queue atomically with `FOR UPDATE SKIP LOCKED`, so overlapping runs never send twice, then delivers to:

- **Web** — the reader's `PushSubscription`, stored in `device_push_reminders` (the same row the daily reading reminder uses, now carrying `user_id`). Tapping opens the group.
- **Android** — FCM HTTP v1 via `device_push_tokens`.
- **iOS/iPadOS** — APNs token auth via `device_push_tokens`.

### Enabling mobile delivery

Web push works with no further setup; VAPID keys are already configured. Native delivery stays dormant until these secrets exist on the Supabase project, after which no code change is needed:

| Secret | Exact path in the console |
|---|---|
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase console → gear icon → **Project settings** → **Service accounts** tab → **Generate new private key** → **Generate key**. Paste the entire downloaded JSON, braces and all, as one line. |
| `APNS_KEY_ID` | Apple Developer → **Certificates, Identifiers & Profiles** → **Keys** → create a key with **Apple Push Notifications service (APNs)** ticked → the 10-character Key ID on the confirmation screen. |
| `APNS_TEAM_ID` | Apple Developer → **Account** → **Membership details** → Team ID (10 characters). |
| `APNS_PRIVATE_KEY` | The downloaded `AuthKey_XXXXXXXXXX.p8` file, opened in a text editor, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines. |
| `APNS_TOPIC` | Optional. Defaults to `app.selahbible.multiversion`. Must equal the bundle ID. |
| `APNS_ENVIRONMENT` | `sandbox` when testing on a device from Xcode, otherwise leave unset for TestFlight and App Store builds. |

Two different Firebase files are involved for Android, and they are not interchangeable:

- **Service account JSON** — a private credential for the *server*. Goes into the `FCM_SERVICE_ACCOUNT_JSON` secret. Never commit it.
- **`google-services.json`** — client configuration for the *app*. Goes at `android/app/google-services.json`. Safe to commit.

Two native files also need to be in place before a build:

- `android/app/google-services.json` — downloaded from the Firebase project. `android/app/build.gradle` applies the Google services plugin automatically when the file exists.
- iOS signing: `ios/App/App/App.entitlements` carries `aps-environment`. Xcode needs the Push Notifications capability enabled on the App ID.

**iOS does not use Firebase.** `@capacitor/push-notifications` returns the raw APNs device token (hex), not an FCM token, and the edge function posts straight to `api.push.apple.com/3/device/<token>` signed with the `.p8` key. Uploading the key to Firebase would do nothing here — only Android goes through FCM.

`MainActivity` creates the `selah_group` notification channel, because Android 8+ silently drops a notification that names a channel which does not exist.
