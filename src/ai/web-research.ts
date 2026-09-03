/**
 * @fileOverview The "go look it up on the live web" step behind the donor
 * scraper (requirements §2.3, §4).
 *
 * Two independent live sources feed one dossier:
 *
 *   1. `fetchPages()` — plain HTTP GETs of the donor's own public pages
 *      (guidelines, grants, apply, FAQ), stripped to text with cheerio. This is
 *      where deadlines and exclusion lists actually live, and it is the only
 *      source we can quote verbatim.
 *   2. `groundedSearch()` — Gemini with Google Search as a tool, which reaches
 *      the aggregators in §4 (Candid/GuideStar, Foundant portals, Foundation
 *      Directory listings) without us holding accounts on them.
 *
 * Gemini's Search grounding and JSON structured output are mutually exclusive —
 * the plugin turns JSON mode off as soon as a tool is attached — so research is
 * always two passes: gather free text here, extract structured fields in a
 * separate normal prompt (see flows/researchDonor.ts).
 *
 * Nothing here throws. A donor refresh that found nothing must still record a
 * run, because "we looked and the site said nothing" and "the fetch failed" are
 * different answers and the UI has to be able to tell them apart.
 */

import * as cheerio from 'cheerio';
import { ai, DEFAULT_MODEL, supportsWebSearch } from '@/ai/providers';
import { withRetry } from '@/ai/retry';

export interface ResearchSource {
  title: string;
  url: string;
}

export interface GroundedResearch {
  /** Free-text findings, fed to the extraction prompt — not shown raw to users. */
  dossier: string;
  sources: ResearchSource[];
  /** False when Search never ran and this is unverified model recall. */
  grounded: boolean;
  /** Why grounding was unavailable, when it was. Surfaced in the run record. */
  groundingError?: string;
}

const USER_AGENT =
  'GrantAlignBot/0.1 (+https://github.com/; nonprofit grant matching research; contact: admin@grantalign.local)';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_PAGE_CHARS = 12_000;

/** Paths worth trying on a foundation site beyond the homepage. */
const CANDIDATE_PATHS = [
  '',
  '/grants',
  '/grantmaking',
  '/apply',
  '/how-to-apply',
  '/guidelines',
  '/grant-guidelines',
  '/funding',
  '/what-we-fund',
  '/eligibility',
  '/faq',
];

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
}

/** Strips a page to readable text. Scripts, nav and styling are pure noise here. */
function extractText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe, nav, header, footer, form').remove();
  const title = $('title').first().text().trim();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_PAGE_CHARS);
  return { title: title || '', text };
}

async function fetchOne(url: string): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html')) return null;
    const { title, text } = extractText(await res.text());
    // A page that reduced to a handful of words is a JS shell or an error page;
    // passing it to the model just invites it to invent detail around nothing.
    if (text.length < 200) return null;
    return { url: res.url || url, title, text };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBase(website: string): string | null {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Fetches the donor's own public pages. Tries the homepage first and follows
 * whichever grant-related links it actually advertises, falling back to a small
 * list of conventional paths — foundation sites are idiosyncratic enough that
 * guessing alone misses most of them.
 */
export async function fetchPages(website: string, limit = 5): Promise<FetchedPage[]> {
  const base = normalizeBase(website);
  if (!base) return [];

  const home = await fetchOne(base);
  const pages: FetchedPage[] = home ? [home] : [];
  const seen = new Set(pages.map(p => p.url));

  const targets: string[] = [];
  if (home) {
    // Prefer links the site itself points at.
    const $ = cheerio.load(await refetchHtml(home.url));
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      const label = `${$(el).text()} ${href}`.toLowerCase();
      if (!/grant|apply|fund|guideline|eligib|deadline|rfp/.test(label)) return;
      try {
        const abs = new URL(href, home.url).toString().split('#')[0];
        if (abs.startsWith(base) && !targets.includes(abs)) targets.push(abs);
      } catch {
        /* skip unparseable hrefs */
      }
    });
  }
  for (const path of CANDIDATE_PATHS) {
    const url = `${base}${path}`;
    if (!targets.includes(url)) targets.push(url);
  }

  for (const url of targets) {
    if (pages.length >= limit) break;
    if (seen.has(url)) continue;
    seen.add(url);
    const page = await fetchOne(url);
    if (page && !seen.has(page.url)) {
      seen.add(page.url);
      pages.push(page);
    }
  }

  return pages;
}

