/**
 * Whole-page audit of a rendered route.
 *
 *   node scripts/audit.mjs [path]
 *
 * Checks the things that only exist once a page is actually painted: dead
 * links, images that 404 or have no alt text, heading order, text contrast
 * against whatever is really behind it, horizontal overflow at phone width,
 * and controls too small to hit with a thumb.
 *
 * Contrast is measured against the ancestor that actually paints a background,
 * so a token that passes in isolation can still be reported here when it lands
 * on a surface nobody checked it against.
 */
import { chromium } from 'playwright';

const BASE = process.env.AUDIT_BASE ?? 'http://127.0.0.1:3000';
const PATHNAME = process.argv[2] ?? '/';

const browser = await chromium.launch();

/* ------------------------------------------------------------- desktop pass */

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failedRequests = [];
page.on('response', r => {
  if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
});
await page.goto(`${BASE}${PATHNAME}`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1500);

const report = await page.evaluate(() => {
  const out = { links: [], images: [], headings: [], contrast: [], smallTargets: [], duplicateIds: [] };

  // ---- links ----
  for (const a of document.querySelectorAll('a')) {
    const href = a.getAttribute('href');
    const text = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!href || href === '#' || href === '' || href.startsWith('javascript:')) {
      out.links.push({ text, href: href ?? '(none)', problem: 'placeholder href - goes nowhere' });
    } else if (href.startsWith('#') && !document.querySelector(href)) {
      out.links.push({ text, href, problem: 'anchor target does not exist' });
    }
    if (!text && !a.getAttribute('aria-label')) {
      out.links.push({ text: '(empty)', href: href ?? '', problem: 'no accessible name' });
    }
  }

  // ---- images ----
  for (const img of document.querySelectorAll('img')) {
    const src = img.getAttribute('src') || '';
    if (!img.complete || img.naturalWidth === 0) out.images.push({ src, problem: 'failed to load' });
    const alt = img.getAttribute('alt');
    if (alt === null) out.images.push({ src, problem: 'missing alt attribute' });
    else if (alt.trim() && alt.trim().length < 4) out.images.push({ src, alt, problem: 'alt is very terse' });
    // Served far larger than displayed?
    const r = img.getBoundingClientRect();
    if (img.naturalWidth > r.width * 2.4 && r.width > 0) {
      out.images.push({ src, problem: `served ${img.naturalWidth}px wide, displayed ${Math.round(r.width)}px` });
    }
  }

  // ---- heading order ----
  let previous = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const level = Number(h.tagName[1]);
    const text = (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46);
    if (previous && level > previous + 1) {
      out.headings.push({ text, problem: `jumps h${previous} -> h${level}` });
    }
    previous = level;
  }
  const h1s = document.querySelectorAll('h1');
  if (h1s.length !== 1) out.headings.push({ text: '', problem: `${h1s.length} <h1> on the page` });

  // ---- duplicate ids (anchors silently resolve to the first) ----
  const seen = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
  }
  for (const [id, n] of seen) if (n > 1) out.duplicateIds.push({ id, count: n });

  // ---- contrast ----
  const parse = c => {
    const m = c.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  };
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)]; return (hi + 0.05) / (lo + 0.05); };

  const backdrop = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      const alpha = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      if (bg && (!alpha || alpha.length < 4 || Number(alpha[3]) > 0.5)) return bg;
      n = n.parentElement;
    }
    return [255, 255, 255];
  };

  for (const el of document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,blockquote,div')) {
    if (!el.childNodes.length) continue;
    const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!direct) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const r = ratio(fg, backdrop(el));
    if (r < need) {
      out.contrast.push({
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44),
        ratio: r.toFixed(2), need, size: Math.round(size),
      });
    }
  }

  // ---- hit targets ----
  for (const el of document.querySelectorAll('a,button,input,select,textarea')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 24 || r.width < 24) {
      out.smallTargets.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 30),
        size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      });
    }
  }

  return out;
});

/* --------------------------------------------------------------- phone pass */

const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
await phone.goto(`${BASE}${PATHNAME}`, { waitUntil: 'networkidle', timeout: 90000 });
await phone.waitForTimeout(1200);
const overflow = await phone.evaluate(() => {
  const doc = document.documentElement;
  const offenders = [];
  if (doc.scrollWidth > doc.clientWidth + 1) {
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 8) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
          overhang: Math.round(r.right - doc.clientWidth),
        });
      }
    }
  }
  return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: offenders.slice(0, 6) };
});

await browser.close();

/* ------------------------------------------------------------------ output */

const section = (title, rows, fmt) => {
  console.log(`\n## ${title} (${rows.length})`);
  if (!rows.length) return console.log('   clean');
  const seen = new Set();
  for (const row of rows) {
    const line = fmt(row);
    if (seen.has(line)) continue;
    seen.add(line);
    console.log('   ' + line);
  }
};

console.log(`AUDIT ${BASE}${PATHNAME}`);
section('Failed requests', failedRequests, r => r);
section('Links', report.links, l => `"${l.text}" [${l.href}] - ${l.problem}`);
section('Images', report.images, i => `${i.src} - ${i.problem}`);
section('Headings', report.headings, h => `${h.problem}${h.text ? ` - "${h.text}"` : ''}`);
section('Duplicate ids', report.duplicateIds, d => `#${d.id} appears ${d.count} times`);
section('Contrast below AA', report.contrast, c => `${c.ratio}:1 (needs ${c.need}) ${c.size}px - "${c.text}"`);
section('Hit targets under 24px', report.smallTargets, t => `<${t.tag}> ${t.size} - "${t.text}"`);

console.log(`\n## Horizontal overflow at 375px`);
if (overflow.scrollWidth > overflow.clientWidth + 1) {
  console.log(`   PAGE SCROLLS: ${overflow.scrollWidth}px content in ${overflow.clientWidth}px viewport`);
  for (const o of overflow.offenders) console.log(`   +${o.overhang}px <${o.tag}> ${o.cls}`);
} else {
  console.log('   clean');
}
