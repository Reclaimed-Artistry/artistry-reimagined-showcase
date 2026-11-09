import { createContext } from "react";
import type { BibleAppContextValue } from "./BibleAppContext";

export const BibleAppContext = createContext<BibleAppContextValue | null>(null);
