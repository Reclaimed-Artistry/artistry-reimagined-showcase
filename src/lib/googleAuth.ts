import { Capacitor } from "@capacitor/core";
import { supabase } from "./cloudWorkspace";

/**
 * Google sign-in.
 *
 * Selah uses Google as its only account provider. There is no password to
 * remember, and an account is only required for cloud backup and reading
 * groups — everything else works on the device without signing in.
 *
 * Three environments, three flows:
 *
 * - **Browser** — a normal redirect. Supabase stores the PKCE verifier in
 *   `localStorage`, so the single-page reload can finish the exchange itself
 *   (`detectSessionInUrl: true` in `cloudWorkspace`).
 * - **Android app** — the system browser. The Android WebView is a separate
 *   cookie jar from Chrome, so a Google consent screen rendered inside it can
 *   never complete, and Google blocks sign-in from embedded webviews outright.
 *   The consent screen therefore opens outside the app.
 * - **iOS app** — the same out-of-app flow, through an SFSafariViewController tab.
 *
 * ## Why the return trip is https and not a custom scheme
 *
 * The obvious design is to redirect back to `app.selahbible.multiversion://auth-callback`
 * and catch it with `appUrlOpen`. In practice that handoff is unreliable: a
 * navigation that no human tapped (Google's automatic redirect to our
 * redirect_uri) does not always leave a Chrome Custom Tab for another app's
 * scheme, so the tab simply sits on a URL nothing renders, and the app is never
 * told the sign-in finished. The reader sees the browser close back onto a
 * signed-out panel with no error at all — which is exactly the bug that was
 * reported.
 *
 * Chrome's own routing says so: it sends an unfamiliar scheme to whichever app
 * claims it "but doesn't do so when there is not an accompanying user gesture"
 * (crbug.com/41328386). A Custom Tab renders nothing for a scheme it will not
 * route, so the tab just sits there.
 *
 * So on native the redirect goes to the *website's* https callback page
 * (`/auth/callback/native`). An ordinary https page always loads, and that page
 * asks for the one tap the platform requires before handing the code back to
 * the app, which then finishes the PKCE exchange against the verifier its own
 * WebView already stored.
 *
 * The custom scheme is still registered and still understood
 * (`isAuthCallbackUrl`), so builds that already have it baked into a published
 * OAuth redirect keep working, and a delivery that arrives as a launch intent is
 * still completed. It is a fallback, not the primary path.
 */

/** Must match the intent filter in AndroidManifest.xml and the iOS URL scheme. */
export const APP_URL_SCHEME = "app.selahbible.multiversion";
export const APP_AUTH_REDIRECT = `${APP_URL_SCHEME}://auth-callback`;

export const AUTH_CALLBACK_PATH = "/auth/callback";

export type AuthFailure =
  | "not-configured"
  | "cancelled"
  | "popup"
  | "exchange"
  | "network"
  | "unknown";

export class AuthError extends Error {
  readonly reason: AuthFailure;

  constructor(reason: AuthFailure, message: string) {
    super(message);
    this.name = "AuthError";
    this.reason = reason;
  }
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function platform(): "android" | "ios" | "web" {
  try {
    const value = Capacitor.getPlatform();
    return value === "android" || value === "ios" ? value : "web";
  } catch {
    return "web";
  }
}

/** The deployed site that hosts `/auth/callback` for native builds. */
const PUBLIC_WEB_ORIGIN = "https://selah-bible-alpha.vercel.app/";

/**
 * Path the app's sign-in returns to, on the public site.
 *
 * A path segment rather than a query parameter on purpose: Supabase appends
 * `?code=...` to whatever it is given, and a query string already in the
 * redirect would make that ambiguous. `/auth/callback/native` cannot collide.
 */
export const NATIVE_CALLBACK_PATH = `${AUTH_CALLBACK_PATH}/native`;

/** Where the app is served from, with a trailing slash for `new URL`. */
function appOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_WEB_ORIGIN;
  // A Capacitor app serves the bundled files from a local host
  // (`https://localhost` on Android), which only exists inside that WebView.
  // The OAuth redirect has to be a real, publicly reachable page, so native
  // builds always use the deployed site. A browser uses whatever origin it is
  // actually served from, unless that is a dev server.
  const { protocol, hostname } = window.location;
  if (!isNative() && protocol === "https:" && hostname && !hostname.startsWith("localhost")) {
    return `${window.location.origin}/`;
  }
  return PUBLIC_WEB_ORIGIN;
}

