import React from "react";
import { AdSlot } from "./AdSlot";

/**
 * The Home dashboard's ad unit.
 *
 * Kept as its own name because Home imports it directly, but it is now just a
 * placement of the shared slot so every page requests ads the same way.
 */
export const AdSenseSlot: React.FC = () => <AdSlot placement="home" />;
