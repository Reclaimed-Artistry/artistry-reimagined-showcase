import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { readAuthCallback } from "@/lib/googleAuth";
import { supabase } from "@/lib/cloudWorkspace";

/**
 * Landing page for the Google sign-in redirect.
 *
 * The Supabase client finishes the PKCE exchange on its own for http(s) URLs
 * (`detectSessionInUrl`), so this page only has to wait for the session to
 * appear and then hand the reader back to the Study screen. It exists so the
 * return trip does not drop into the reader with no explanation of what
 * happened, and so a failed sign-in has somewhere to show its reason.
 */
export const AuthCallbackPage: React.FC = () => {
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
