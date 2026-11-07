import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outDir = path.resolve("public/icons");
fs.mkdirSync(outDir, { recursive: true });

const force = process.argv.includes("--force");
const targets = [
  { size: 1024, file: "icon-1024.png" },
  { size: 512, file: "icon-512.png" },
  { size: 192, file: "icon-192.png" },
  { size: 180, file: "apple-touch-icon.png" },
];

if (!force && targets.every((t) => fs.existsSync(path.join(outDir, t.file)))) {
  process.exit(0);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crc]);
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy);
}

function renderIconPng(size, outPath) {
  const raw = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const distCenter = Math.hypot(nx - 0.5, ny - 0.42);
      const vignette = Math.max(0, 1 - distCenter * 1.15);
      let r = Math.round(22 + vignette * 18);
      let g = Math.round(19 + vignette * 14);
      let b = Math.round(17 + vignette * 11);

      // Subtle inner gold hairline border
      const boxDx = Math.max(Math.abs(nx - 0.5) - 0.36, 0);
      const boxDy = Math.max(Math.abs(ny - 0.5) - 0.36, 0);
      const roundedDist = Math.hypot(boxDx, boxDy) - 0.06;
      const borderEdge = Math.abs(roundedDist) * size;
      if (borderEdge < 2.2) {
        const alpha = Math.max(0, 1 - borderEdge / 2.2) * 0.28;
        r = Math.round(r * (1 - alpha) + 226 * alpha);
        g = Math.round(g * (1 - alpha) + 168 * alpha);
        b = Math.round(b * (1 - alpha) + 86 * alpha);
      }

      // Curved book interior glow following the exact page contour
      const distFromSpine = Math.abs(nx - 0.5);
      if (distFromSpine < 0.26) {
        const t = 1 - distFromSpine / 0.26; // 0 at outer edge (0.24/0.76), 1 at spine (0.50)
        const topCurveY = 0.31 + 0.05 * t - 0.032 * Math.sin(Math.PI * t);
        const botCurveY = topCurveY + 0.41;
        if (ny > topCurveY && ny < botCurveY) {
          r = Math.min(255, r + 13);
          g = Math.min(255, g + 10);
          b = Math.min(255, b + 7);
        }
      }

      const strokeW = size * 0.036;
      let minStrokeDist = 1e9;

      // Spine + left/right outer edges
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.5, size * 0.36, size * 0.5, size * 0.77));
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.24, size * 0.31, size * 0.24, size * 0.72));
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.76, size * 0.31, size * 0.76, size * 0.72));

      // Curved top & bottom book arcs + decorative scripture lines
      for (let s = 0; s < 16; s++) {
        const t0 = s / 16;
        const t1 = (s + 1) / 16;
        const lx0 = (0.24 + 0.26 * t0) * size;
        const ly0 = (0.31 + 0.05 * t0 - 0.032 * Math.sin(Math.PI * t0)) * size;
        const lx1 = (0.24 + 0.26 * t1) * size;
        const ly1 = (0.31 + 0.05 * t1 - 0.032 * Math.sin(Math.PI * t1)) * size;
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, lx0, ly0, lx1, ly1));
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, lx0, ly0 + 0.41 * size, lx1, ly1 + 0.41 * size));

        const rx0 = size - lx0;
        const rx1 = size - lx1;
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, rx0, ly0, rx1, ly1));
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, rx0, ly0 + 0.41 * size, rx1, ly1 + 0.41 * size));
      }

      // Radiant Cross above book
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.5, size * 0.155, size * 0.5, size * 0.285));
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.445, size * 0.205, size * 0.555, size * 0.205));

      if (minStrokeDist < strokeW * 0.5 + 1.2) {
        const cov = Math.max(0, Math.min(1, strokeW * 0.5 + 1.0 - minStrokeDist));
        const goldR = Math.round(240 - ny * 26);
        const goldG = Math.round(188 - ny * 34);
        const goldB = Math.round(108 - ny * 28);
        r = Math.round(r * (1 - cov) + goldR * cov);
        g = Math.round(g * (1 - cov) + goldG * cov);
        b = Math.round(b * (1 - cov) + goldB * cov);
      }

      const idx = rowStart + 1 + x * 4;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outPath, png);
}

for (const t of targets) {
  renderIconPng(t.size, path.join(outDir, t.file));
}
console.log("[icons] Ready:", targets.map((t) => t.file).join(", "));
