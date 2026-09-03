/**
 * IRS filing data via ProPublica's Nonprofit Explorer API.
 *
 * This is the source that makes donor research work without a search engine at
 * all. It is free, needs no key, and covers every US tax-exempt organization -
 * including the four seed donors with no website, which direct crawling and a
 * rate-limited web search both leave completely blank.
 *
 * For a grantmaking foundation it answers questions the funder's own site often
 * does not: what it is legally (NTEE code, 990-PF filer), how big it is, and
 * how much it actually paid out in grants last year. That last number is the
 * only hard evidence of giving capacity anywhere in this pipeline - a site that
 * says "we support local causes" says nothing about whether it writes $2,000
 * cheques or $200,000 ones.
 *
 * Requirements section 4 lists Candid/GuideStar for exactly this data. This
 * reaches the same 990 filings from the public source, without a subscription.
 */

const API = 'https://projects.propublica.org/nonprofits/api/v2';
const USER_AGENT = 'GrantAlignBot/0.1 (+nonprofit grant matching research)';
const TIMEOUT_MS = 15_000;

/**
 * Words that carry no identifying information in a non-profit's legal name.
 * "Ausherman Family Foundation Inc" and "Ausherman Family Foundation" must
 * match, so everything but "ausherman" has to be discountable.
 */
const NOISE_WORDS = new Set([
  'the', 'of', 'and', 'a', 'an', 'for', 'in', 'at',
  'inc', 'incorporated', 'llc', 'ltd', 'co', 'corp', 'corporation',
  'foundation', 'foundations', 'fund', 'funds', 'trust', 'charitable',
  'charities', 'charity', 'family', 'memorial', 'endowment', 'association',
  'organization', 'society', 'club', 'program', 'programs', 'institute',
]);

export interface IrsCandidate {
  ein: string;
  name: string;
  city: string | null;
  state: string | null;
  nteeCode: string | null;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface IrsFiling {
  year: number | null;
  totalRevenue: number | null;
  totalExpenses: number | null;
  totalAssets: number | null;
  /** Contributions paid per books - grants actually paid out. */
  grantsPaid: number | null;
  pdfUrl: string | null;
}

export interface IrsProfile {
  ein: string;
  name: string;
  city: string | null;
  state: string | null;
  nteeCode: string | null;
  /** True when the org files a 990-PF, i.e. it is a private foundation. */
  isPrivateFoundation: boolean;
  filings: IrsFiling[];
  confidence: 'high' | 'medium' | 'low';
  /** Other plausible matches, so a wrong pick is visible rather than silent. */
  alternatives: IrsCandidate[];
  sourceUrl: string;
}

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** The tokens that actually identify an organization. */
function distinctiveTokens(name: string): string[] {
  const tokens = normalizeTokens(name).filter(token => !NOISE_WORDS.has(token) && token.length > 1);
  // A name made entirely of noise ("The Community Foundation") still has to
  // match on something, so fall back to the full token list.
  return tokens.length > 0 ? tokens : normalizeTokens(name);
}

/**
 * Scores a candidate against the name we were looking for.
 *
 * Deliberately strict about distinctive tokens: on the seed list, a loose match
 * turned "Carroll Creek Rotary Club" into plain "Rotary International" and
 * "Serini Foundation" into a Helen J Serini Foundation two counties away.
 * Attaching either one's 990 to the wrong donor would corrupt its criteria
 * invisibly, so a weak match is reported as low confidence and not used.
 */
export function scoreCandidate(
  query: string,
  candidate: { name: string; city?: string | null; state?: string | null },
  context: { city?: string | null; state?: string | null } = {},
): { score: number; confidence: 'high' | 'medium' | 'low' } {
  const wanted = distinctiveTokens(query);
  const found = new Set(distinctiveTokens(candidate.name));

  const matched = wanted.filter(token => found.has(token)).length;
  const coverage = wanted.length === 0 ? 0 : matched / wanted.length;

  const cityMatches =
    Boolean(context.city && candidate.city) &&
    context.city!.toLowerCase() === candidate.city!.toLowerCase();
  const stateMatches =
    Boolean(context.state && candidate.state) &&
    context.state!.toLowerCase() === candidate.state!.toLowerCase();

  let score = coverage;
  if (cityMatches) score += 0.15;
  if (stateMatches) score += 0.05;

  let confidence: 'high' | 'medium' | 'low';
  if (coverage === 1 && cityMatches) confidence = 'high';
  else if (coverage === 1) confidence = 'medium';
  else if (coverage >= 0.6 && cityMatches) confidence = 'medium';
  else confidence = 'low';

  return { score: Math.min(score, 1.2), confidence };
}

async function getJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: controller.signal,
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toFiling(raw: any): IrsFiling {
  return {
    year: raw?.tax_prd_yr ?? null,
    totalRevenue: raw?.totrevenue ?? null,
    totalExpenses: raw?.totfuncexpns ?? null,
    totalAssets: raw?.totassetsend ?? null,
    // Contributions paid per books: what the foundation actually granted out.
    grantsPaid: raw?.contrpdpbks ?? null,
    pdfUrl: raw?.pdf_url ?? null,
  };
}

/**
 * Query spellings to try, in order.
 *
 * The API is fussier than it looks. It returns 404 for
 * "The Community Foundation of Frederick County" and results for the same name
 * without the leading article, and the seed list contains names it cannot
 * possibly match as written - "City of Frederick - Community Grants Program /
 * CDBG" is a programme description, not a registered entity. Trying
 * progressively plainer spellings costs one cheap request each and is the
 * difference between finding a funder and reporting it as unfindable.
 */
export function queryVariants(name: string): string[] {
  const variants: string[] = [];
  const add = (value: string) => {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 2 && !variants.includes(cleaned)) variants.push(cleaned);
  };

