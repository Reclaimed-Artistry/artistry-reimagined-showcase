import { readFile, writeFile } from "node:fs/promises";

const workerPath = new URL("../dist/sw.js", import.meta.url);
const commit = process.env.VERCEL_GIT_COMMIT_SHA;
const buildId = (commit || `local-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "");
const worker = await readFile(workerPath, "utf8");

if (!worker.includes("__SELAH_CACHE_VERSION__")) {
  throw new Error("Service worker cache version placeholder was not found.");
}

await writeFile(
  workerPath,
  worker.replace("__SELAH_CACHE_VERSION__", buildId),
  "utf8"
);
