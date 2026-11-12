import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BibleAppProvider } from "@/context/BibleAppContext";
import { AppShell } from "@/components/bible/AppShell";
import { AuthCallbackPage } from "@/components/auth/AuthCallbackPage";
import { NATIVE_CALLBACK_PATH, resumeLaunchSignIn } from "@/lib/googleAuth";

/**
 * The Google sign-in redirect lands on `/auth/callback` (or
 * `/auth/callback/native` for the app's return trip), which has to be handled
 * before the reader shell mounts: the shell would parse the callback URL as an
 * ordinary deep link and drop the reader into the reader view while the
 * session was still being exchanged.
 */
const isAuthCallbackPath = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/auth/callback" || path === NATIVE_CALLBACK_PATH;
};

/**
 * Android can kill the app while the reader is in the browser choosing a Google
 * account, in which case the return trip is a launch rather than a deep link.
 * Resolve it once, here, before any section has mounted.
 */
const useLaunchSignIn = () => {
  useEffect(() => {
    void resumeLaunchSignIn().then((signedIn) => {
      if (!signedIn) return;
      // The session is persisted, so a reload is the simplest way to land on
      // the Study workspace with the panel already showing the account.
      if (!window.location.search.includes("section=study")) {
        window.location.replace("/?section=study");
      }
    });
  }, []);
};

const App = () => {
  useLaunchSignIn();

  return isAuthCallbackPath() ? (
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      <AuthCallbackPage />
    </TooltipProvider>
  ) : (
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      <BibleAppProvider>
        <AppShell />
      </BibleAppProvider>
    </TooltipProvider>
  );
};

export default App;