  add(name);

  // Punctuation the API does not cope with: dashes, slashes, parentheses.
  const plain = name.replace(/[\u2010-\u2015\/|(),.]/g, ' ');
  add(plain);

  // A leading article is enough on its own to turn results into a 404.
  add(plain.replace(/^\s*the\s+/i, ''));

  // Everything before the first separator: "City of Frederick - Community
  // Grants Program / CDBG" becomes "City of Frederick".
  const firstClause = name.split(/[\u2010-\u2015\/|(),]/)[0];
  add(firstClause.replace(/^\s*the\s+/i, ''));

  // Last resort: the identifying words alone, which is what actually appears in
  // a registered name once "Program", "Foundation" and friends are dropped.
  add(distinctiveTokens(plain).join(' '));

  return variants.slice(0, 4);
}

/** Looks up an organization by name, returning it only if the match is credible. */
export async function lookupIrsProfile(
  name: string,
  context: { city?: string | null; state?: string | null } = {},
): Promise<IrsProfile | null> {
  let organizations: any[] = [];

  for (const query of queryVariants(name)) {
    const params = new URLSearchParams({ q: query });
    if (context.state) params.set('state[id]', context.state);

    const search = await getJson(`${API}/search.json?${params}`);
    const found: any[] = search?.organizations ?? [];
    if (found.length > 0) {
      organizations = found;
      break;
    }
  }

  if (organizations.length === 0) return null;

  const scored: IrsCandidate[] = organizations
    .map(org => {
      const { score, confidence } = scoreCandidate(name, org, context);
      return {
        ein: String(org.ein),
        name: org.name,
        city: org.city ?? null,
        state: org.state ?? null,
        nteeCode: org.ntee_code ?? null,
        score,
        confidence,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  // A low-confidence best match means we did not find this organization. Using
  // it anyway is worse than returning nothing: the criteria that follow would
  // look sourced rather than guessed.
  if (!best || best.confidence === 'low') return null;

  const detail = await getJson(`${API}/organizations/${best.ein}.json`);
  const withData: any[] = detail?.filings_with_data ?? [];
  const withoutData: any[] = detail?.filings_without_data ?? [];

  return {
    ein: best.ein,
    name: detail?.organization?.name ?? best.name,
    city: detail?.organization?.city ?? best.city,
    state: detail?.organization?.state ?? best.state,
    nteeCode: best.nteeCode,
    // A pf_filing_requirement_code of 1 means the org files a 990-PF.
    isPrivateFoundation: detail?.organization?.pf_filing_requirement_code === 1,
    filings: withData.slice(0, 3).map(toFiling),
    confidence: best.confidence,
    alternatives: scored.slice(1, 4),
    sourceUrl: `https://projects.propublica.org/nonprofits/organizations/${best.ein}`,
  };
}

const money = (value: number | null): string =>
  value === null ? 'not reported' : `$${value.toLocaleString('en-US')}`;

/** Renders an IRS profile as dossier text for the extraction prompt. */
export function renderIrsProfile(profile: IrsProfile): string {
  const lines = [
    `IRS RECORD (ProPublica Nonprofit Explorer, match confidence: ${profile.confidence})`,
    `Legal name: ${profile.name}`,
    `EIN: ${profile.ein}`,
    `Location: ${[profile.city, profile.state].filter(Boolean).join(', ') || 'not reported'}`,
    profile.nteeCode ? `NTEE code: ${profile.nteeCode}` : null,
    profile.isPrivateFoundation
      ? 'Files a 990-PF, so this is a private grantmaking foundation.'
      : null,
  ].filter(Boolean) as string[];

  for (const filing of profile.filings) {
    lines.push(
      `Filing ${filing.year ?? '?'}: assets ${money(filing.totalAssets)}, ` +
        `revenue ${money(filing.totalRevenue)}, expenses ${money(filing.totalExpenses)}, ` +
        `grants paid ${money(filing.grantsPaid)}.` +
        (filing.pdfUrl ? ` Return: ${filing.pdfUrl}` : ''),
    );
  }

  if (profile.confidence !== 'high' && profile.alternatives.length > 0) {
    lines.push(
      `Other organizations with similar names (this match may be wrong): ` +
        profile.alternatives.map(alt => `${alt.name} (${alt.city ?? '?'})`).join('; '),
    );
  }

  return lines.join('\n');
}
