/**
 * URL discovery for a funder's own site.
 *
 * The crawler previously guessed paths from a fixed list (/grants, /apply,
 * /guidelines...). That works when a site follows convention and finds nothing
 * when it does not - and foundation sites are idiosyncratic. Asking the site
 * what pages it has is strictly better: Delaplaine's sitemap names
 * /apply-for-funding/, which no reasonable guess list would contain.
 *
 * Order of preference:
 *   1. Sitemaps declared in robots.txt (authoritative, and where WordPress and
 *      Squarespace both point).
 *   2. /sitemap.xml and the handful of common variants.
 *   3. Guessed paths, still kept as a last resort for sites with no sitemap.
 */

const USER_AGENT = 'GrantAlignBot/0.1 (+nonprofit grant matching research)';
const TIMEOUT_MS = 10_000;
const MAX_SITEMAPS = 5;

/** Sitemap locations to try when robots.txt names none. */
const FALLBACK_SITEMAPS = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml', '/sitemap-index.xml'];

/** Paths worth trying on a site that publishes no sitemap at all. */
export const GUESSED_PATHS = [
  '',
  '/grants',
  '/grantmaking',
  '/apply',
  '/apply-for-funding',
  '/how-to-apply',
  '/guidelines',
  '/grant-guidelines',
  '/funding',
  '/what-we-fund',
  '/eligibility',
  '/faq',
];

/** URLs whose path suggests they describe grantmaking. */
const RELEVANT = /grant|appl|fund|guideline|eligib|deadline|rfp|criteria|award|giving/i;

async function getText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function locations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(match => match[1]);
}

/** True for a sitemap index, whose entries are more sitemaps rather than pages. */
function isIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

async function sitemapsFromRobots(base: string): Promise<string[]> {
  const robots = await getText(`${base}/robots.txt`);
  if (!robots) return [];
  return [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(match => match[1]).slice(0, MAX_SITEMAPS);
}

/**
 * Returns page URLs for a site, most relevant first. Empty when the site
 * publishes no sitemap, in which case the caller falls back to GUESSED_PATHS.
 */
export async function discoverUrls(base: string, limit = 40): Promise<string[]> {
  const roots = await sitemapsFromRobots(base);
  for (const path of FALLBACK_SITEMAPS) {
    if (roots.length >= MAX_SITEMAPS) break;
    roots.push(`${base}${path}`);
  }

  const pages: string[] = [];
  const seen = new Set<string>();
  let budget = MAX_SITEMAPS;

  const queue = [...roots];
  while (queue.length > 0 && budget > 0 && pages.length < limit) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    const xml = await getText(url);
    if (!xml || !xml.includes('<loc')) continue;
    budget -= 1;

    const found = locations(xml);
    if (isIndex(xml)) {
      // A sitemap index points at more sitemaps. Follow the ones whose own
      // names suggest pages rather than images or authors.
      for (const child of found) {
        if (/image|video|author|user|tag/i.test(child)) continue;
        queue.push(child);
      }
      continue;
    }

    for (const page of found) {
      if (page.startsWith(base) && !pages.includes(page)) pages.push(page);
    }
  }

  // Grant-related pages first; the homepage is worth keeping either way.
  return pages
    .sort((a, b) => Number(RELEVANT.test(b)) - Number(RELEVANT.test(a)))
    .slice(0, limit);
}
