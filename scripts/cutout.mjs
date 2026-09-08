/**
 * Turns an opaque illustration into one with a real alpha channel.
 *
 *   node scripts/cutout.mjs <source> <destination-basename>
 *
 * Why this exists: public/images/hero-community.png is a JPEG that was given a
 * .png name, so it has no alpha and ships a white rectangle behind the artwork.
 * The landing page was hiding that with mix-blend-multiply, which is tone maths
 * rather than masking - it only works while whatever sits behind it is pale.
 *
 * The method is a flood fill seeded from the border, NOT a global "make white
 * transparent" threshold. Two reasons:
 *
 *   - The illustration has white *inside* it - the whiteboard, paper, shirts.
 *     A global threshold would drill holes through all of it. A fill can only
 *     reach pixels connected to the edge.
 *   - This image's bottom edge is the tan floor of the scene (216,177,134), so
 *     only border pixels that are actually near-white are allowed to seed the
 *     fill. Seeding from every border pixel would eat the floor.
 *
 * Edges are then feathered by one pixel, because a hard binary alpha on a JPEG
 * leaves a white fringe from the compression's own anti-aliasing.
 *
 * Runs in Chromium through Playwright, which is already a devDependency, so
 * this needs no image library.
 */
import { chromium } from 'playwright';
import { writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg || !outArg) {
  console.error('usage: node scripts/cutout.mjs <source> <destination-basename>');
  process.exit(1);
}

/** Max per-channel distance from white still counted as background. */
const TOLERANCE = 32;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(
  async ({ src, tolerance }) => {
    const img = new Image();
    img.src = src;
    await img.decode();

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;

    const isBackground = i => 255 - d[i] <= tolerance && 255 - d[i + 1] <= tolerance && 255 - d[i + 2] <= tolerance;

    // Flood fill, seeded only from border pixels that are already near-white.
    const seen = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const push = p => {
      if (seen[p]) return;
      if (!isBackground(p * 4)) return;
      seen[p] = 1;
      queue[tail++] = p;
    };

    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }

    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }

    let cleared = 0;
    for (let p = 0; p < w * h; p++) {
      if (seen[p]) {
        d[p * 4 + 3] = 0;
        cleared++;
      }
    }

    /*
     * Feather. A pixel that survived but touches the hole is on the boundary,
     * where JPEG anti-aliasing blended it toward white. Give it partial alpha
     * scaled by how far from white it actually is, so the edge does not read
     * as a cut line with a pale halo.
     */
    const alpha = new Uint8ClampedArray(w * h);
    for (let p = 0; p < w * h; p++) alpha[p] = seen[p] ? 0 : 255;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (seen[p]) continue;
        const touchesHole =
          (x > 0 && seen[p - 1]) ||
          (x < w - 1 && seen[p + 1]) ||
          (y > 0 && seen[p - w]) ||
          (y < h - 1 && seen[p + w]);
        if (!touchesHole) continue;
        const i = p * 4;
        const lightest = Math.max(d[i], d[i + 1], d[i + 2]);
        // 255 -> fully transparent, (255 - tolerance) or darker -> fully opaque.
        const t = (255 - lightest) / tolerance;
        alpha[p] = Math.max(0, Math.min(1, t)) * 255;
      }
    }
    for (let p = 0; p < w * h; p++) d[p * 4 + 3] = alpha[p];

    ctx.putImageData(image, 0, 0);

    // Trim to the remaining content, so the asset carries no dead margin.
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const trimmed = document.createElement('canvas');
    trimmed.width = cw;
    trimmed.height = ch;
    trimmed.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);

    return {
      source: [w, h],
      trimmed: [cw, ch],
      clearedPercent: Math.round((cleared / (w * h)) * 100),
      png: trimmed.toDataURL('image/png'),
      webp: trimmed.toDataURL('image/webp', 0.92),
    };
  },
  { src: srcArg.replace(/^public/, ''), tolerance: TOLERANCE },
);

await browser.close();

const written = [];
for (const [ext, dataUrl] of [['png', result.png], ['webp', result.webp]]) {
  const path = resolve(`public/images/${outArg}.${ext}`);
  writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  written.push([`${outArg}.${ext}`, statSync(path).size]);
}

const before = statSync(resolve(srcArg)).size;
console.log(`source   ${srcArg}  ${result.source.join('x')}  ${(before / 1024).toFixed(0)} KB`);
console.log(`trimmed  ${result.trimmed.join('x')}  (${result.clearedPercent}% of the frame was background)`);
for (const [name, size] of written) console.log(`wrote    ${name}  ${(size / 1024).toFixed(0)} KB`);
