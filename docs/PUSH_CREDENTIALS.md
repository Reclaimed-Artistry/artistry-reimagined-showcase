# Where to get the push credentials

Push delivery is already wired. It stays dormant until these credentials exist.
Nothing needs to change in the code afterwards.

There are two independent paths:

- **Web** — already working. VAPID keys are configured. Nothing to do.
- **Android** — needs a Firebase project.
- **iOS / iPadOS** — needs an Apple Developer account. **Not Firebase.** This app sends
  straight to APNs with the `.p8` key, because `@capacitor/push-notifications` returns
  the raw APNs device token rather than an FCM token.

---

## Android — Firebase (free)

1. Go to <https://console.firebase.google.com> and **Add project**. Any name works.
   Google Analytics is not needed.
2. In the project, click the **Android** icon to add an app.
   - **Android package name:** `app.selahbible.multiversion` — this must match exactly.
   - Download **`google-services.json`**.
3. Put that file at **`android/app/google-services.json`**. It is safe to commit; it
   contains no secret. `android/app/build.gradle` already applies the Google services
   plugin automatically once the file exists.
4. Now get the *server* credential — this one is a secret:
   - Gear icon → **Project settings** → **Service accounts** tab.
   - **Generate new private key** → **Generate key**.
   - A `.json` file downloads. This is `FCM_SERVICE_ACCOUNT_JSON`.

> **Do not confuse the two files.** `google-services.json` is client configuration that
> ships inside the app. The service account JSON is a private key for the server. They
> are different downloads from different screens, and swapping them will not work.

---

## iOS / iPadOS — Apple Developer (paid membership, $99/yr)

1. Sign in at <https://developer.apple.com/account>.
2. **Certificates, Identifiers & Profiles** → **Keys** → **+** to create a key.
   - Name it something like `Selah APNs`.
   - Tick **Apple Push Notifications service (APNs)**.
   - **Continue** → **Register**.
3. **Download the `.p8` file now.** Apple allows exactly one download. If it is lost
   you must revoke the key and create another.
   - That file is `APNS_PRIVATE_KEY`.
   - Note the **Key ID** on that same screen (10 characters) — that is `APNS_KEY_ID`.
4. **Account** → **Membership details** → copy the **Team ID** (10 characters) — that is
   `APNS_TEAM_ID`.
5. Enable the capability on the app:
   - **Certificates, Identifiers & Profiles** → **Identifiers** → find
     `app.selahbible.multiversion` → **Push Notifications** → save.
   - In Xcode, open `ios/App/App.xcworkspace`, select the App target →
     **Signing & Capabilities** → confirm **Push Notifications** appears. The
     entitlements file is already in the repo and already referenced by both build
     configurations.

> Apple allows a maximum of **two active APNs keys per account**, so do not create one
> per build or per developer. One key works for every app in the account and never
> expires.

---

## Where each value goes

Set them in **Supabase → Project Settings → Edge Functions → Secrets**
(project `hvgmwiylmtdxiuqzcgxp`), or hand them over and they can be set for you.

| Secret | Value |
|---|---|
| `FCM_SERVICE_ACCOUNT_JSON` | The whole service account JSON file, as one line |
| `APNS_KEY_ID` | 10-character Key ID |
| `APNS_TEAM_ID` | 10-character Team ID |
| `APNS_PRIVATE_KEY` | Contents of the `.p8` file, including the BEGIN/END lines |
| `APNS_ENVIRONMENT` | `sandbox` for Xcode device builds; unset for TestFlight/App Store |

### Please do not paste the private key into chat

`APNS_PRIVATE_KEY` and `FCM_SERVICE_ACCOUNT_JSON` are live credentials. Anyone holding
them can send push notifications as this app. Two safer options:

1. **Set them yourself** — it takes about two minutes in the Supabase dashboard, and the
   existing secrets list already has `VAPID_PRIVATE_KEY` set the same way. Best option.
2. **Save the files into this workspace** and ask for them to be installed. They can be
   read straight from disk and written into Supabase secrets, so the values never appear
   in a message.

If a key is ever exposed, revoke it in the Apple Developer portal (Keys → your key →
Revoke) or delete the service account key in Firebase, then create a replacement.

---

## Checking it works

Once the secrets are set, and a build carrying `google-services.json` / the APNs
capability is installed:

1. Sign in with Google → **Study → Sync & Groups**.
2. Open a group → **Open conversation** → **Turn notifications on** and allow it.
3. Confirm the device registered:
   - Android/iOS — a row should appear in `device_push_tokens` for that account.
   - Web — the browser's row in `device_push_reminders` gains a `user_id`.
4. From a second account, post a question in the group.
5. Within about a minute (the cron runs every minute) the notification should arrive.

If nothing arrives, the delivery worker records *why* on the token row:
`last_failure_at` and `failure_reason` in `device_push_tokens` carry the FCM or APNs
error, which is usually enough to identify a wrong Team ID, a bundle ID mismatch, or a
`sandbox` vs production mismatch.
