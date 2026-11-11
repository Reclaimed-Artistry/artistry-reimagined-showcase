# Google sign-in on Android

## How it is supposed to work

The consent screen cannot render inside the Capacitor WebView: Google blocks
sign-in from embedded webviews, and the WebView has a different cookie jar from
Chrome, so a session started there can never complete. The flow therefore leaves
the app:

1. `startGoogleSignIn()` asks Supabase for an authorization URL with
   `skipBrowserRedirect: true` and `redirectTo: app.selahbible.multiversion://auth-callback`.
2. `@capacitor/browser` opens that URL in the system browser (a Custom Tab).
3. The reader picks an account. Google returns to Supabase, which redirects to
   the custom scheme with `?code=...`.
4. Android matches the intent filter in `AndroidManifest.xml` and hands the URL
   back to the app.
5. `completeNativeSignIn()` exchanges the code for a session and closes the tab.

Step 4 has two shapes, and both have to be handled:

- **App still running** — the URL arrives as a deep link. `@capacitor/app` fires
  `appUrlOpen`.
- **App killed while in the browser** — the URL arrives as the *launch intent*.
  No `appUrlOpen` is fired, because nothing was listening when the app started.
  `resumeLaunchSignIn()` covers this by reading `App.getLaunchUrl()` at startup.

## What actually broke

The Android Studio build had **no Supabase configuration at all**.

`src/lib/cloudWorkspace.ts` builds its client from `import.meta.env.VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY`. Vite substitutes those at build time. When `.env`
is absent the build still succeeds — it simply compiles `cloudSyncConfigured` to
`false`, `createClient` is never called, and the Sync & Groups panel shows
"Cloud sync is not configured yet" with no sign-in button.

`.env` was gitignored and only `.env.example` was committed, so a clean checkout
could not build an app that signs in. This was confirmed by building with and
without the file and grepping the output bundle: without it, the project URL
`hvgmwiylc...` does not appear anywhere in `dist/`.

The fix has three parts:

1. **`.env` is committed.** Both values are public by design — the publishable
   key is defended by row-level security, and the deployed site ships the same
   strings to every browser. `.env.local` and `.env.*.local` stay ignored.
2. **`scripts/check-cloud-config.mjs` runs first in `npm run build`.** A missing
   or placeholder value is now a build error rather than a silently crippled
   app.
3. **The deep-link listener is attached at import time**, not when the panel
   mounts. Tapping the button backgrounds the app, and a listener still being
   registered could be torn down before it attached — losing the return trip
   entirely.

## Checking it yourself

```bash
npm run build          # fails loudly if the Supabase config is missing
npx cap sync android
```

Then in Android Studio press **Run**. Sign in from Study → Sync & Groups.

If sign-in still fails, check in this order:

| Symptom | Cause |
|---|---|
| "Cloud sync is not configured yet" | `dist/` was built without `.env`; rerun `npm run build && npx cap sync android` |
| Browser opens, returns to app, nothing happens | `appUrlOpen` not firing — confirm the intent filter survived `cap sync` |
| `redirect_uri_mismatch` from Google | `app.selahbible.multiversion://**` missing from Supabase → Auth → URL Configuration → Redirect URLs |
| "link did not include an authorization code" | Supabase redirected somewhere else; check the allow-list above |
| Works once, then fails | A spent PKCE code was replayed; the dedupe in `googleAuth.ts` should prevent this |

## Verifying the return trip without a device

The redirect and parsing logic is plain TypeScript and can be exercised
directly:

```bash
npx esbuild <test>.mjs --bundle --format=esm --platform=node \
  --loader:.ts=ts --alias:@=./src \
  --define:import.meta.env='{"VITE_SUPABASE_URL":"https://x.supabase.co","VITE_SUPABASE_ANON_KEY":"k"}' \
  --outfile=out.mjs && node out.mjs
```

The `--define` is required because `cloudWorkspace` reads `import.meta.env` at
module load, which Node does not provide.
