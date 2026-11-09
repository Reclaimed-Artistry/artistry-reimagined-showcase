import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BibleAppProvider } from "@/context/BibleAppContext";
import { AppShell } from "@/components/bible/AppShell";
import { PrivacyPolicyPage } from "@/components/PrivacyPolicyPage";

const App = () => {
  const isPrivacyPage = typeof window !== "undefined" && window.location.pathname.replace(/\/$/, "") === "/privacy";

  return (
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      {isPrivacyPage ? (
        <PrivacyPolicyPage />
      ) : (
        <BibleAppProvider>
          <AppShell />
        </BibleAppProvider>
      )}
    </TooltipProvider>
  );
};

export default App;
