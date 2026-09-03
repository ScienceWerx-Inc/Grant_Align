/**
 * @fileOverview The matching and evaluation engine (requirements §3).
 *
 * Evaluates one seeker's qualitative scope against one donor's live criteria and
 * returns a verdict a grant writer can act on: apply, maybe, or skip.
 *
 * Two deliberate choices:
 *
 * 1. Scoring is per-dimension with fixed weights, not one holistic number. A
 *    single opaque score is unarguable; six weighted dimensions show a seeker
 *    exactly which one sank the match and whether it is fixable.
 *
 * 2. Blockers override the score. A funder that does not fund this county, or
 *    requires a 990 the seeker has not filed, is a SKIP at any level of thematic
 *    resonance — and telling someone to apply anyway wastes the scarcest thing
 *    a small non-profit has, which is grant-writing hours.
 */

import { z } from 'genkit';
import { ai, WRITING_MODEL } from '@/ai/providers';
import { withRetry } from '@/ai/retry';

export const DIMENSIONS = [
  { key: 'mission', label: 'Mission & program fit', weight: 30 },
  { key: 'population', label: 'Population served', weight: 20 },
  { key: 'geography', label: 'Geographic eligibility', weight: 20 },
  { key: 'exclusions', label: 'Clear of donor exclusions', weight: 15 },
  { key: 'size', label: 'Grant size vs. organization scale', weight: 8 },
  { key: 'compliance', label: 'Documentation readiness', weight: 7 },
] as const;

export const MatchDimensionSchema = z.object({
  key: z.enum(['mission', 'population', 'geography', 'exclusions', 'size', 'compliance']),
  score: z.number().min(0).max(100).describe('0-100 for this dimension alone.'),
  note: z.string().describe('One sentence citing the specific seeker and donor facts behind this score.'),
});

export const MatchResultSchema = z.object({
  dimensions: z.array(MatchDimensionSchema).length(6),
  verdict: z.enum(['APPLY', 'MAYBE', 'SKIP']),
  headline: z.string().describe('One line, under 100 characters, a grant writer could scan in a list.'),
  rationale: z.string().describe('3-5 sentences: why this verdict, and what would change it.'),
  alignments: z.array(z.string()).describe('Concrete overlaps, each naming a fact from both sides.'),
  gaps: z.array(z.string()).describe('Weak points that are arguable or fixable.'),
  blockers: z.array(z.string()).describe('Hard disqualifiers only: stated exclusions hit, geography outside the footprint, missing mandatory documentation. Empty if none.'),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

/** Weighted mean of the model's per-dimension scores. */
export function weightedScore(dimensions: { key: string; score: number }[]): number {
  const byKey = new Map(dimensions.map(d => [d.key, d.score]));
  let total = 0;
  let weight = 0;
  for (const dim of DIMENSIONS) {
    const score = byKey.get(dim.key);
    if (score === undefined) continue;
    total += score * dim.weight;
    weight += dim.weight;
  }
  return weight === 0 ? 0 : Math.round(total / weight);
}

/**
 * The verdict the score alone implies. Kept separate from the model's own
 * verdict so the two can be reconciled: a blocker forces SKIP whatever the
 * dimensions say, and a high score is not allowed to be talked down.
 */
export function reconcileVerdict(score: number, blockers: string[], modelVerdict: MatchResult['verdict']): MatchResult['verdict'] {
  if (blockers.length > 0) return 'SKIP';
  if (score >= 70) return modelVerdict === 'SKIP' ? 'MAYBE' : modelVerdict;
  if (score >= 45) return modelVerdict === 'APPLY' ? 'MAYBE' : modelVerdict;
  return 'SKIP';
}

export const scoreMatch = ai.defineFlow(
  {
    name: 'scoreMatch',
    inputSchema: z.object({
      seekerName: z.string(),
      seekerProfile: z.string(),
      donorName: z.string(),
      donorProfile: z.string(),
    }),
    outputSchema: MatchResultSchema,
  },
  async ({ seekerName, seekerProfile, donorName, donorProfile }) => {
    const { output } = await withRetry(`scoreMatch ${seekerName} -> ${donorName}`, () =>
      ai.generate({
      model: WRITING_MODEL,
      system: `You evaluate whether a specific non-profit should spend its time applying to a specific funder. Your reader is a small non-profit with very few grant-writing hours, so a false "apply" costs them more than a false "skip".

Score each of these six dimensions 0-100 independently:
${DIMENSIONS.map(d => `- ${d.key} (${d.label}, weight ${d.weight}%)`).join('\n')}

Rules:
- Cite facts. Every note must name something specific from the seeker profile AND something specific from the donor profile. "Good thematic alignment" is not a note.
- A funder's stated exclusion that the seeker's work falls under is a blocker, not a low score.
- Work outside the funder's stated geography is a blocker.
- Missing documentation the funder requires is a blocker while it is missing — but say in the rationale that it is fixable, and how.
- Silence is not exclusion. Where the donor profile simply does not cover something, score that dimension near the middle and say the criterion is unpublished, rather than assuming either way.
- What the seeker does NOT do and does NOT serve is evidence, not filler: use it to rule matches out.
- Be decisive. A page of hedging helps nobody.`,
      prompt: `SEEKER — ${seekerName}
${seekerProfile}

FUNDER — ${donorName}
${donorProfile}

Evaluate this pairing.`,
      output: { schema: MatchResultSchema },
      config: { temperature: 0.2 },
    }),
    );

    if (!output) throw new Error('The matching engine returned no output.');
    return output;
  },
);
