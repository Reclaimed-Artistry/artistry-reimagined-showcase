import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, TriangleAlert } from "lucide-react";
import {
  APP_AUTH_REDIRECT,
  NATIVE_CALLBACK_PATH,
  readAuthCallback,
} from "@/lib/googleAuth";
import { supabase } from "@/lib/cloudWorkspace";

/** The app's own address for this sign-in, carrying the code across. */
function nativeReturnUrl(href: string, code: string | null): string {
  if (!code) return APP_AUTH_REDIRECT;
  return `${APP_AUTH_REDIRECT}?code=${encodeURIComponent(code)}`;
}

/**
 * Landing page for the Google sign-in redirect.
 *
 * Two jobs, depending on who is asking:
 *
 * - **A browser** finishes the PKCE exchange on its own (`detectSessionInUrl`),
 *   so this page only waits for the session to appear and then hands the
 *   reader back to the Study screen. It exists so the return trip does not
 *   drop into the reader with no explanation, and so a failed sign-in has
 *   somewhere to show its reason.
 * - **The app's WebView** cannot finish the exchange from here: the code was
 *   minted for the native flow and the verifier lives in the app, so this page
 *   shows one large button that hands the code back to the app. That tap is the
 *   point — phones only follow a custom scheme from a gesture the reader made,
 *   which is why the automatic handoff that used to happen on the way back from
 *   Google silently did nothing.
 */
const BrowserCallback: React.FC = () => {
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");
  const returnedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const returnToStudy = (signedIn: boolean) => {
      if (returnedRef.current) return;
      returnedRef.current = true;
      setState(signedIn ? "done" : "error");
      window.setTimeout(() => {
        // `replace` keeps the callback URL out of the back stack, so pressing
        // back from Study does not replay a spent authorization code.
        window.location.replace("/?section=study");
      }, signedIn ? 900 : 3200);
    };

    if (!supabase) {
      setState("error");
      setMessage("Cloud sync is not configured in this build.");
      return () => {
        cancelled = true;
      };
    }

    const callback = readAuthCallback(window.location.href);
    if (callback.error) {
      setState("error");
      setMessage(
        callback.error === "access_denied"
          ? "Google sign-in was cancelled before it finished."
          : callback.errorDescription || "Google sign-in was not completed.",
      );
      window.setTimeout(() => window.location.replace("/?section=study"), 3200);
      return () => {
        cancelled = true;
      };
    }

    // `getSession()` waits for the initial URL detection to settle, so a code
    // still being exchanged shows up here rather than as a false negative.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled || returnedRef.current) return;
      if (error) {
        setState("error");
        setMessage(error.message);
        window.setTimeout(() => window.location.replace("/?section=study"), 3200);
        return;
      }
      if (data.session) {
        returnToStudy(true);
        return;
      }
      // No session yet: give the exchange a moment, then look again.
      window.setTimeout(() => {
        if (cancelled || returnedRef.current) return;
        void supabase.auth.getSession().then(({ data: retry }) => {
          if (cancelled || returnedRef.current) return;
          if (retry.session) returnToStudy(true);
          else {
            setState("error");
            setMessage(
              callback.code
                ? "Google returned a sign-in code this browser could not use. Open the app again to retry."
                : "This sign-in link has expired. Start again from Study → Sync & Groups.",
            );
            window.setTimeout(() => window.location.replace("/?section=study"), 3200);
          }
        });
      }, 1200);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-sm"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          {state === "working" && <Loader2 className="h-6 w-6 animate-spin" />}
          {state === "done" && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
          {state === "error" && <TriangleAlert className="h-6 w-6 text-amber-600" />}
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">
          {state === "working" && "Finishing sign-in"}
          {state === "done" && "Signed in"}
          {state === "error" && "Sign-in incomplete"}
        </h1>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {state === "working" && "Connecting your Selah account to Google…"}
          {state === "done" && "Taking you back to your study workspace."}
          {state === "error" && (message || "Something interrupted the sign-in.")}
        </p>
      </div>
    </main>
  );
};

/**
 * The page the app's WebView is left on after signing in with Google.
 *
 * It does not touch the session. The code belongs to the native flow and its
 * verifier is in the app, so the only way to finish is to get the code back
 * into the app — with a deliberate tap, because a phone will only hand a
 * custom-scheme link to another app when the reader asks for it. The link is
 * a real anchor as well, so the handoff still works if the script has not run.
 */
const NativeHandoff: React.FC = () => {
  const callback = useMemo(
    () => readAuthCallback(typeof window === "undefined" ? "" : window.location.href),
    [],
  );
  const backToApp = useMemo(
    () => (typeof window === "undefined" ? "" : nativeReturnUrl(window.location.href, callback.code)),
    [callback.code],
  );
  const [opening, setOpening] = useState(false);

  // Deliberately no automatic jump to the custom scheme. Browsers block a
  // navigation to another app's scheme unless the reader initiated it, and the
  // blocked attempt replaces this page with an error, which looks like the
  // sign-in broke. The tap below is the supported path and always works.
  const failed = Boolean(callback.error) || !callback.code;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          {failed ? <TriangleAlert className="h-6 w-6 text-amber-600" /> : <Smartphone className="h-6 w-6" />}
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">
          {failed ? "Sign-in incomplete" : "One more tap"}
        </h1>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {failed
            ? callback.error === "access_denied"
              ? "Google sign-in was cancelled before it finished. Return to Selah and try again."
              : callback.errorDescription || "Google did not complete the sign-in. Return to Selah and try again."
            : "Your Google account is confirmed. Open Selah to finish signing in."}
        </p>
        <a
          href={backToApp || APP_AUTH_REDIRECT}
          onClick={() => setOpening(true)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Return to Selah
        </a>
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          Selah did not open? Close this browser tab and open the app — the sign-in is waiting for you there.
        </p>
      </div>
    </main>
  );
};

export const AuthCallbackPage: React.FC = () => {
  const nativeMarker = useMemo(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.replace(/\/+$/, "");
    return path === NATIVE_CALLBACK_PATH;
  }, []);

  return nativeMarker ? <NativeHandoff /> : <BrowserCallback />;
};
