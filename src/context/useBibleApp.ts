import { useContext } from "react";
import { BibleAppContext } from "./BibleAppContextInstance";
import type { BibleAppContextValue } from "./BibleAppContext";

export function useBibleApp(): BibleAppContextValue {
  const context = useContext(BibleAppContext);
  if (!context) {
    throw new Error("useBibleApp must be used inside BibleAppProvider");
  }
  return context;
}
