import fs from "node:fs";
import path from "node:path";

const biblesDir = path.resolve("public/bibles");
fs.mkdirSync(biblesDir, { recursive: true });

async function fetchJsonText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const raw = await res.text();
  return raw.replace(/^\uFEFF/, "");
}

function stripTags(str) {
  return String(str || "")
    .replace(/<S>\d+<\/S>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function ensureKjv() {
  const dest = path.join(biblesDir, "en_kjv.json");
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) return;
  console.log("[bibles] Fetching starter offline Bible: en_kjv.json...");
  const text = await fetchJsonText(
    "https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/en_kjv.json",
  );
  const parsed = JSON.parse(text);
  fs.writeFileSync(dest, JSON.stringify(parsed));
}

async function ensureBsb() {
  const dest = path.join(biblesDir, "en_bsb.json");
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) return;
  console.log("[bibles] Fetching starter offline Bible: en_bsb.json...");
  try {
    // Convert HelloAO BSB or Bolls BSB into compact 66-book canonical array
    const text = await fetchJsonText("https://bible.helloao.org/api/BSB/complete.simple.json");
    const data = JSON.parse(text);
    const booksOut = (data.books || []).slice(0, 66).map((book) => {
      const chapters = (book.chapters || []).map((ch) => {
        const verses = [];
        for (const item of ch.content || []) {
          if (item.type === "verse" && typeof item.number === "number") {
            const joined = (item.content || [])
              .map((part) => {
                if (typeof part === "string") return part;
                if (part && typeof part === "object" && typeof part.text === "string") return part.text;
                return "";
              })
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            verses[item.number - 1] = joined;
          }
        }
        return Array.from({ length: verses.length }, (_, i) => verses[i] || "");
      });
      return {
        abbrev: String(book.id || "").toLowerCase(),
        name: book.commonName || book.name || "",
        chapters,
      };
    });
    if (booksOut.length === 66) {
      fs.writeFileSync(dest, JSON.stringify(booksOut));
      return;
    }
  } catch (err) {
    console.warn("[bibles] HelloAO BSB fallback triggered:", err);
  }

  // Fallback to Bolls BSB flat verse array
  const bollsText = await fetchJsonText("https://bolls.life/static/translations/BSB.json");
  const rows = JSON.parse(bollsText);
  const byBook = Array.from({ length: 66 }, (_, idx) => ({
    abbrev: `b${idx + 1}`,
    name: `Book ${idx + 1}`,
    chaptersMap: new Map(),
  }));
  for (const r of rows) {
    const bIdx = Number(r.book) - 1;
    if (bIdx < 0 || bIdx >= 66) continue;
    const ch = Number(r.chapter);
    const vs = Number(r.verse);
    if (!byBook[bIdx].chaptersMap.has(ch)) byBook[bIdx].chaptersMap.set(ch, []);
    byBook[bIdx].chaptersMap.get(ch)[vs - 1] = stripTags(r.text);
  }
  const compact = byBook.map((b) => {
    const maxCh = Math.max(0, ...b.chaptersMap.keys());
    const chapters = Array.from({ length: maxCh }, (_, cIdx) => {
      const arr = b.chaptersMap.get(cIdx + 1) || [];
      return Array.from({ length: arr.length }, (__, vIdx) => arr[vIdx] || "");
    });
    return { abbrev: b.abbrev, name: b.name, chapters };
  });
  fs.writeFileSync(dest, JSON.stringify(compact));
}

await ensureKjv();
await ensureBsb();
console.log("[bibles] Pre-bundled offline Bibles verified.");
