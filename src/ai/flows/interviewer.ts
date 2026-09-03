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
import { lenientSchema, normalize, toTags, type FieldSpecs } from '@/ai/coerce';
import { withRetry } from '@/ai/retry';

export const InterviewMessageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string(),
  at: z.string().optional(),
});
export type InterviewMessage = z.infer<typeof InterviewMessageSchema>;

const SEEKER_FIELDS: FieldSpecs = {
  servesWho: { kind: 'prose', description: 'Who the non-profit really serves, in concrete terms: ages, circumstances, referral routes, roughly how many people a year.' },
  doesWhat: { kind: 'prose', description: 'What it really does day to day - the actual activities, not the mission statement.' },
  doesNotDo: { kind: 'prose', description: 'Services and activities it explicitly does NOT provide, including ones people commonly assume it does.' },
  doesNotServe: { kind: 'prose', description: 'Who falls outside its scope, and any eligibility limits it enforces.' },
  populations: { kind: 'tags', description: 'Populations served, e.g. "unhoused adults", "K-12 students".' },
  serviceAreas: { kind: 'tags', description: 'Geographies served, e.g. "Frederick County, MD", "City of Frederick".' },
  programAreas: { kind: 'tags', description: 'Program/sector areas, e.g. "food security", "workforce development".' },
  outcomes: { kind: 'prose', description: 'Outcomes or numbers the organization can evidence.' },
};

const DONOR_FIELDS: FieldSpecs = {
  fundingFocus: { kind: 'tags', description: 'Program areas this funder supports.' },
  excludedSectors: { kind: 'tags', description: 'What it will NOT fund - sectors, request types, organization types.' },
  populationsServed: { kind: 'tags', description: 'Populations it prioritizes.' },
  geographies: { kind: 'tags', description: 'Geographic footprint of its giving.' },
  grantMin: { kind: 'count', description: 'Typical smallest award in USD.' },
  grantMax: { kind: 'count', description: 'Typical largest award in USD.' },
  cycleNotes: { kind: 'prose', description: 'Cycle timing in plain words: deadlines, rounds, rolling.' },
  requiresLoi: { kind: 'bool', description: 'Whether a letter of intent precedes the full application.' },
  givingNotes: { kind: 'prose', description: 'Nuance a published guideline would not say: what actually persuades this funder, common reasons they decline.' },
};

/**
 * The output schema is built per role rather than offering both a `seeker` and
 * a `donor` branch on one object.
 *
 * With both branches present and optional, a model interviewing a non-profit
 * would sometimes fill in the donor fields instead - they are visible in the
 * schema, so they look like fair game - and the turn would fail validation on a
 * field the conversation was never about. Handing the model only the fields
 * that belong to this side of the platform removes the ambiguity entirely, and
 * makes the schema roughly half the size, which matters for smaller models.
 */
function fieldsFor(role: 'SEEKER' | 'DONOR'): FieldSpecs {
  return role === 'SEEKER' ? SEEKER_FIELDS : DONOR_FIELDS;
}

function turnSchema(role: 'SEEKER' | 'DONOR') {
  return z.object({
    reply: z
      .string()
      .describe('What the interviewer says next: a brief acknowledgement of the answer, then ONE question.'),
    extracted: lenientSchema(fieldsFor(role))
      .describe('Everything established so far, carried forward and refined. Never blank a field already filled.'),
    coverage: z.any().optional().describe('Agenda topics adequately covered so far, as an array of short strings.'),
    done: z.boolean().describe('True only when every required topic has a substantive answer.'),
    summary: z.string().optional().describe('Written only when done: a 3-5 sentence operational summary.'),
  });
}

export interface InterviewTurnOutput {
  reply: string;
  extracted: Record<string, unknown>;
  coverage: string[];
  done: boolean;
  summary?: string;
}

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
    outputSchema: z.any(),
  },
  async ({ role, orgName, context, messages, extracted }): Promise<InterviewTurnOutput> => {
    const schema = turnSchema(role);
    const { output } = await withRetry('interviewTurn', () =>
      ai.generate({
      model: DEFAULT_MODEL,
      system: systemPrompt(role, orgName, context),
      prompt: `TRANSCRIPT SO FAR:
${renderTranscript(messages)}

FIELDS EXTRACTED SO FAR (carry these forward, refine them, do not drop them):
${JSON.stringify(extracted, null, 2)}

Produce the next interviewer turn.`,
      output: { schema },
      config: { temperature: 0.6 },
    }),
    );

    if (!output) throw new Error('The interviewer returned no output.');

    return {
      reply: output.reply,
      extracted: normalize(fieldsFor(role), output.extracted),
      coverage: toTags(output.coverage),
      done: Boolean(output.done),
      summary: output.summary,
    };
  },
);
