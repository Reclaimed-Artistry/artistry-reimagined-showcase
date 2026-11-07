import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BibleAppProvider } from "@/context/BibleAppContext";
import { AppShell } from "@/components/bible/AppShell";

const App = () => (
  <TooltipProvider>
    <Sonner position="top-center" richColors />
    <BibleAppProvider>
      <AppShell />
    </BibleAppProvider>
  </TooltipProvider>
);

export default App;
