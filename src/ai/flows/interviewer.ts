/**
 * @fileOverview The AI conversational interviewers (requirements §2.2, §2.3).
 *
 * One flow serves both sides because the mechanics are identical — ask, listen,
 * extract, decide whether enough has been said — and only the agenda differs.
 *
 * The design constraint that shapes everything here: a mission statement is
 * boilerplate and boilerplate does not match. The interviewer's job is to get
 * past it to operational reality, and especially to the negative space (what an
 * organization does NOT do, who it does NOT serve; what a funder will NOT fund).
 * Exclusions are what let the engine say "skip this one" with confidence, and
 * nobody volunteers them unasked.
 *
 * Each turn returns both the next question and the fields extracted so far, so
 * the profile fills in visibly as the conversation goes rather than in one lump
 * at the end.
 */

import { z } from 'genkit';
import { ai, DEFAULT_MODEL } from '@/ai/providers';

export const InterviewMessageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string(),
  at: z.string().optional(),
});
export type InterviewMessage = z.infer<typeof InterviewMessageSchema>;

const SeekerExtractionSchema = z.object({
  servesWho: z.string().optional().describe('Who the non-profit really serves, in concrete terms: ages, circumstances, referral routes, roughly how many people a year.'),
  doesWhat: z.string().optional().describe('What it really does day to day — the actual activities, not the mission statement.'),
  doesNotDo: z.string().optional().describe('Services and activities it explicitly does NOT provide, including ones people commonly assume it does.'),
  doesNotServe: z.string().optional().describe('Who falls outside its scope, and any eligibility limits it enforces.'),
  populations: z.array(z.string()).optional().describe('Short population tags, e.g. "unhoused adults", "K-12 students".'),
  serviceAreas: z.array(z.string()).optional().describe('Geographies served, e.g. "Frederick County, MD", "City of Frederick".'),
  programAreas: z.array(z.string()).optional().describe('Program/sector tags, e.g. "food security", "workforce development".'),
  outcomes: z.string().optional().describe('Outcomes or numbers the organization can evidence.'),
});

const DonorExtractionSchema = z.object({
  fundingFocus: z.array(z.string()).optional().describe('Program areas this funder supports.'),
  excludedSectors: z.array(z.string()).optional().describe('What it will NOT fund — sectors, request types, organization types.'),
  populationsServed: z.array(z.string()).optional().describe('Populations it prioritizes.'),
  geographies: z.array(z.string()).optional().describe('Geographic footprint of its giving.'),
  grantMin: z.number().optional().describe('Typical smallest award, USD.'),
  grantMax: z.number().optional().describe('Typical largest award, USD.'),
  cycleNotes: z.string().optional().describe('Cycle timing in plain words: deadlines, rounds, rolling.'),
  requiresLoi: z.boolean().optional().describe('True if a letter of intent precedes the full application.'),
  givingNotes: z.string().optional().describe('Nuance a published guideline would not say: what actually persuades this funder, common reasons they decline.'),
});

export const InterviewTurnOutputSchema = z.object({
  reply: z.string().describe('What the interviewer says next: a brief acknowledgement of the answer, then ONE question.'),
  seeker: SeekerExtractionSchema.optional(),
  donor: DonorExtractionSchema.optional(),
  coverage: z.array(z.string()).describe('Agenda topics considered adequately covered so far.'),
  done: z.boolean().describe('True only when every required topic has a substantive answer.'),
  summary: z.string().optional().describe('Written only when done: a 3-5 sentence operational summary.'),
});
export type InterviewTurnOutput = z.infer<typeof InterviewTurnOutputSchema>;

const SEEKER_AGENDA = `
1. serves-who — who they really serve. Push for specifics: ages, circumstances, how people arrive, rough annual numbers.
2. does-what — what they actually do week to week. Programs, not aspirations.
3. does-not-do — what they explicitly do NOT do. Ask directly; ask what people wrongly assume they do.
4. does-not-serve — who they turn away or refer elsewhere, and any eligibility limits.
5. geography — exactly where they work, down to county or neighborhood.
6. scale — budget band, paid staff, volunteers, year founded.
7. outcomes — what they can actually evidence, with numbers where they have them.`;

const DONOR_AGENDA = `
1. focus — what this funder supports, in their own words.
2. exclusions — what they will NOT fund. Push here; published guidelines are usually vaguer than the real practice.
3. populations — who they most want reached.
4. geography — the footprint they will fund inside.
5. size — typical award range, and whether multi-year or operating support is possible.
6. cycle — deadlines, rounds, LOI-first or not.
7. nuance — what makes a request compelling to them, and the most common reason they decline one.`;

function systemPrompt(role: 'SEEKER' | 'DONOR', orgName: string, context: string): string {
  const agenda = role === 'SEEKER' ? SEEKER_AGENDA : DONOR_AGENDA;
  const who =
    role === 'SEEKER'
      ? `You are interviewing someone who works at ${orgName}, a local non-profit, on behalf of a grant-matching service.`
      : `You are interviewing a point of contact at ${orgName}, a grant-giving foundation or funder, on behalf of a grant-matching service.`;

  return `${who}

Your goal is an operational picture specific enough that a matching engine can tell a real fit from a plausible-sounding one. Mission-statement language is useless to you: when you get it, ask for an example instead.

AGENDA — cover every topic:
${agenda}

HOW TO INTERVIEW:
- Ask exactly ONE question per turn. Never stack two questions into one.
- Keep it to two or three sentences. This is a conversation, not a form.
- When an answer is vague ("we serve the community", "we fund education"), ask a concrete follow-up before moving on. Do not accept the abstraction and continue.
- Topics 3 and 4 are the ones people skip. Ask them plainly and without apology — negative scope is the most valuable thing you can collect.
- Extract into the structured fields as you go, and carry forward everything already extracted; never blank a field you previously filled just because this turn did not mention it.
- Record a topic in \`coverage\` only when you have a substantive answer to it, not merely because you asked.
- Set \`done\` true only when every agenda topic is covered. Then thank them, say the profile is complete, and write the summary.

WHAT WE ALREADY KNOW (do not re-ask what is already answered here):
${context || '(nothing yet)'}`;
}

function renderTranscript(messages: InterviewMessage[]): string {
  if (messages.length === 0) return '(no messages yet — open the interview)';
  return messages
    .map(m => `${m.role === 'assistant' ? 'INTERVIEWER' : 'RESPONDENT'}: ${m.content}`)
    .join('\n\n');
}

export const interviewTurn = ai.defineFlow(
  {
    name: 'interviewTurn',
    inputSchema: z.object({
      role: z.enum(['SEEKER', 'DONOR']),
      orgName: z.string(),
      context: z.string().default(''),
      messages: z.array(InterviewMessageSchema),
      extracted: z.record(z.any()).default({}),
    }),
    outputSchema: InterviewTurnOutputSchema,
  },
  async ({ role, orgName, context, messages, extracted }) => {
    const { output } = await ai.generate({
      model: DEFAULT_MODEL,
      system: systemPrompt(role, orgName, context),
      prompt: `TRANSCRIPT SO FAR:
${renderTranscript(messages)}

FIELDS EXTRACTED SO FAR (carry these forward, refine them, do not drop them):
${JSON.stringify(extracted, null, 2)}

Produce the next interviewer turn.`,
      output: { schema: InterviewTurnOutputSchema },
      config: { temperature: 0.6 },
    });

    if (!output) throw new Error('The interviewer returned no output.');
    return output;
  },
);
