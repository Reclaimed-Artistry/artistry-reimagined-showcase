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
 *   The redirect therefore comes back to the app with a deep link
 *   (`app.selahbible.multiversion://auth-callback`) instead.
 * - **iOS app** — the same deep-link flow, through a SFSafariViewController tab.
 *
 * The deep-link return carries a `code` that has to be exchanged for a session
 * by hand: `detectSessionInUrl` only understands http(s) URLs.
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

/** Where the app is served from, with a trailing slash for `new URL`. */
function appOrigin(): string {
  if (typeof window === "undefined") return "https://selah-bible-alpha.vercel.app";
  // A Capacitor app serves the bundled files from these hosts; the public site
  // is what Supabase has to send the browser back to.
  const { protocol, hostname } = window.location;
  if (protocol === "https:" && hostname && !hostname.startsWith("localhost")) {
    return `${window.location.origin}/`;
  }
  return "https://selah-bible-alpha.vercel.app/";
}

/** The URL Supabase sends the browser back to. */
export function authRedirectUrl(): string {
  if (isNative()) return APP_AUTH_REDIRECT;
  return new URL(AUTH_CALLBACK_PATH.replace(/^\//, ""), appOrigin()).toString();
}

export function isAuthCallbackUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith(APP_AUTH_REDIRECT)) return true;
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/$/, "") === AUTH_CALLBACK_PATH;
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
 * Resolves once the provider page has been opened (the browser navigates away
 * on the web, so the promise resolving is not a sign-in result). The session
 * arrives through `onAuthStateChange`, or through `completeNativeSignIn` on
 * Android/iOS.
 */
export async function startGoogleSignIn(): Promise<void> {
  if (!supabase) {
    throw new AuthError("not-configured", "Cloud sync is not configured in this build.");
  }

  const redirectTo = authRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      // The native app opens the URL itself so the consent screen leaves the
      // WebView and the return trip can be caught as a deep link.
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
    return;
  }

  try {
    await openExternal(data.url);
  } catch (error) {
    throw new AuthError("popup", googleError(error).message);
  }
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
 * Registers the deep-link listener that completes an Android/iOS sign-in.
 * Returns an unsubscribe function.
 */
export function listenForAuthCallback(
  onResult: (error: AuthError | null) => void,
): () => void {
  if (!isNative()) return () => {};

  let disposed = false;
  let remove: (() => void) | undefined;

  const handleUrl = (url: string) => {
    if (!isAuthCallbackUrl(url)) return;
    void completeNativeSignIn(url)
      .then((signedIn) => {
        onResult(signedIn ? null : new AuthError("exchange", "Sign-in did not return a session."));
      })
      .catch((error: unknown) => {
        void closeSignInBrowser();
        onResult(
          error instanceof AuthError
            ? error
            : new AuthError("unknown", "Could not finish signing in."),
        );
      });
  };

  void import("@capacitor/app").then(({ App }) => {
    if (disposed) return;
    const listener = App.addListener("appUrlOpen", ({ url }) => handleUrl(url));
    // `addListener` resolves to a handle that removes it.
    void listener.then((handle) => {
      if (disposed) void handle.remove();
      else remove = () => void handle.remove();
    });

  });

  return () => {
    disposed = true;
    remove?.();
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
  try {
    const { App } = await import("@capacitor/app");
    const launch = await App.getLaunchUrl();
    if (!launch?.url || !isAuthCallbackUrl(launch.url)) return false;
    return await completeNativeSignIn(launch.url);
  } catch (error) {
    // A spent or tampered code throws here. Staying quiet is right: the reader
    // sees the signed-out panel and can simply sign in again.
    void closeSignInBrowser();
    if (error instanceof AuthError) return false;
    return false;
  }
}
