/**
 * Screenshots the redesigned routes at mobile and desktop.
 *
 *   node scripts/shots.mjs            # public routes only
 *   SHOT_EMAIL=... SHOT_PASSWORD=...  # also signs in and captures the app
 *
 * Authenticated routes need real credentials: Supabase owns the passwords and
 * the seed does not know them. Without them the run captures what it can and
 * reports the rest as skipped rather than pretending they passed.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SHOT_BASE ?? 'http://127.0.0.1:3000';
const OUT = 'redesign-screenshots';

const PUBLIC_ROUTES = [
  ['login', '/login'],
  ['signup', '/signup'],
  ['not-found', '/this-route-does-not-exist'],
];

const PRIVATE_ROUTES = [
  ['design-system', '/design-system'],
  ['dashboard', '/dashboard'],
  ['seekers', '/seekers'],
  ['seekers-new', '/seekers/new'],
  ['donors', '/donors'],
  ['matches', '/matches'],
  ['staff-people', '/staff/people'],
];

const VIEWPORTS = [
  ['375', { width: 375, height: 900 }],
  ['1440', { width: 1440, height: 1000 }],
];

async function capture(context, name, path, label) {
  const page = await context.newPage();
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
    // A redirect to /login means the session did not take; recording it as a
    // screenshot of that route would be a quiet lie.
    if (path !== '/login' && page.url().includes('/login')) {
      console.log(`  SKIP ${name} @${label} - redirected to /login`);
      return false;
    }
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: true });
    console.log(`  ok   ${name} @${label} (${res?.status()})`);
    return true;
  } catch (err) {
    console.log(`  FAIL ${name} @${label} - ${err.message.split('\n')[0]}`);
    return false;
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const [label, viewport] of VIEWPORTS) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  console.log(`\n== ${label}px ==`);

  for (const [name, path] of PUBLIC_ROUTES) await capture(context, name, path, label);

  if (process.env.SHOT_EMAIL && process.env.SHOT_PASSWORD) {
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', process.env.SHOT_EMAIL);
    await page.fill('#password', process.env.SHOT_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
    await page.close();
    for (const [name, path] of PRIVATE_ROUTES) await capture(context, name, path, label);
  } else {
    console.log(`  -- ${PRIVATE_ROUTES.length} authenticated routes skipped (set SHOT_EMAIL/SHOT_PASSWORD)`);
  }

  await context.close();
}

await browser.close();
console.log(`\nWrote to ${OUT}/`);
