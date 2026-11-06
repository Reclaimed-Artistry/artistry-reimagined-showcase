import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

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

function makeLauncherPng(size, { round = false, transparentBg = false } = {}) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const strokeW = Math.max(1.5, size * 0.036);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const distCenter = Math.hypot(nx - 0.5, ny - 0.5);

      if (round && distCenter > 0.5) {
        const idx = rowStart + 1 + x * 4;
        raw[idx] = 0;
        raw[idx + 1] = 0;
        raw[idx + 2] = 0;
        raw[idx + 3] = 0;
        continue;
      }

      const vignette = Math.max(0, 1 - Math.hypot(nx - 0.5, ny - 0.42) * 1.15);
      let r = Math.round(22 + vignette * 18);
      let g = Math.round(19 + vignette * 14);
      let b = Math.round(17 + vignette * 11);
      let a = transparentBg ? 0 : 255;

      let minStrokeDist = 1e9;
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.5, size * 0.36, size * 0.5, size * 0.77));
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.24, size * 0.31, size * 0.24, size * 0.72));
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.76, size * 0.31, size * 0.76, size * 0.72));

      for (let s = 0; s < 14; s++) {
        const t0 = s / 14;
        const t1 = (s + 1) / 14;
        const lx0 = (0.24 + 0.26 * t0) * size;
        const ly0 = (0.31 + 0.05 * t0 - 0.032 * Math.sin(Math.PI * t0)) * size;
        const lx1 = (0.24 + 0.26 * t1) * size;
        const ly1 = (0.31 + 0.05 * t1 - 0.032 * Math.sin(Math.PI * t1)) * size;
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, lx0, ly0, lx1, ly1));
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, lx0, ly0 + 0.41 * size, lx1, ly1 + 0.41 * size));
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size - lx0, ly0, size - lx1, ly1));
        minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size - lx0, ly0 + 0.41 * size, size - lx1, ly1 + 0.41 * size));
      }

      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.5, size * 0.155, size * 0.5, size * 0.285));
      minStrokeDist = Math.min(minStrokeDist, sdSegment(x, y, size * 0.445, size * 0.205, size * 0.555, size * 0.205));

      if (minStrokeDist < strokeW * 0.5 + 1.1) {
        const cov = Math.max(0, Math.min(1, strokeW * 0.5 + 0.9 - minStrokeDist));
        const goldR = Math.round(240 - ny * 26);
        const goldG = Math.round(188 - ny * 34);
        const goldB = Math.round(108 - ny * 28);
        if (transparentBg) {
          r = goldR;
          g = goldG;
          b = goldB;
          a = Math.round(cov * 255);
        } else {
          r = Math.round(r * (1 - cov) + goldR * cov);
          g = Math.round(g * (1 - cov) + goldG * cov);
          b = Math.round(b * (1 - cov) + goldB * cov);
        }
      }

      const idx = rowStart + 1 + x * 4;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

// 1. Copy 1024x1024 icon to iOS AppIcon.appiconset
const iosIconDest = path.resolve("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const src1024 = path.resolve("public/icons/icon-1024.png");
if (fs.existsSync(path.dirname(iosIconDest)) && fs.existsSync(src1024)) {
  fs.copyFileSync(src1024, iosIconDest);
  console.log("[mobile-icons] Updated iOS 1024x1024 App Store icon.");
}

// 2. Generate Android mipmap launcher icons across all 5 density buckets
const androidBuckets = [
  { folder: "mipmap-mdpi", launcher: 48, fg: 108 },
  { folder: "mipmap-hdpi", launcher: 72, fg: 162 },
  { folder: "mipmap-xhdpi", launcher: 96, fg: 216 },
  { folder: "mipmap-xxhdpi", launcher: 144, fg: 324 },
  { folder: "mipmap-xxxhdpi", launcher: 192, fg: 432 },
];

for (const b of androidBuckets) {
  const dir = path.resolve("android/app/src/main/res", b.folder);
  if (!fs.existsSync(dir)) continue;
  fs.writeFileSync(path.join(dir, "ic_launcher.png"), makeLauncherPng(b.launcher));
  fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), makeLauncherPng(b.launcher, { round: true }));
  fs.writeFileSync(
    path.join(dir, "ic_launcher_foreground.png"),
    makeLauncherPng(b.fg, { transparentBg: true }),
  );
}
console.log("[mobile-icons] Updated Android launcher icons across mdpi..xxxhdpi.");
