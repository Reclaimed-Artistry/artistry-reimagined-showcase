import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const bibleRoot = path.join(projectRoot, "public", "bibles");
const outputRoot = path.join(projectRoot, "dist", "bibles", "chapters");
const bundledVersions = ["en_bsb", "en_kjv"];

let chaptersWritten = 0;
for (const version of bundledVersions) {
  const source = path.join(bibleRoot, `${version}.json`);
  const sourceText = (await fs.readFile(source, "utf8")).replace(/^\uFEFF/, "");
  const rawBooks = JSON.parse(sourceText);
  if (!Array.isArray(rawBooks) || rawBooks.length !== 66) {
    throw new Error(`Expected 66 books in ${source}`);
  }

  for (let bookIndex = 0; bookIndex < rawBooks.length; bookIndex += 1) {
    const book = rawBooks[bookIndex];
    if (!Array.isArray(book.chapters)) continue;
    const bookNumber = bookIndex + 1;
    for (let chapterIndex = 0; chapterIndex < book.chapters.length; chapterIndex += 1) {
      const chapter = book.chapters[chapterIndex];
      if (!Array.isArray(chapter)) continue;
      const destination = path.join(outputRoot, version, String(bookNumber), `${chapterIndex + 1}.json`);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, JSON.stringify({
        abbrev: book.abbrev,
        name: book.name,
        chapters: [chapter],
      }));
      chaptersWritten += 1;
    }
  }
}

console.log(`[bibles] Generated ${chaptersWritten} small bundled chapter files for fast reader startup.`);
