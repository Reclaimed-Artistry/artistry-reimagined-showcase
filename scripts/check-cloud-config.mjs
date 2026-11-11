#!/usr/bin/env node
/**
 * Refuses to produce a build that cannot sign in.
 *
 * `cloudWorkspace` reads its Supabase URL and publishable key from
 * `import.meta.env`, which Vite fills in at build time. When they are absent
 * the build still succeeds: `createClient` is simply never called, the Sync &
 * Groups panel renders "Cloud sync is not configured in this build", and the
 * Google button does nothing. Nothing throws, so the failure only surfaces when
 * someone tries to sign in.
 *
 * That happened: `npm run build && npx cap sync android` from a clean checkout
 * has no `.env`, so the APK shipped with no Supabase config at all and Android
 * Studio builds could not authenticate.
 *
 * The two values are public by design (the publishable key is protected by
 * row-level security, and the deployed site exposes the same strings to every
 * visitor), so they live in the committed `.env`. This script exists to make a
 * missing or malformed config a build error rather than a silent regression.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env reader; the build only needs simple KEY=value pairs. */
function readEnvFile(file) {
  const values = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return values;
}

const fromFile = readEnvFile(resolve(root, ".env"));
// Vercel and CI inject these directly, and those take precedence over the file.
const url = (process.env.VITE_SUPABASE_URL || fromFile.VITE_SUPABASE_URL || "").trim();
const key = (process.env.VITE_SUPABASE_ANON_KEY || fromFile.VITE_SUPABASE_ANON_KEY || "").trim();

const problems = [];

if (!url) {
  problems.push("VITE_SUPABASE_URL is missing.");
} else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  problems.push(`VITE_SUPABASE_URL does not look like a Supabase project URL: "${url}"`);
} else if (/YOUR_PROJECT_REF/.test(url)) {
  problems.push("VITE_SUPABASE_URL is still the placeholder from .env.example.");
}

if (!key) {
  problems.push("VITE_SUPABASE_ANON_KEY is missing.");
} else if (/YOUR_SUPABASE_PUBLISHABLE_KEY/.test(key)) {
  problems.push("VITE_SUPABASE_ANON_KEY is still the placeholder from .env.example.");
} else if (key.length < 20) {
  problems.push("VITE_SUPABASE_ANON_KEY is too short to be a publishable key.");
}

if (problems.length > 0) {
  console.error("\n  Cloud sync would be disabled in this build:\n");
  for (const problem of problems) console.error(`    - ${problem}`);
  console.error(
    "\n  Google sign-in requires both values. They are public (row-level security is\n" +
      "  what protects the data), so they belong in the committed `.env`. Copy the\n" +
      "  template and fill it in:\n\n" +
      "      cp .env.example .env\n\n" +
      "  Values are in the Vercel project settings, or in the Supabase dashboard\n" +
      "  under Project Settings -> API.\n",
  );
  process.exit(1);
}

console.log(`Cloud sync configured for ${url}`);
