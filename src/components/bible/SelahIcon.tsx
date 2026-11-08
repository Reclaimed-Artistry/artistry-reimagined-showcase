import React from "react";

export type SelahIconName =
  | "home"
  | "read"
  | "vault"
  | "plans"
  | "reflect"
  | "study"
  | "kids"
  | "about"
  | "compare"
  | "offline"
  | "rhythm"
  | "audio"
  | "companion";

/** A small, original line-art icon set for Selah's main destinations and features. */
export const SelahIcon: React.FC<{ name: SelahIconName; className?: string }> = ({ name, className }) => {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.55,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="m5.5 14.1 10.5-7.6 10.5 7.6v11.1H5.5V14.1Z" /><path d="M11.2 25.2v-8.5h9.6v8.5M8.7 12l.1-3.2h3.5" /><path d="M16 10.1v2.4m-1.2-1.2h2.4" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "read":
      return <svg {...common}><path d="M16 10.2c-2.2-2.2-5.8-3.1-10-2.3v16.3c4.2-.8 7.8.1 10 2.3 2.2-2.2 5.8-3.1 10-2.3V7.9c-4.2-.8-7.8.1-10 2.3Z" /><path d="M16 10.2v16.3M8.5 11.5c2.3-.3 4.2.1 5.7 1.2m-5.7 2.8c2.1-.3 4 .1 5.7 1.1m7-5.1c-1.5-.2-2.9 0-4.1.5m4.1 2.7c-1.5-.2-2.9 0-4.1.5" /><path d="M23.8 8.3v5.4l-1.6-1-1.6 1V8.7" fill="currentColor" opacity=".12" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "vault":
      return <svg {...common}><path d="M7 9.1 18.4 6l7.3 3v15.1L14.3 27 7 23.9V9.1Z" /><path d="m7.2 9.3 11.2 3.2 7.2-3.3M18.4 12.5v14.1M10.2 15.4l4.3 1.2m-4.3 2 4.3 1.2" /><path d="M23.1 8.1v5.3l-1.5-.9-1.5.9V7.9" fill="currentColor" opacity=".12" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "plans":
      return <svg {...common}><rect x="6.2" y="8.2" width="19.6" height="17" rx="2.2" /><path d="M11 6.3v4M21 6.3v4M6.5 13h19M11 17h2.5m3 0H19m-8 4h2.5m3 0H19" /><path d="m21.3 18.1 1 1 2-2.2" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "reflect":
      return <svg {...common}><path d="M16 5.8v3.1m0 14.2v3.1M5.8 16h3.1m14.2 0h3.1M8.8 8.8 11 11m10 10 2.2 2.2m0-14.4L21 11M11 21l-2.2 2.2" /><circle cx="16" cy="16" r="6.1" /><path d="M16 12.4v4.1l2.7 1.6" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "study":
      return <svg {...common}><path d="M5.6 7.6h12.8c2.2 0 3.8 1.7 3.8 3.8v11.8H9.4c-2.2 0-3.8-1.7-3.8-3.8V7.6Z" /><path d="M9.5 11.8h8.1m-8.1 3.2h6.2m-6.2 3.2h4.1" /><circle cx="22.3" cy="21.7" r="4" fill="hsl(var(--background))" /><path d="m25.2 24.6 2.5 2.5" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "kids":
      return <svg {...common}><path d="M16 13.1c-2-2-5.4-2.8-9.5-2.1v13.2c4.1-.7 7.5.1 9.5 2 2-1.9 5.4-2.7 9.5-2V11c-4.1-.7-7.5.1-9.5 2.1Z" /><path d="M16 13.1v13.1m-6.5-10c1.8-.2 3.2.1 4.5 1m8.5-1.1c-1.8-.2-3.2.1-4.5 1" /><path d="m16 4.3.9 2.1 2.2.2-1.7 1.4.5 2.2-1.9-1.1-1.9 1.1.5-2.2-1.7-1.4 2.2-.2.9-2.1Z" fill="currentColor" opacity=".14" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "about":
      return <svg {...common}><circle cx="16" cy="16" r="10.2" /><path d="M12.1 21.8c2.2-3 4.8-6.2 8.8-9.9M14.1 19.4c-2.3.1-4.1-.7-5.4-2.3m8.1-3.4c-.1-2.2.8-4 2.6-5.2m-1.8 9.2c2.2-.2 3.9.4 5.1 1.9m-8.9-2.4c-.3-1.8.1-3.2 1.1-4.3" /><circle cx="9" cy="17.1" r="1.05" fill="var(--selah-icon-accent, #A16E3E)" stroke="none" /><circle cx="19.4" cy="8.6" r="1.05" fill="var(--selah-icon-accent, #A16E3E)" stroke="none" /></svg>;
    case "compare":
      return <svg {...common}><path d="M5.5 8.4c3.4-.6 6.3.1 8.3 1.8v15c-2-1.7-4.9-2.4-8.3-1.8v-15Zm21 0c-3.4-.6-6.3.1-8.3 1.8v15c2-1.7 4.9-2.4 8.3-1.8v-15Z" /><path d="M9 12.1c1.2 0 2.2.2 3.2.7m-3.2 2.8c1.2 0 2.2.2 3.2.7m7.6-3.5c1-.5 2-.7 3.2-.7m-3.2 4.2c1-.5 2-.7 3.2-.7" /><path d="M16 7v20" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "offline":
      return <svg {...common}><path d="M7 7.9h13.1c2.2 0 3.9 1.7 3.9 3.9v13.1H10.9c-2.2 0-3.9-1.7-3.9-3.9V7.9Z" /><path d="M10.7 12.2h7.8m-7.8 3h5.2m-5.2 3h3" /><path d="M23.7 6.1v7m-2.5-2.2 2.5 2.5 2.5-2.5" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "rhythm":
      return <svg {...common}><path d="M8 24.8h16M10.5 22.8h11l-1.2-9.6h-8.6l-1.2 9.6Z" /><path d="M16 13.2V8.4m0 0c0-1.6 1.1-2.7 2.6-2.7m-2.6 2.7c0-1.6-1.1-2.7-2.6-2.7" /><path d="M16 10.5a4.8 4.8 0 1 0 4.8 4.8" stroke="var(--selah-icon-accent, #A16E3E)" /><path d="M16 16V13" /></svg>;
    case "audio":
      return <svg {...common}><path d="M7.2 11.2H11l5.1-4.1v17.8L11 20.8H7.2v-9.6Z" /><path d="M20.2 11.4a6.5 6.5 0 0 1 0 9.2m2.7-12a10.3 10.3 0 0 1 0 14.8" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
    case "companion":
      return <svg {...common}><path d="M6.3 8.1h13.4a4 4 0 0 1 4 4v6.1a4 4 0 0 1-4 4H13l-5.1 3v-3.2a4 4 0 0 1-1.6-3.3V8.1Z" /><path d="M10 13h10m-10 3.5h6.2" /><path d="M22.2 9.1a3.6 3.6 0 0 1 3.5 3.6" stroke="var(--selah-icon-accent, #A16E3E)" /></svg>;
  }
};
