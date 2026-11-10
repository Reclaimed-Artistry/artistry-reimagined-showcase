import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BibleAppProvider } from "@/context/BibleAppContext";
import { AppShell } from "@/components/bible/AppShell";
import { AuthCallbackPage } from "@/components/auth/AuthCallbackPage";

/**
 * The Google sign-in redirect lands on `/auth/callback`, which has to be
 * handled before the reader shell mounts: the shell would parse the callback
 * URL as an ordinary deep link and drop the reader into the reader view while
 * the session was still being exchanged.
 */
const isAuthCallbackPath = () => {
  if (typeof window === "undefined") return false;
  return window.location.pathname.replace(/\/+$/, "") === "/auth/callback";
};

const App = () =>
  isAuthCallbackPath() ? (
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

export default App;