/** Second read of an already-fetched page, for link discovery only. */
async function refetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

function groundingMetadata(response: any): any | undefined {
  return response?.custom?.candidates?.[0]?.groundingMetadata;
}

/**
 * Whether Search actually ran. Gemini only attaches `groundingMetadata` when it
 * invoked the tool, so this separates "searched and found nothing" (a real
 * answer) from "answered from recall" (a guess that must not be shown as
 * researched). Source count can't tell them apart — a genuine no-match search
 * returns zero chunks too.
 */
function searchWasUsed(response: any): boolean {
  const meta = groundingMetadata(response);
  if (!meta) return false;
  return (
    (meta.groundingChunks?.length ?? 0) > 0 ||
    (meta.webSearchQueries?.length ?? 0) > 0 ||
    (meta.groundingSupports?.length ?? 0) > 0 ||
    !!meta.searchEntryPoint
  );
}

function sourcesFromResponse(response: any): ResearchSource[] {
  const chunks: any[] = groundingMetadata(response)?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: ResearchSource[] = [];

  for (const chunk of chunks) {
    const url: string | undefined = chunk?.web?.uri ?? chunk?.retrievedContext?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: chunk?.web?.title ?? url, url });
  }

  // The model often writes plain URLs into the body too; keep those as a
  // fallback so a reviewer always has something to click through and verify.
  if (sources.length === 0 && typeof response?.text === 'string') {
    for (const match of response.text.matchAll(/https?:\/\/[^\s)>\]",]+/g)) {
      const url = match[0].replace(/[.,;]$/, '');
      if (seen.has(url)) continue;
      seen.add(url);
      sources.push({ title: url, url });
    }
  }

  return sources.slice(0, 8);
}

/**
 * Gemini 2.5 ends a grounded turn with `finishReason: STOP` and no content
 * parts often enough that a single attempt reports real, findable foundations
 * as unresearchable. The empty turns return in ~2s, so retrying is cheap.
 */
const MAX_SEARCH_ATTEMPTS = 3;

/** Runs one web-grounded search pass and returns what it found as free text. */
export async function groundedSearch(prompt: string): Promise<GroundedResearch> {
  let groundingError: string | undefined;

  // Only Gemini can run Search as a tool. On any other provider, attempting it
  // would either error or - worse - silently return plain model recall that the
  // rest of the pipeline would treat as researched fact. Refusing up front
  // keeps the "grounded" flag honest, and donor research still works from the
  // pages fetched directly off the funder's own site.
  if (!supportsWebSearch) {
    return {
      dossier: '',
      sources: [],
      grounded: false,
      groundingError:
        'The configured AI provider cannot search the web, so this run used only pages fetched directly from the funder\'s site.',
    };
  }

  for (let attempt = 1; attempt <= MAX_SEARCH_ATTEMPTS; attempt++) {
    try {
      const response = await withRetry('groundedSearch', () =>
        ai.generate({
        model: DEFAULT_MODEL,
        prompt,
        config: {
          // Search-as-a-tool, which is what Gemini 2.x expects. Empty object
          // rather than `true` so the same config shape survives being pointed
          // at a `vertexai/*` model, whose schema expects an object.
          googleSearch: {},
          temperature: 0.2,
        },
      }),
      );

      if (!searchWasUsed(response)) {
        // The call succeeded but the tool never ran, so the answer is recall.
        // Not retried: when Search is unavailable to the key it is unavailable
        // on every attempt, and retrying would triple every refresh.
        groundingError =
          'The model answered without calling Google Search, so nothing in this result is verified.';
        console.warn('[web-research]', groundingError);
        return { dossier: response.text, sources: [], grounded: false, groundingError };
      }

      const dossier = response.text?.trim() ?? '';
      if (!dossier) {
        console.warn(
          `[web-research] grounded turn returned no text (attempt ${attempt}/${MAX_SEARCH_ATTEMPTS}); retrying.`,
        );
        groundingError = 'The research model searched but returned an empty answer.';
        continue;
      }

      return { dossier, sources: sourcesFromResponse(response), grounded: true };
    } catch (err: any) {
      groundingError = err?.message || 'Google Search grounding was unavailable.';
      console.warn('[web-research] grounded search unavailable:', groundingError);
      break;
    }
  }

  return { dossier: '', sources: [], grounded: false, groundingError };
}
