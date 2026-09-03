/**
 * @fileOverview The automated donor web researcher (requirements §2.3, §4).
 *
 * Runs the two-pass pipeline described in src/ai/web-research.ts:
 *   pass 1 — live fetch of the donor's own pages + a Google-Search-grounded
 *            sweep of the aggregators (Candid/GuideStar, Foundant portals,
 *            Foundation Directory listings);
 *   pass 2 — a plain structured prompt that reads the resulting dossier and
 *            extracts donor criteria fields.
 *
 * The two passes cannot be one call: attaching the Search tool disables JSON
 * mode in the Gemini plugin.
 *
 * Extraction never writes straight to the donor profile. It returns a proposal
 * that a person accepts in the UI, because a scraped "does not fund individual
 * scholarships" that is wrong will silently suppress every matching seeker.
 */

import { z } from 'genkit';
import { ai, DEFAULT_MODEL } from '@/ai/providers';
import { fetchPages, groundedSearch, type ResearchSource } from '@/ai/web-research';

export const DonorCriteriaSchema = z.object({
  fundingFocus: z.array(z.string()).describe('Program areas funded. Empty array if the sources never say.'),
  excludedSectors: z.array(z.string()).describe('What the funder states it will NOT fund.'),
  populationsServed: z.array(z.string()).describe('Populations prioritized.'),
  geographies: z.array(z.string()).describe('Geographic limits on giving, as stated.'),
  grantMin: z.number().optional().describe('Typical smallest award in USD, only if stated or evidenced by past grants.'),
  grantMax: z.number().optional().describe('Typical largest award in USD, same rule.'),
  cycleNotes: z.string().optional().describe('Deadlines and cycle structure, quoted closely from the source.'),
  nextDeadline: z.string().optional().describe('Next application deadline as YYYY-MM-DD, only if a specific date is stated.'),
  applicationPortal: z.string().optional().describe('Portal used, e.g. Foundant, Submittable, email, mailed form.'),
  applicationUrl: z.string().optional().describe('Direct URL to apply or to the guidelines.'),
  requiresLoi: z.boolean().optional(),
  requires990: z.boolean().optional(),
  requiresGoodStanding: z.boolean().optional(),
  givingNotes: z.string().optional().describe('Anything else a grant writer would want to know, 2-4 sentences.'),
  confidence: z.enum(['high', 'medium', 'low']).describe('high = the funder\'s own published guidelines said this; medium = a reliable third-party listing; low = inference.'),
  unconfirmed: z.array(z.string()).describe('Fields the sources did not settle, named plainly for a human to chase.'),
});
export type DonorCriteria = z.infer<typeof DonorCriteriaSchema>;

export interface DonorResearchResult {
  criteria: DonorCriteria | null;
  dossier: string;
  sources: ResearchSource[];
  grounded: boolean;
  /** Pages we pulled directly, as opposed to reached via search. */
  fetchedUrls: string[];
  error?: string;
}

function searchPrompt(name: string, website: string | null, locality: string): string {
  return `Research the grantmaking practices of "${name}"${website ? ` (${website})` : ''}, a grant-giving organization${locality ? ` associated with ${locality}` : ''}.

Search the live web, including:
- the funder's own site: giving guidelines, eligibility, application instructions, deadlines
- Candid / GuideStar and Foundation Directory listings for this funder
- any Foundant, Submittable or similar application portal it uses
- recent news or annual reports naming grants it has actually made

Report, and for each point name the source it came from:
- what it funds, and what it explicitly does NOT fund
- who it serves and any geographic restriction on its giving
- typical grant sizes, with evidence
- the application cycle: deadlines, rounds, whether a letter of intent comes first
- what documentation applicants must submit (Form 990, good standing, audited financials)
- how to apply, and through which portal

Be exact about numbers and dates. Where sources disagree or say nothing, say so plainly instead of filling the gap. Never invent a deadline.`;
}

export const researchDonor = ai.defineFlow(
  {
    name: 'researchDonor',
    inputSchema: z.object({
      name: z.string(),
      website: z.string().nullable().default(null),
      locality: z.string().default('Frederick County, Maryland'),
    }),
    outputSchema: z.any(),
  },
  async ({ name, website, locality }): Promise<DonorResearchResult> => {
    // Pass 1a: the funder's own pages, fetched directly so guidelines can be
    // read verbatim rather than through a search snippet.
    const pages = website ? await fetchPages(website) : [];
    const fetchedText = pages
      .map(p => `--- SOURCE: ${p.url} (${p.title}) ---\n${p.text}`)
      .join('\n\n');

    // Pass 1b: the aggregators, via Search grounding.
    const search = await groundedSearch(searchPrompt(name, website, locality));

    const dossierParts = [
      fetchedText ? `PAGES FETCHED DIRECTLY FROM THE FUNDER'S SITE:\n${fetchedText}` : '',
      search.dossier ? `WEB SEARCH FINDINGS:\n${search.dossier}` : '',
    ].filter(Boolean);

    const sources: ResearchSource[] = [
      ...pages.map(p => ({ title: p.title || p.url, url: p.url })),
      ...search.sources,
    ];

    if (dossierParts.length === 0) {
      return {
        criteria: null,
        dossier: '',
        sources,
        grounded: false,
        fetchedUrls: pages.map(p => p.url),
        error:
          search.groundingError ??
          (website
            ? 'No public pages could be fetched and web search returned nothing.'
            : 'This donor has no website on file and web search returned nothing.'),
      };
    }

    const dossier = dossierParts.join('\n\n');

    // Pass 2: structured extraction over the gathered text. No tools attached,
    // so JSON mode is available here.
    const { output } = await ai.generate({
      model: DEFAULT_MODEL,
      system: `You extract grantmaking criteria from research notes for a grant-matching service.

Rules:
- Use ONLY what the notes below support. An empty array beats a plausible guess.
- The funder's own published guidelines outrank third-party listings; say so through the confidence field.
- Exclusions matter as much as focus areas: a wrongly-stated exclusion silently hides eligible applicants, so include one only when a source states it.
- Never infer a deadline from a past year's date. If the notes give only a stale date, put it in cycleNotes and leave nextDeadline empty.
- List every field the notes did not settle in \`unconfirmed\`.`,
      prompt: `FUNDER: ${name}${website ? `\nWEBSITE: ${website}` : ''}\n\nRESEARCH NOTES:\n${dossier}`,
      output: { schema: DonorCriteriaSchema },
      config: { temperature: 0.1 },
    });

    return {
      criteria: output ?? null,
      dossier,
      sources,
      // Direct page fetches are grounding in the sense that matters: the text
      // came off a real page rather than out of model recall.
      grounded: search.grounded || pages.length > 0,
      fetchedUrls: pages.map(p => p.url),
      error: search.groundingError,
    };
  },
);