/**
 * The URL Supabase sends the browser back to.
 *
 * Native builds use the website's https callback rather than the custom scheme
 * — see the note at the top of this file for why the deep link alone was not
 * enough. The `/native` path tells that page to hand the code back to the app
 * with a tap instead of trying to finish a web sign-in it has no verifier for.
 */
export function authRedirectUrl(): string {
  const path = isNative() ? NATIVE_CALLBACK_PATH : AUTH_CALLBACK_PATH;
  return new URL(path.replace(/^\//, ""), appOrigin()).toString();
}

export function isAuthCallbackUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith(APP_AUTH_REDIRECT)) return true;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    return path === AUTH_CALLBACK_PATH || path === NATIVE_CALLBACK_PATH;
  } catch {
    return false;
  }
}

/** Pulls the `code` / error out of either a deep link or the https callback. */
export function readAuthCallback(url: string): {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;
    // The pkce flow can also return the code in the query when the provider
    // falls back to the implicit-ish shape.
    const code = params.get("code");
    const hash = parsed.hash.startsWith("#") ? new URLSearchParams(parsed.hash.slice(1)) : null;
    return {
      code: code || hash?.get("code") || null,
      error: params.get("error") || hash?.get("error") || null,
      errorDescription:
        params.get("error_description") || hash?.get("error_description") || null,
    };
  } catch {
    return { code: null, error: null, errorDescription: null };
  }
}

function googleError(error: unknown): AuthError {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error || "");
  const lower = message.toLowerCase();
  if (/popup|window|blocked/.test(lower)) {
    return new AuthError("popup", message || "The Google sign-in window was blocked.");
  }
  if (/cancelled|canceled|closed|dismiss/.test(lower)) {
    return new AuthError("cancelled", "Sign-in was cancelled.");
  }
  if (/network|fetch|timeout/.test(lower)) {
    return new AuthError("network", "Google sign-in could not reach the network.");
  }
  return new AuthError("unknown", message || "Google sign-in could not be started.");
}

/** Opens `url` outside the Capacitor WebView, in whatever the OS provides. */
async function openExternal(url: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

/**
 * Starts Google sign-in.
 *
 * Resolves with the authorization URL it opened. On the web the page is about
 * to navigate away, so the value is only useful for diagnostics; on native the
 * promise resolving means the system browser was opened, not that the reader
 * signed in. The session arrives through `onAuthStateChange`, or through
 * `completeNativeSignIn` when the return trip reaches the app.
 */
export async function startGoogleSignIn(): Promise<string> {
  if (!supabase) {
    throw new AuthError("not-configured", "Cloud sync is not configured in this build.");
  }

  const redirectTo = authRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      // The native app opens the URL itself so the consent screen leaves the
      // WebView (Google refuses sign-in from embedded webviews).
      skipBrowserRedirect: isNative(),
      queryParams: {
        // Let the reader pick which Google account to sync with, rather than
        // silently reusing whichever one the browser has signed in.
        prompt: "select_account",
      },
    },
  });

  if (error) throw googleError(error);
  if (!data?.url) throw new AuthError("unknown", "Google sign-in did not return a URL.");

  if (!isNative()) {
    // Letting the browser follow the URL is what the SDK intends; the page is
    // about to navigate, so nothing after this matters.
    window.location.assign(data.url);
    return data.url;
  }

  try {
    await openExternal(data.url);
  } catch (error) {
    throw new AuthError("popup", googleError(error).message);
  }

  return data.url;
}

/**
 * Finishes a native sign-in from the deep link the OS handed back.
 * Returns true when a session was established.
 */
export async function completeNativeSignIn(url: string): Promise<boolean> {
  if (!supabase) return false;

  const { code, error, errorDescription } = readAuthCallback(url);

  if (error) {
    throw new AuthError(
      error === "access_denied" ? "cancelled" : "exchange",
      errorDescription || "Google sign-in was not completed.",
    );
  }
  if (!code) {
    throw new AuthError("exchange", "The sign-in link did not include an authorization code.");
  }

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    const message = exchangeError.message || "Could not finish signing in.";
    throw new AuthError(/network|fetch/i.test(message) ? "network" : "exchange", message);
  }

  await closeSignInBrowser();
  return Boolean(data.session);
}

/** Dismisses the custom tab/browser sheet after the redirect comes back. */
export async function closeSignInBrowser(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // The sheet was already dismissed by the OS.
  }
}

/**
 * Completes a native sign-in from a URL the OS handed back, once.
 *
 * Both entry points funnel through here so a code is never exchanged twice:
 * Android delivers the return trip as a deep link to a running app *or* as the
 * launch intent of a killed one, and the same URL can otherwise arrive on both
 * channels. A spent PKCE code fails the second exchange, which would overwrite
 * a successful sign-in with an error.
 */
