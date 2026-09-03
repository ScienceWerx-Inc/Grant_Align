/**
 * @fileOverview The automated 1-pager generator (requirements §2.2).
 *
 * Produces the standardized summary a seeker downloads or pastes onto their own
 * letterhead. It is a compilation, not a composition: every line has to be
 * traceable to something the organization actually said in its profile or its
 * interview, because this document goes out under their name to funders.
 *
 * Returned as structured sections rather than prose so the page can lay it out
 * for letterhead (no logo, no header of ours) and so a section can be
 * regenerated without redoing the whole document.
 */

import { z } from 'genkit';
import { ai, WRITING_MODEL } from '@/ai/providers';

export const OnePagerSchema = z.object({
  organizationName: z.string(),
  tagline: z.string().describe('One line, under 120 characters: what this organization does and for whom.'),
  overview: z.string().describe('2-3 sentences. Concrete: who is served, what is provided, where.'),
  whoWeServe: z.string().describe('2-3 sentences on the population, with numbers where the profile gives them.'),
  whatWeDo: z.string().describe('2-4 sentences on actual programs and activities.'),
  scope: z.string().describe('One or two sentences on the boundaries of the work — what falls outside it. Written as focus, not as apology.'),
  impact: z.array(z.string()).describe('2-4 evidenced outcome bullets. Only numbers the profile actually contains.'),
  quickFacts: z.array(z.object({ label: z.string(), value: z.string() })).describe('Founded, service area, annual budget, staff, volunteers, EIN — only those known.'),
  fundingNeeds: z.string().describe('One or two sentences on what grant support would go toward.'),
  contactBlock: z.string().describe('Contact name, title, email, phone, address as available, newline separated.'),
  omissions: z.array(z.string()).describe('Standard 1-pager fields the profile could not supply, for the seeker to fill in by hand.'),
});
export type OnePager = z.infer<typeof OnePagerSchema>;

export const generateOnePager = ai.defineFlow(
  {
    name: 'generateOnePager',
    inputSchema: z.object({ orgName: z.string(), profile: z.string() }),
    outputSchema: OnePagerSchema,
  },
  async ({ orgName, profile }) => {
    const { output } = await ai.generate({
      model: WRITING_MODEL,
      system: `You compile a one-page non-profit summary for funders, in the format local and regional grant-givers expect.

Rules:
- Use ONLY the profile below. Invent no number, date, partner, award or outcome. If the profile does not support a claim, leave it out and name the missing field in \`omissions\`.
- Plain declarative sentences. No "passionate", "dedicated", "committed to excellence", "leverage", "empower".
- Prefer the organization's own concrete words over polished abstractions.
- The whole thing must fit on one page: keep to the sentence counts in the field descriptions.
- \`scope\` states the boundaries of the work matter-of-factly. Funders read a clear scope as discipline, so do not hedge it.`,
      prompt: `ORGANIZATION: ${orgName}\n\nPROFILE:\n${profile}`,
      output: { schema: OnePagerSchema },
      config: { temperature: 0.3 },
    });

    if (!output) throw new Error('The one-pager generator returned no output.');
    return output;
  },
);