const exchanged = new Set<string>();

async function completeOnce(
  url: string,
  onResult: (error: AuthError | null) => void,
): Promise<void> {
  if (!isAuthCallbackUrl(url)) return;

  // Keyed on the code rather than the whole URL: the fragment can carry extra
  // state that differs between deliveries of the same sign-in.
  const key = readAuthCallback(url).code || url;
  if (exchanged.has(key)) return;
  exchanged.add(key);
  if (exchanged.size > 20) exchanged.clear();

  try {
    const signedIn = await completeNativeSignIn(url);
    onResult(signedIn ? null : new AuthError("exchange", "Sign-in did not return a session."));
  } catch (error) {
    void closeSignInBrowser();
    onResult(
      error instanceof AuthError
        ? error
        : new AuthError("unknown", "Could not finish signing in."),
    );
  }
}

/** The pending `appUrlOpen` registration, created at module load. */
let listenerPromise: Promise<() => void> | null = null;

/**
 * Attaches the `appUrlOpen` listener as early as possible.
 *
 * This deliberately does not wait for a component to mount. Tapping "Continue
 * with Google" switches the app to the system browser, and Android may stop or
 * kill the activity while the reader is choosing an account. A listener that
 * was only being registered at that moment could be torn down before it
 * attached, and then the deep link would open the app with nothing listening
 * for it — a sign-in that silently never finishes.
 *
 * Registering at import time means the listener exists before the first render,
 * whether the reader came from a deep link or a cold start.
 */
function ensureNativeListener(): Promise<() => void> {
  if (listenerPromise) return listenerPromise;

  listenerPromise = import("@capacitor/app")
    .then(({ App }) =>
      App.addListener("appUrlOpen", ({ url }) => {
        void completeOnce(url, (error) => {
          for (const sink of resultSinks) sink(error);
        });
      }).then((handle) => () => void handle.remove()),
    )
    .catch(() => () => {});

  return listenerPromise;
}

/** Mounted components that want to hear the outcome of a deep-link sign-in. */
const resultSinks = new Set<(error: AuthError | null) => void>();

/**
 * Registers the deep-link listener that completes an Android/iOS sign-in.
 * Returns an unsubscribe function.
 *
 * Safe to call from a component effect: the underlying OS listener is shared
 * and outlives any single mount, so remounting the panel cannot lose a result.
 */
export function listenForAuthCallback(
  onResult: (error: AuthError | null) => void,
): () => void {
  if (!isNative()) return () => {};

  resultSinks.add(onResult);
  void ensureNativeListener();

  return () => {
    resultSinks.delete(onResult);
  };
}

/** The signed-in account's display name, falling back to the email address. */
export function accountLabel(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const metadata = user.user_metadata || {};
  const name = [metadata.full_name, metadata.name, metadata.user_name].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return name || user.email || "Signed in";
}

/** Google profile picture, when the account has one. */
export function accountAvatar(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const picture = (user.user_metadata || {}).avatar_url || (user.user_metadata || {}).picture;
  return typeof picture === "string" && picture ? picture : null;
}

export { platform as authPlatform };

/**
 * Finish a sign-in that arrived as the app's *launch* intent.
 *
 * `appUrlOpen` only fires for an intent delivered to an app that is already
 * running. Android is free to kill Selah while the reader is away in the
 * browser picking an account, and then the return trip launches the app
 * instead. Nothing would exchange the code and the sign-in would stall with no
 * error at all.
 *
 * This runs once at startup rather than inside a section component, because a
 * relaunched app opens on whatever screen it was told to, and the Sync panel
 * may never mount. Resolves `true` when it did exchange a session, so the
 * caller can take the reader to the screen that shows they are signed in.
 */
export async function resumeLaunchSignIn(): Promise<boolean> {
  if (!isNative()) return false;
  // The deep-link listener has to exist even when this is not a launch-intent
  // sign-in, because the next return trip may arrive while the app is running.
  void ensureNativeListener();
  try {
    const { App } = await import("@capacitor/app");
    const launch = await App.getLaunchUrl();
    if (!launch?.url || !isAuthCallbackUrl(launch.url)) return false;
    // Share the dedupe with the listener: a killed app can be handed the same
    // URL through both channels.
    let failure: AuthError | null = null;
    await completeOnce(launch.url, (error) => {
      failure = error;
    });
    if (failure) throw failure;
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  } catch (error) {
    // A spent or tampered code throws here. Staying quiet is right: the reader
    // sees the signed-out panel and can simply sign in again.
    void closeSignInBrowser();
    if (error instanceof AuthError) return false;
    return false;
  }
}
